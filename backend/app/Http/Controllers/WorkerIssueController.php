<?php

namespace App\Http\Controllers;

use App\Models\CommuTechNotification;
use App\Models\Issue;
use App\Models\IssueDonation;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class WorkerIssueController extends Controller
{
    public function assigned(Request $request)
    {
        $issues = Issue::query()
            ->with(['user:id,name,email,phone', 'assignee:id,name,email,phone'])
            ->withCount('upvotes')
            ->where('assigned_to', $request->user()->id)
            ->latest()
            ->paginate(20);

        return response()->json($issues);
    }

    public function nearby(Request $request)
    {
        $data = $request->validate([
            'latitude'  => ['nullable', 'numeric', 'between:-90,90'],
            'longitude' => ['nullable', 'numeric', 'between:-180,180'],
            'radius'    => ['nullable', 'integer', 'min:50', 'max:5000'],
        ]);

        $worker = $request->user();

        if ($worker->assigned_municipality) {
            // Municipality mode — exact match on municipality_en
            $matched = Issue::query()
                ->with(['user:id,name,email,phone'])
                ->withCount('upvotes')
                ->whereNull('assigned_to')
                ->where('status', 'pending')
                ->where('municipality_en', $worker->assigned_municipality)
                ->latest()
                ->get();

            // Issues where PostGIS lookup failed at creation — surface to all workers
            $unlocated = Issue::query()
                ->with(['user:id,name,email,phone'])
                ->withCount('upvotes')
                ->whereNull('assigned_to')
                ->where('status', 'pending')
                ->whereNull('municipality_en')
                ->latest()
                ->get();

            return response()->json([
                'mode'      => 'municipality',
                'municipality' => $worker->assigned_municipality,
                'data'      => $matched,
                'unlocated' => $unlocated,
            ]);
        }

        // Fallback — GPS radius (worker has no assigned municipality)
        $latitude  = (float) ($data['latitude'] ?? 0);
        $longitude = (float) ($data['longitude'] ?? 0);
        $radius    = (int) ($data['radius'] ?? 100);

        $issues = Issue::query()
            ->with(['user:id,name,email,phone'])
            ->withCount('upvotes')
            ->whereNull('assigned_to')
            ->where('status', 'pending')
            ->whereNotNull('latitude')
            ->whereNotNull('longitude')
            ->latest()
            ->get()
            ->map(function (Issue $issue) use ($latitude, $longitude) {
                $issue->distance_meters = $this->distanceInMeters(
                    $latitude,
                    $longitude,
                    (float) $issue->latitude,
                    (float) $issue->longitude
                );

                return $issue;
            })
            ->filter(fn (Issue $issue) => $issue->distance_meters <= $radius)
            ->sortBy('distance_meters')
            ->values();

        return response()->json([
            'mode'   => 'gps_fallback',
            'data'   => $issues,
            'radius' => $radius,
        ]);
    }

    public function assignToMe(Request $request, Issue $issue)
    {
        return DB::transaction(function () use ($request, $issue) {
            $issue = Issue::where('id', $issue->id)->lockForUpdate()->first();

            if ($issue->assigned_to) {
                return response()->json([
                    'message' => 'This issue is already assigned to another worker.',
                ], 409);
            }

            if ($issue->status !== 'pending') {
                return response()->json([
                    'message' => 'Only pending issues can be assigned.',
                ], 422);
            }

            $issue->update([
                'assigned_to' => $request->user()->id,
                'status' => 'in_progress',
            ]);

            $notification = CommuTechNotification::create([
                'user_id'        => $issue->user_id,
                'issue_id'       => $issue->id,
                'type'           => 'status_update',
                'recipient_role' => 'citizen',
                'title'          => 'Report Assigned',
                'body'           => 'Your report "'.$issue->title.'" was assigned to a worker.',
            ]);
            try { \App\Events\NotificationSent::dispatch($notification); } catch (\Throwable $e) { \Log::warning('Broadcast failed: '.$e->getMessage()); }

            return response()->json([
                'message' => 'Issue assigned successfully.',
                'issue' => $issue->fresh()->load(['user:id,name,email,phone', 'assignee:id,name,email,phone']),
            ]);
        });
    }

    public function requestFunding(Request $request, Issue $issue)
    {
        if ((int) $issue->assigned_to !== (int) $request->user()->id) {
            abort(403);
        }

        if (! in_array($issue->status, ['in_progress', 'pending'], true) || $issue->funding_status !== 'none') {
            return response()->json([
                'message' => 'Funding can only be requested for active reports without an existing funding request.',
            ], 422);
        }

        $data = $request->validate([
            'estimated_cost' => ['required', 'numeric', 'min:1', 'max:9999999'],
            'funding_request_note' => ['required', 'string', 'min:10', 'max:1200'],
        ]);

        $issue->update([
            'status' => 'under_review',
            'funding_status' => 'requested',
            'funding_type' => null,
            'estimated_cost' => round((float) $data['estimated_cost'], 2),
            'funding_goal' => null,
            'funding_raised' => 0,
            'funding_deadline' => null,
            'municipality_contribution' => null,
            'funding_request_note' => $data['funding_request_note'],
            'funding_approved_at' => null,
            'funding_funded_at' => null,
        ]);

        User::withRole(User::ROLE_ADMIN)
            ->get(['id'])
            ->each(function (User $admin) use ($issue) {
                $this->notify(
                    $admin->id,
                    $issue->id,
                    'admin',
                    'Funding Request Submitted',
                    'A worker requested funding review for "'.$issue->title.'".'
                );
            });

        $this->notify(
            $issue->user_id,
            $issue->id,
            'citizen',
            'Report Being Assessed',
            'Your report "'.$issue->title.'" is being assessed by the team.'
        );

        return response()->json([
            'message' => 'Funding request sent for admin review.',
            'issue' => $issue->fresh()->load(['user:id,name,email,phone', 'assignee:id,name,email,phone']),
        ]);
    }

    public function updateStatus(Request $request, Issue $issue)
    {
        if ((int) $issue->assigned_to !== (int) $request->user()->id) {
            abort(403);
        }

        if ($issue->status === 'under_investigation') {
            return response()->json([
                'message' => 'This issue is under investigation and can only be changed by an admin.',
            ], 423);
        }

        $data = $request->validate([
            'status'                     => ['required', Rule::in(['in_progress', 'resolved'])],
            'worker_resolution_note'     => ['required_if:status,resolved', 'nullable', 'string', 'min:5', 'max:1200'],
            'worker_resolution_image_url'=> ['nullable', 'url', 'max:2048'],
            'resolution_image'           => ['required_if:status,resolved', 'file', 'mimetypes:image/jpeg,image/png,image/webp,image/heic,image/heif', 'max:20480'],
        ]);

        if (in_array($issue->funding_status, ['requested', 'open', 'expired'], true)) {
            return response()->json([
                'message' => 'This report cannot be updated until funding is approved or completed.',
            ], 422);
        }

        if ($data['status'] === 'resolved' && $issue->status !== 'in_progress') {
            return response()->json([
                'message' => 'Only reports in progress can be marked as resolved.',
            ], 422);
        }

        if ($data['status'] === 'in_progress' && ! in_array($issue->status, ['pending', 'in_progress'], true)) {
            return response()->json([
                'message' => 'This report is not ready to start repair work.',
            ], 422);
        }

        $updates = [
            'status'      => $data['status'],
            'resolved_at' => $data['status'] === 'resolved' ? now() : null,
        ];

        if ($data['status'] === 'resolved') {
            $updates['worker_resolution_note'] = $data['worker_resolution_note'];

            $imageUrl = $data['worker_resolution_image_url'] ?? null;
            if ($request->hasFile('resolution_image')) {
                $imageUrl = $this->uploadToSupabase($request->file('resolution_image'));
            }
            $updates['worker_resolution_image_url'] = $imageUrl;
            $updates['worker_resolved_at'] = now();
            $updates['citizen_resolution_confirmed'] = null;
            $updates['citizen_resolution_note'] = null;
            $updates['citizen_resolution_image_url'] = null;
            $updates['citizen_confirmed_at'] = null;
        }

        $issue->update($updates);

        $notification = CommuTechNotification::create([
            'user_id'        => $issue->user_id,
            'issue_id'       => $issue->id,
            'type'           => 'status_update',
            'recipient_role' => 'citizen',
            'title'          => 'Report Updated',
            'body'           => 'Your report "'.$issue->title.'" is now '.$data['status'].'.',
        ]);
        try { \App\Events\NotificationSent::dispatch($notification); } catch (\Throwable $e) { \Log::warning('Broadcast failed: '.$e->getMessage()); }

        if ($data['status'] === 'resolved') {
            $issue->donations()
                ->where('status', IssueDonation::STATUS_CONFIRMED)
                ->where('user_id', '!=', $issue->user_id)
                ->distinct()
                ->pluck('user_id')
                ->each(function ($donorId) use ($issue) {
                    $this->notify(
                        (int) $donorId,
                        $issue->id,
                        'citizen',
                        'Funded Report Resolved',
                        'A report you helped fund, "'.$issue->title.'", has been resolved.'
                    );
                });
        }

        return response()->json([
            'message' => 'Issue status updated.',
            'issue' => $issue->fresh()->load(['user:id,name,email,phone', 'assignee:id,name,email,phone']),
        ]);
    }

    private function notify(int $userId, int $issueId, string $recipientRole, string $title, string $body): void
    {
        $notification = CommuTechNotification::create([
            'user_id' => $userId,
            'issue_id' => $issueId,
            'type' => 'funding_update',
            'recipient_role' => $recipientRole,
            'title' => $title,
            'body' => $body,
        ]);

        try {
            \App\Events\NotificationSent::dispatch($notification);
        } catch (\Throwable $e) {
            \Log::warning('Broadcast failed: '.$e->getMessage());
        }
    }

    private function uploadToSupabase(\Illuminate\Http\UploadedFile $file): string
    {
        $filename     = Str::uuid().'.'.$file->getClientOriginalExtension();
        $supabaseUrl  = config('services.supabase.url');
        $serviceKey   = config('services.supabase.key');

        $response = Http::withHeaders([
            'Authorization' => 'Bearer '.$serviceKey,
            'Content-Type'  => $file->getMimeType(),
        ])->withBody(file_get_contents($file->getRealPath()), $file->getMimeType())
          ->post("{$supabaseUrl}/storage/v1/object/issues/{$filename}");

        if (! $response->successful()) {
            throw new \RuntimeException('Image upload failed: '.$response->body());
        }

        return "{$supabaseUrl}/storage/v1/object/public/issues/{$filename}";
    }

    private function distanceInMeters(float $lat1, float $lon1, float $lat2, float $lon2): float
    {
        $earthRadius = 6371000;
        $latDelta = deg2rad($lat2 - $lat1);
        $lonDelta = deg2rad($lon2 - $lon1);

        $a = sin($latDelta / 2) ** 2
            + cos(deg2rad($lat1)) * cos(deg2rad($lat2)) * sin($lonDelta / 2) ** 2;

        return $earthRadius * 2 * atan2(sqrt($a), sqrt(1 - $a));
    }
}
