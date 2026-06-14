<?php

namespace App\Http\Controllers;

use App\Models\CommuTechNotification;
use App\Models\Issue;
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
                ->whereNull('assigned_to')
                ->where('status', 'pending')
                ->where('municipality_en', $worker->assigned_municipality)
                ->latest()
                ->get();

            // Issues where PostGIS lookup failed at creation — surface to all workers
            $unlocated = Issue::query()
                ->with(['user:id,name,email,phone'])
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

        return response()->json([
            'message' => 'Issue status updated.',
            'issue' => $issue->fresh()->load(['user:id,name,email,phone', 'assignee:id,name,email,phone']),
        ]);
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
