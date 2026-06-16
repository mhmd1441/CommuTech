<?php

namespace App\Http\Controllers;

use App\Events\NotificationSent;
use App\Models\CommuTechNotification;
use App\Models\Issue;
use App\Models\IssueDonation;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class IssueDonationController extends Controller
{
    public function index(Request $request)
    {
        $donations = IssueDonation::query()
            ->with(['issue.user:id,name,email,phone', 'issue.assignee:id,name,email,phone'])
            ->where('user_id', $request->user()->id)
            ->latest()
            ->paginate(20);

        $donations->getCollection()
            ->pluck('issue')
            ->filter()
            ->unique('id')
            ->each(function (Issue $issue) {
                if ($issue->expireFundingIfNeeded()) {
                    $this->notifyFundingExpired($issue);
                }
            });

        return response()->json($donations);
    }

    public function store(Request $request, Issue $issue)
    {
        $data = $request->validate([
            'amount' => ['required', 'numeric', 'min:1', 'max:9999999'],
        ]);

        return DB::transaction(function () use ($request, $issue, $data) {
            $issue = Issue::whereKey($issue->id)->lockForUpdate()->firstOrFail();

            if ($issue->expireFundingIfNeeded()) {
                $this->notifyFundingExpired($issue);

                return response()->json([
                    'message' => 'This funding campaign has expired.',
                ], 422);
            }

            if ($issue->status !== 'awaiting_funding' || $issue->funding_status !== 'open') {
                return response()->json([
                    'message' => 'This issue is not open for community funding.',
                ], 422);
            }

            $amount = round((float) $data['amount'], 2);
            $remaining = $issue->remainingFundingAmount();

            if ($amount > $remaining) {
                return response()->json([
                    'message' => 'Donation is higher than the remaining funding amount.',
                    'remaining_amount' => $remaining,
                ], 422);
            }

            $donation = IssueDonation::create([
                'issue_id' => $issue->id,
                'user_id' => $request->user()->id,
                'amount' => $amount,
                'status' => IssueDonation::STATUS_CONFIRMED,
            ]);

            $issue->forceFill([
                'funding_raised' => round((float) $issue->funding_raised + $amount, 2),
            ])->save();

            $funded = $issue->fresh()->markFundingAsFundedIfGoalReached();
            $issue = $issue->fresh(['user:id,name,email,phone', 'assignee:id,name,email,phone']);

            if ($funded) {
                $this->notifyFundingCompleted($issue);
            }

            return response()->json([
                'message' => $funded
                    ? 'Funding goal reached. Repair will be scheduled.'
                    : 'Donation recorded successfully.',
                'donation' => $donation,
                'issue' => $issue,
            ], 201);
        });
    }

    private function notifyFundingCompleted(Issue $issue): void
    {
        if ($issue->assigned_to) {
            $this->notify(
                $issue->assigned_to,
                $issue->id,
                'worker',
                'Funding Goal Reached',
                'Community funding is complete for "'.$issue->title.'". You can schedule the repair.'
            );
        }

        $this->notify(
            $issue->user_id,
            $issue->id,
            'citizen',
            'Funding Goal Reached',
            'Community funding is complete for your report "'.$issue->title.'".'
        );
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
            ->with('user:id')
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
            NotificationSent::dispatch($notification);
        } catch (\Throwable $e) {
            \Log::warning('Broadcast failed: '.$e->getMessage());
        }
    }
}
