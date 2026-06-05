<?php

namespace App\Console\Commands;

use App\Events\NotificationSent;
use App\Mail\SlaBreachMail;
use App\Models\CommuTechNotification;
use App\Models\Issue;
use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Mail;

class CheckSlaBreaches extends Command
{
    protected $signature   = 'sla:check';
    protected $description = 'Mark overdue issues as SLA breached and notify admins';

    public function handle(): void
    {
        $breached = Issue::query()
            ->whereNotIn('status', ['resolved', 'rejected'])
            ->where('sla_breached', false)
            ->whereNotNull('due_at')
            ->where('due_at', '<', now())
            ->get();

        if ($breached->isEmpty()) {
            $this->info('No new SLA breaches found.');
            return;
        }

        foreach ($breached as $issue) {
            $issue->update(['sla_breached' => true]);

            $notification = CommuTechNotification::create([
                'user_id'        => $issue->user_id,
                'issue_id'       => $issue->id,
                'type'           => 'status_update',
                'recipient_role' => 'citizen',
                'title'          => 'Report Overdue',
                'body'           => 'Your report "'.$issue->title.'" has exceeded its resolution deadline. We apologize for the delay.',
            ]);
            try { NotificationSent::dispatch($notification); } catch (\Throwable $e) {}
        }

        $admins = User::withRole(User::ROLE_ADMIN)->get(['email']);
        foreach ($admins as $admin) {
            try {
                Mail::to($admin->email)->send(new SlaBreachMail($breached));
            } catch (\Throwable $e) {
                \Log::warning('SLA breach email failed: '.$e->getMessage());
            }
        }

        $this->info("Marked {$breached->count()} issue(s) as SLA breached.");
    }
}
