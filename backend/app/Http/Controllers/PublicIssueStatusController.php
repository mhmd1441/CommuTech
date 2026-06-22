<?php

namespace App\Http\Controllers;

use App\Models\Issue;

class PublicIssueStatusController extends Controller
{
    private const STATUS_LABELS = [
        'in_progress' => 'In Progress',
        'resolved' => 'Resolved',
        'under_investigation' => 'Resolved — under review',
    ];

    private const STATUS_TONES = [
        'in_progress' => 'info',
        'resolved' => 'success',
        'under_investigation' => 'warning',
    ];

    public function show(string $id)
    {
        try {
            if (! ctype_digit($id)) {
                return response()->view('public.issue-not-found', [], 404);
            }

            $issue = Issue::select(['id', 'category', 'image_url', 'status', 'due_at', 'municipality_en'])
                ->find((int) $id);

            if (! $issue || ! $issue->isPubliclyVisible()) {
                return response()->view('public.issue-not-found', [], 404);
            }

            return response()->view('public.issue-status', [
                'category' => $issue->category,
                'imageUrl' => $issue->image_url,
                'statusLabel' => self::STATUS_LABELS[$issue->status] ?? 'In Progress',
                'statusTone' => self::STATUS_TONES[$issue->status] ?? 'info',
                'dueAt' => $issue->due_at,
                'isOverdue' => $issue->status === 'in_progress' && $issue->due_at && $issue->due_at->isPast(),
                'municipality' => $issue->municipality_en,
            ]);
        } catch (\Throwable $e) {
            \Log::warning('Public issue status page failed: '.$e->getMessage());

            return response()->view('public.issue-not-found', [], 404);
        }
    }
}
