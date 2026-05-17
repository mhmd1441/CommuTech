<?php

namespace App\Http\Controllers;

use App\Models\CommuTechNotification;
use App\Models\Issue;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
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
        ]);

        $query = Issue::with(['user:id,name,email,phone', 'assignee:id,name,email,phone']);

        if ($request->boolean('mine')) {
            $query->where('user_id', $request->user()->id);
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
            'title' => ['required', 'string', 'min:5', 'max:180'],
            'description' => ['required', 'string', 'min:20'],
            'category' => ['required', Rule::in(Issue::CATEGORIES)],
            'location' => ['required', 'string', 'min:4', 'max:255'],
            'latitude' => ['nullable', 'numeric', 'between:-90,90'],
            'longitude' => ['nullable', 'numeric', 'between:-180,180'],
            'image_url' => ['nullable', 'url', 'max:2048'],
            'image' => ['nullable', 'image', 'mimes:jpg,jpeg,png,webp', 'max:8192'],
        ]);

        if ($request->hasFile('image')) {
            $data['image_url'] = $this->publicStorageUrl(
                $request,
                $request->file('image')->store('issue-images', 'public')
            );
        }

        unset($data['image']);

        $issue = $request->user()->issues()->create([
            ...$data,
            'status' => 'pending',
            'priority' => $this->triagePriority($data['category'], $data['description']),
            'ai_score' => $this->triageScore($data['description']),
        ]);

        CommuTechNotification::create([
            'user_id' => $request->user()->id,
            'issue_id' => $issue->id,
            'type' => 'new_report',
            'title' => 'Report Submitted',
            'body' => 'Your issue "'.$issue->title.'" was submitted successfully and is pending review.',
        ]);

        return response()->json($issue->load('user:id,name,email,phone'), 201);
    }

    public function show(Request $request, Issue $issue)
    {
        if ($request->boolean('mine') && $issue->user_id !== $request->user()->id) {
            abort(404);
        }

        return response()->json($issue->load(['user:id,name,email,phone', 'assignee:id,name,email,phone']));
    }

    public function update(Request $request, Issue $issue)
    {
        $data = $request->validate([
            'title' => ['sometimes', 'string', 'min:5', 'max:180'],
            'description' => ['sometimes', 'string', 'min:20'],
            'category' => ['sometimes', Rule::in(Issue::CATEGORIES)],
            'location' => ['sometimes', 'string', 'min:4', 'max:255'],
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

        if (($data['status'] ?? null) === 'resolved') {
            $data['resolved_at'] = now();
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
        ]);

        $confirmed = (bool) $data['resolved'];

        $issue->update([
            'status' => $confirmed ? 'resolved' : 'under_investigation',
            'citizen_resolution_confirmed' => $confirmed,
            'citizen_resolution_note' => $data['note'] ?? null,
            'citizen_resolution_image_url' => $data['image_url'] ?? null,
            'citizen_confirmed_at' => now(),
        ]);

        if (! $confirmed && $issue->assigned_to) {
            CommuTechNotification::create([
                'user_id' => $issue->assigned_to,
                'issue_id' => $issue->id,
                'type' => 'status_update',
                'title' => 'Report Under Investigation',
                'body' => 'The citizen challenged the resolution for "'.$issue->title.'".',
            ]);
        }

        return response()->json([
            'message' => $confirmed
                ? 'Resolution confirmed.'
                : 'Report moved under investigation for admin review.',
            'issue' => $issue->fresh()->load(['user:id,name,email,phone', 'assignee:id,name,email,phone']),
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

    private function publicStorageUrl(Request $request, string $path): string
    {
        return rtrim($request->getSchemeAndHttpHost(), '/').Storage::url($path);
    }

    private function triagePriority(string $category, string $description): string
    {
        $text = strtolower($category.' '.$description);

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
}
