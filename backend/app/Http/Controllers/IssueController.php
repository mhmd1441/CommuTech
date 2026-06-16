<?php

namespace App\Http\Controllers;

use App\Mail\AdminInvestigationMail;
use App\Models\CommuTechNotification;
use App\Models\Issue;
use App\Models\IssueDonation;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class IssueController extends Controller
{
    public function index(Request $request)
    {
        $data = $request->validate([
            'category' => ['nullable', 'string'],
            'status' => ['nullable', 'string'],
            'mine' => ['nullable', 'boolean'],
            'sort' => ['nullable', Rule::in(['newest', 'oldest', 'priority'])],
            'lat' => ['nullable', 'numeric', 'between:-90,90'],
            'lng' => ['nullable', 'numeric', 'between:-180,180'],
        ]);

        $userId = $request->user()->id;

        $query = Issue::with(['user:id,name,email,phone', 'assignee:id,name,email,phone'])
            ->withCount('upvotes')
            ->withCount(['upvotes as has_upvoted' => fn ($q) => $q->where('user_id', $userId)]);

        if ($request->boolean('mine')) {
            $query->where('user_id', $userId);
        }

        if (isset($data['lat']) && isset($data['lng'])) {
            try {
                $row = DB::selectOne(
                    "SELECT name_en FROM municipalities
                     WHERE ST_Contains(boundary, ST_SetSRID(ST_MakePoint(?, ?), 4326))
                     LIMIT 1",
                    [(float) $data['lng'], (float) $data['lat']]
                );
                if ($row) {
                    $query->where('municipality_en', $row->name_en);
                }
            } catch (\Throwable $e) {
                \Log::warning('Municipality filter failed: ' . $e->getMessage());
            }
        }

        if (! empty($data['category']) && $data['category'] !== 'All') {
            $query->where('category', $data['category']);
        }

        if (! empty($data['status']) && $data['status'] !== 'all') {
            $query->where('status', $this->normalizeStatus($data['status']));
        }

        match ($data['sort'] ?? 'newest') {
            'oldest' => $query->oldest(),
            'priority' => $query->orderByRaw("case priority when 'critical' then 4 when 'high' then 3 when 'medium' then 2 else 1 end desc")->latest(),
            default => $query->latest(),
        };

        return response()->json($query->paginate(20));
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'title' => ['required', 'string', 'min:4', 'max:180'],
            'description' => ['required', 'string', 'min:10'],
            'category' => ['required', Rule::in(Issue::CATEGORIES)],
            'location' => ['required', 'string', 'max:255'],
            'latitude' => ['nullable', 'numeric', 'between:-90,90'],
            'longitude' => ['nullable', 'numeric', 'between:-180,180'],
            'image_url' => ['nullable', 'url', 'max:2048'],
            'image' => ['nullable', 'file', 'mimetypes:image/jpeg,image/png,image/webp,image/heic,image/heif', 'max:20480'],
        ]);

        if ($request->hasFile('image')) {
            $data['image_url'] = $this->uploadToSupabase($request->file('image'));
        }

        unset($data['image']);

        $aiCategory   = null;
        $aiConfidence = null;

        if ($request->hasFile('image')) {
            $prediction = MlController::callFlask($request->file('image'));
            if ($prediction && isset($prediction['category'])) {
                $aiCategory   = $prediction['category'];
                $aiConfidence = $prediction['confidence'] ?? null;
            }
        }

        $municipalityEn = null;
        $municipalityAr = null;

        if (! empty($data['latitude']) && ! empty($data['longitude'])) {
            try {
                $row = DB::selectOne(
                    "SELECT name_en, name_ar FROM municipalities
                     WHERE ST_Contains(boundary, ST_SetSRID(ST_MakePoint(?, ?), 4326))
                     LIMIT 1",
                    [(float) $data['longitude'], (float) $data['latitude']]
                );

                if ($row) {
                    $municipalityEn = $row->name_en;
                    $municipalityAr = $row->name_ar;
                }
            } catch (\Throwable $e) {
                \Log::warning('Municipality lookup failed: ' . $e->getMessage());
            }
        }

        $priority = $this->triagePriority($data['category'], $data['description']);

        $issue = $request->user()->issues()->create([
            ...$data,
            'status'          => 'pending',
            'priority'        => $priority,
            'ai_score'        => $this->triageScore($data['description']),
            'ai_category'     => $aiCategory,
            'ai_confidence'   => $aiConfidence,
            'due_at'          => now()->addHours(Issue::slaHours($priority)),
            'municipality_en' => $municipalityEn,
            'municipality_ar' => $municipalityAr,
        ]);

        $notification = CommuTechNotification::create([
            'user_id'        => $request->user()->id,
            'issue_id'       => $issue->id,
            'type'           => 'new_report',
            'recipient_role' => 'citizen',
            'title'          => 'Report Submitted',
            'body'           => 'Your issue "' . $issue->title . '" was submitted successfully and is pending review.',
        ]);
        try {
            \App\Events\NotificationSent::dispatch($notification);
        } catch (\Throwable $e) {
            \Log::warning('Broadcast failed: ' . $e->getMessage());
        }

        return response()->json($issue->load('user:id,name,email,phone'), 201);
    }

    public function show(Request $request, Issue $issue)
    {
        if ($request->boolean('mine') && $issue->user_id !== $request->user()->id) {
            abort(404);
        }

        $userId = $request->user()->id;
        if ($issue->expireFundingIfNeeded()) {
            $this->notifyFundingExpired($issue);
        }

        $issue->load(['user:id,name,email,phone', 'assignee:id,name,email,phone'])
              ->loadCount('upvotes');
        $issue->setAttribute('has_upvoted', $issue->upvotes()->where('user_id', $userId)->exists());
        $issue->setAttribute(
            'user_donation_total',
            (float) $issue->donations()
                ->where('user_id', $userId)
                ->where('status', IssueDonation::STATUS_CONFIRMED)
                ->sum('amount')
        );

        return response()->json($issue);
    }

    public function update(Request $request, Issue $issue)
    {
        $data = $request->validate([
            'title' => ['sometimes', 'string', 'min:4', 'max:180'],
            'description' => ['sometimes', 'string', 'min:10'],
            'category' => ['sometimes', Rule::in(Issue::CATEGORIES)],
            'location' => ['sometimes', 'string', 'max:255'],
            'latitude' => ['sometimes', 'nullable', 'numeric', 'between:-90,90'],
            'longitude' => ['sometimes', 'nullable', 'numeric', 'between:-180,180'],
            'image_url' => ['sometimes', 'nullable', 'url', 'max:2048'],
            'status' => ['sometimes', Rule::in(Issue::STATUSES)],
            'priority' => ['sometimes', Rule::in(['low', 'medium', 'high', 'critical'])],
            'rejection_reason' => ['sometimes', 'nullable', 'string'],
        ]);

        if ($issue->user_id !== $request->user()->id) {
            abort(403);
        }

        if ($issue->status === 'under_investigation') {
            return response()->json([
                'message' => 'This issue is under investigation and can only be changed by an admin.',
            ], 423);
        }

        if (array_key_exists('status', $data)) {
            return response()->json([
                'message' => 'Citizens cannot directly change report status.',
            ], 403);
        }

        $issue->update($data);

        return response()->json($issue->fresh()->load(['user:id,name,email,phone', 'assignee:id,name,email,phone']));
    }

    public function confirmResolution(Request $request, Issue $issue)
    {
        if ($issue->user_id !== $request->user()->id) {
            abort(403);
        }

        if ($issue->status !== 'resolved') {
            return response()->json([
                'message' => 'Only resolved reports can be confirmed or audited.',
            ], 422);
        }

        $data = $request->validate([
            'resolved' => ['required', 'boolean'],
            'note' => ['nullable', 'string', 'max:1200'],
            'image_url' => ['nullable', 'url', 'max:2048'],
            'audit_image' => ['nullable', 'file', 'mimetypes:image/jpeg,image/png,image/webp,image/heic,image/heif', 'max:20480'],
        ]);

        $confirmed = (bool) $data['resolved'];
        $citizenImageUrl = $data['image_url'] ?? null;

        if (! $confirmed && $request->hasFile('audit_image')) {
            $citizenImageUrl = $this->uploadToSupabase($request->file('audit_image'));
        }

        $issue->update([
            'status' => $confirmed ? 'resolved' : 'under_investigation',
            'citizen_resolution_confirmed' => $confirmed,
            'citizen_resolution_note' => $data['note'] ?? null,
            'citizen_resolution_image_url' => $citizenImageUrl,
            'citizen_confirmed_at' => now(),
        ]);

        if (! $confirmed && $issue->assigned_to) {
            $notification = CommuTechNotification::create([
                'user_id'        => $issue->assigned_to,
                'issue_id'       => $issue->id,
                'type'           => 'status_update',
                'recipient_role' => 'worker',
                'title'          => 'Report Under Investigation',
                'body'           => 'The citizen challenged the resolution for "' . $issue->title . '".',
            ]);
            try {
                \App\Events\NotificationSent::dispatch($notification);
            } catch (\Throwable $e) {
                \Log::warning('Broadcast failed: ' . $e->getMessage());
            }

            $issue->load('user');
            $admins = User::withRole(User::ROLE_ADMIN)->get(['email']);
            foreach ($admins as $admin) {
                try {
                    Mail::to($admin->email)->send(new AdminInvestigationMail($issue));
                } catch (\Throwable $e) {
                    \Log::warning('Admin investigation email failed: ' . $e->getMessage());
                }
            }
        }

        return response()->json([
            'message' => $confirmed
                ? 'Resolution confirmed.'
                : 'Report moved under investigation for admin review.',
            'issue' => $issue->fresh()->load(['user:id,name,email,phone', 'assignee:id,name,email,phone']),
        ]);
    }

    public function upvote(Request $request, Issue $issue)
    {
        $userId = $request->user()->id;
        $existing = $issue->upvotes()->where('user_id', $userId)->first();

        if ($existing) {
            $existing->delete();
            $voted = false;
        } else {
            $issue->upvotes()->create(['user_id' => $userId]);
            $voted = true;
        }

        return response()->json([
            'has_upvoted'   => $voted,
            'upvotes_count' => $issue->upvotes()->count(),
        ]);
    }

    public function destroy(Request $request, Issue $issue)
    {
        if ($issue->user_id !== $request->user()->id) {
            abort(403);
        }

        $issue->delete();

        return response()->noContent();
    }

    private function normalizeStatus(string $status): string
    {
        return str_replace('-', '_', strtolower($status));
    }

    private function uploadToSupabase(\Illuminate\Http\UploadedFile $file): string
    {
        $filename = Str::uuid() . '.' . $file->getClientOriginalExtension();
        $supabaseUrl = config('services.supabase.url');
        $serviceKey  = config('services.supabase.key');

        $response = Http::withHeaders([
            'Authorization' => 'Bearer ' . $serviceKey,
            'Content-Type'  => $file->getMimeType(),
        ])->withBody(file_get_contents($file->getRealPath()), $file->getMimeType())
            ->post("{$supabaseUrl}/storage/v1/object/issues/{$filename}");

        if (! $response->successful()) {
            throw new \RuntimeException('Image upload failed: ' . $response->body());
        }

        return "{$supabaseUrl}/storage/v1/object/public/issues/{$filename}";
    }

    private function triagePriority(string $category, string $description): string
    {
        $text = strtolower($category . ' ' . $description);

        if (str_contains($text, 'emergency') || str_contains($text, 'injury')) {
            return 'critical';
        }

        if (
            str_contains($text, 'sewage') ||
            str_contains($text, 'danger') ||
            str_contains($text, 'traffic light') ||
            str_contains($text, 'traffic signal') ||
            str_contains($text, 'electricity') ||
            str_contains($text, 'drainage') ||
            str_contains($text, 'public safety')
        ) {
            return 'high';
        }

        return 'medium';
    }

    private function triageScore(string $description): float
    {
        return min(99, max(35, strlen($description) / 8));
    }

    private function notifyFundingExpired(Issue $issue): void
    {
        $this->notify(
            $issue->user_id,
            $issue->id,
            'citizen',
            'Funding Period Ended',
            'The funding period ended for "'.$issue->title.'". Contributions were marked as refunded.'
        );

        $issue->donations()
            ->where('user_id', '!=', $issue->user_id)
            ->where('status', IssueDonation::STATUS_REFUNDED)
            ->get()
            ->each(function (IssueDonation $donation) use ($issue) {
                $this->notify(
                    $donation->user_id,
                    $issue->id,
                    'citizen',
                    'Contribution Refunded',
                    'The funding period ended for "'.$issue->title.'". Your simulated contribution was refunded.'
                );
            });
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
}
