<?php

namespace App\Http\Controllers;

use App\Events\NotificationSent;
use App\Models\CommuTechNotification;
use App\Models\Issue;
use App\Models\IssueDonation;
use App\Models\PaymentMethod;
use App\Models\PaymentTransaction;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class PaymentController extends Controller
{
    public function pay(Request $request, Issue $issue)
    {
        $data = $request->validate([
            'amount'            => ['required', 'numeric', 'min:1', 'max:9999999'],
            // Either use a saved method:
            'payment_method_id' => ['nullable', 'integer'],
            // Or provide new method details (required when no saved method):
            'type'              => ['required_without:payment_method_id', Rule::in(['card', 'whish', 'omt', 'paypal'])],
            'brand'             => ['required_without:payment_method_id', 'string', 'max:20'],
            'last_four'         => ['required_without:payment_method_id', 'string', 'size:4'],
            'save_method'       => ['nullable', 'boolean'],
        ]);

        return DB::transaction(function () use ($request, $issue, $data) {
            $issue = Issue::whereKey($issue->id)->lockForUpdate()->firstOrFail();

            if ($issue->expireFundingIfNeeded()) {
                $this->notifyFundingExpired($issue);
                return response()->json(['message' => 'This funding campaign has expired.'], 422);
            }

            if ($issue->status !== 'awaiting_funding' || $issue->funding_status !== 'open') {
                return response()->json(['message' => 'This issue is not open for community funding.'], 422);
            }

            $amount    = round((float) $data['amount'], 2);
            $remaining = $issue->remainingFundingAmount();

            if ($amount > $remaining) {
                return response()->json([
                    'message'          => 'Donation exceeds the remaining funding amount.',
                    'remaining_amount' => $remaining,
                ], 422);
            }

            // ── Resolve payment method ────────────────────────────────────────
            $paymentMethod = null;

            if (! empty($data['payment_method_id'])) {
                $paymentMethod = PaymentMethod::where('id', $data['payment_method_id'])
                    ->where('user_id', $request->user()->id)
                    ->firstOrFail();
            } elseif ($data['save_method'] ?? false) {
                $userId  = $request->user()->id;
                $isFirst = PaymentMethod::where('user_id', $userId)->count() === 0;
                $label   = $this->buildLabel($data['brand'], $data['last_four']);

                $paymentMethod = PaymentMethod::create([
                    'user_id'    => $userId,
                    'type'       => $data['type'],
                    'brand'      => $data['brand'],
                    'label'      => $label,
                    'last_four'  => $data['last_four'],
                    'is_default' => $isFirst,
                ]);
            }

            // ── Create pending transaction (DB record exists before success screen) ──
            $reference   = 'TXN-' . date('Ymd') . '-' . strtoupper(substr(bin2hex(random_bytes(3)), 0, 6));
            $transaction = PaymentTransaction::create([
                'user_id'           => $request->user()->id,
                'issue_id'          => $issue->id,
                'payment_method_id' => $paymentMethod?->id,
                'amount'            => $amount,
                'status'            => 'pending',
                'reference'         => $reference,
            ]);

            // ── Create donation & update funding ──────────────────────────────
            $donation = IssueDonation::create([
                'issue_id' => $issue->id,
                'user_id'  => $request->user()->id,
                'amount'   => $amount,
                'status'   => IssueDonation::STATUS_CONFIRMED,
            ]);

            $issue->forceFill([
                'funding_raised' => round((float) $issue->funding_raised + $amount, 2),
            ])->save();

            // ── Mark transaction completed ────────────────────────────────────
            $transaction->update([
                'status'            => 'completed',
                'issue_donation_id' => $donation->id,
                'paid_at'           => now(),
            ]);

            $funded = $issue->fresh()->markFundingAsFundedIfGoalReached();
            $issue  = $issue->fresh(['user:id,name,email,phone', 'assignee:id,name,email,phone']);

            if ($funded) {
                $this->notifyFundingCompleted($issue);
            }

            return response()->json([
                'message'     => $funded
                    ? 'Funding goal reached. Repair will be scheduled.'
                    : 'Payment confirmed.',
                'transaction' => $transaction->fresh(),
                'donation'    => $donation,
                'issue'       => $issue,
            ], 201);
        });
    }

    public function transactions(Request $request)
    {
        $transactions = PaymentTransaction::with(['issue:id,title', 'paymentMethod'])
            ->where('user_id', $request->user()->id)
            ->latest()
            ->paginate(20);

        return response()->json($transactions);
    }

    private function buildLabel(string $brand, string $lastFour): string
    {
        $name = match (strtolower($brand)) {
            'visa'       => 'Visa',
            'mastercard' => 'Mastercard',
            'whish'      => 'Whish',
            'omt'        => 'OMT',
            'paypal'     => 'PayPal',
            default      => ucfirst($brand),
        };

        return "{$name} •••• {$lastFour}";
    }

    private function notifyFundingCompleted(Issue $issue): void
    {
        if ($issue->assigned_to) {
            $this->notify($issue->assigned_to, $issue->id, 'worker',
                'Funding Goal Reached',
                'Community funding is complete for "' . $issue->title . '". You can schedule the repair.');
        }
        $this->notify($issue->user_id, $issue->id, 'citizen',
            'Funding Goal Reached',
            'Community funding is complete for your report "' . $issue->title . '".');
    }

    private function notifyFundingExpired(Issue $issue): void
    {
        $this->notify($issue->user_id, $issue->id, 'citizen',
            'Funding Period Ended',
            'The funding period ended for "' . $issue->title . '". Contributions were marked as refunded.');
    }

    private function notify(int $userId, int $issueId, string $recipientRole, string $title, string $body): void
    {
        $notification = CommuTechNotification::create([
            'user_id'        => $userId,
            'issue_id'       => $issueId,
            'type'           => 'funding_update',
            'recipient_role' => $recipientRole,
            'title'          => $title,
            'body'           => $body,
        ]);

        try {
            NotificationSent::dispatch($notification);
        } catch (\Throwable $e) {
            \Log::warning('Broadcast failed: ' . $e->getMessage());
        }
    }
}
