<?php

namespace App\Http\Controllers\Admin;

use App\Events\NotificationSent;
use App\Http\Controllers\Controller;
use App\Models\CommuTechNotification;
use App\Models\Issue;
use App\Models\IssueDonation;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class ReportPageController extends Controller
{
    public function index(Request $request)
    {
        $data = $request->validate([
            'status' => ['nullable', Rule::in(Issue::STATUSES)],
            'funding_status' => ['nullable', Rule::in(Issue::FUNDING_STATUSES)],
            'category' => ['nullable', Rule::in(Issue::CATEGORIES)],
            'municipality' => ['nullable', 'string', 'max:120'],
            'search' => ['nullable', 'string', 'max:100'],
            'sla' => ['nullable', Rule::in(['breached'])],
        ]);

        $reports = Issue::query()
            ->with(['user:id,name,email,phone,role', 'assignee:id,name,email,phone,role'])
            ->withCount(['upvotes' => fn ($q) => $q->whereColumn('issue_upvotes.user_id', '!=', 'issues.user_id')])
            ->when($data['status'] ?? null, fn($q, $status) => $q->where('status', $status))
            ->when($data['funding_status'] ?? null, fn($q, $fundingStatus) => $q->where('funding_status', $fundingStatus))
            ->when($data['category'] ?? null, fn($q, $category) => $q->where('category', $category))
            ->when($data['municipality'] ?? null, fn($q, $municipality) => $q->where('municipality_en', $municipality))
            ->when(($data['sla'] ?? null) === 'breached', fn($q) => $q->where('sla_breached', true))
            ->when($data['search'] ?? null, function ($q, $search) {
                $q->where(function ($q) use ($search) {
                    $q->where('title', 'like', "%{$search}%")
                        ->orWhere('location', 'like', "%{$search}%")
                        ->orWhere('description', 'like', "%{$search}%");
                });
            })
            ->latest()
            ->paginate(10)
            ->withQueryString();

        $reports->getCollection()->each(function (Issue $report) {
            $report->setAttribute('affected_count', ((int) $report->upvotes_count) + 1);
        });

        return view('admin.reports.index', [
            'reports' => $reports,
            'categories' => Issue::CATEGORIES,
            'status' => $data['status'] ?? null,
            'fundingStatus' => $data['funding_status'] ?? null,
            'category' => $data['category'] ?? null,
            'municipality' => $data['municipality'] ?? '',
            'municipalities' => DB::table('municipalities')->orderBy('name_en')->pluck('name_en'),
            'search' => $data['search'] ?? '',
            'underInvestigationCount' => Issue::where('status', 'under_investigation')->count(),
            'slaBreachedCount' => Issue::where('sla_breached', true)
                ->whereNotIn('status', ['resolved', 'rejected'])
                ->count(),
        ]);
    }

    public function show(Issue $report)
    {
        if ($report->expireFundingIfNeeded()) {
            $this->notifyFundingExpired($report);
        }

        $report->load([
            'user.roles',
            'assignee.roles',
            'donations' => fn ($query) => $query->with('user:id,name,email,phone')->latest(),
        ])->loadCount(['upvotes' => fn ($q) => $q->where('user_id', '!=', $report->user_id)]);

        $report->setAttribute('affected_count', ((int) $report->upvotes_count) + 1);

        $notifications = CommuTechNotification::query()
            ->where('issue_id', $report->id)
            ->latest()
            ->take(8)
            ->get();

        return view('admin.reports.show', [
            'report' => $report,
            'notifications' => $notifications,
        ]);
    }

    public function approveFunding(Request $request, Issue $report)
    {
        if ($report->funding_status !== 'requested') {
            return back()->withErrors([
                'funding' => 'Only requested funding reports can be approved.',
            ]);
        }

        $data = $request->validate([
            'funding_type' => ['required', Rule::in(Issue::FUNDING_TYPES)],
            'municipality_contribution' => ['nullable', 'numeric', 'min:0'],
            'funding_deadline' => ['required_if:funding_type,community,mixed', 'nullable', 'date', 'after_or_equal:today'],
        ]);

        $estimatedCost = (float) $report->estimated_cost;

        if ($estimatedCost <= 0) {
            return back()->withErrors([
                'funding' => 'Estimated cost is required before approving funding.',
            ]);
        }

        $fundingType = $data['funding_type'];
        $municipalityContribution = round((float) ($data['municipality_contribution'] ?? 0), 2);

        if ($fundingType === 'mixed' && ($municipalityContribution <= 0 || $municipalityContribution >= $estimatedCost)) {
            return back()->withErrors([
                'municipality_contribution' => 'Mixed funding needs a municipal contribution greater than 0 and less than the estimated cost.',
            ]);
        }

        if ($fundingType === 'community') {
            $municipalityContribution = 0;
        }

        if ($fundingType === 'municipal') {
            $report->update([
                'status' => 'in_progress',
                'funding_status' => 'none',
                'funding_type' => 'municipal',
                'funding_goal' => null,
                'funding_raised' => 0,
                'funding_deadline' => null,
                'municipality_contribution' => $estimatedCost,
                'funding_approved_at' => now(),
                'funding_funded_at' => null,
            ]);

            $this->notify(
                $report->user_id,
                $report->id,
                'citizen',
                'Repair Approved',
                'Your report "'.$report->title.'" was approved for repair.'
            );

            if ($report->assigned_to) {
                $this->notify(
                    $report->assigned_to,
                    $report->id,
                    'worker',
                    'Repair Approved',
                    'Municipal funding was approved for "'.$report->title.'".'
                );
            }

            return redirect()
                ->route('admin.reports.show', $report)
                ->with('status', 'Funding approved as municipal repair.');
        }

        $fundingGoal = round($estimatedCost - $municipalityContribution, 2);

        $report->update([
            'status' => 'awaiting_funding',
            'funding_status' => 'open',
            'funding_type' => $fundingType,
            'funding_goal' => $fundingGoal,
            'funding_raised' => 0,
            'funding_deadline' => $data['funding_deadline'],
            'municipality_contribution' => $municipalityContribution,
            'funding_approved_at' => now(),
            'funding_funded_at' => null,
        ]);

        $this->notify(
            $report->user_id,
            $report->id,
            'citizen',
            'Community Funding Open',
            'Your report "'.$report->title.'" is now open for community funding.'
        );

        return redirect()
            ->route('admin.reports.show', $report)
            ->with('status', 'Community funding opened successfully.');
    }

    public function rejectFunding(Request $request, Issue $report)
    {
        if ($report->funding_status !== 'requested') {
            return back()->withErrors([
                'funding' => 'Only requested funding reports can be rejected.',
            ]);
        }

        $data = $request->validate([
            'rejection_reason' => ['required', 'string', 'min:5', 'max:1200'],
        ]);

        $report->update([
            'status' => 'rejected',
            'funding_status' => 'none',
            'funding_type' => null,
            'funding_goal' => null,
            'funding_deadline' => null,
            'municipality_contribution' => null,
            'rejection_reason' => $data['rejection_reason'],
        ]);

        $this->notify(
            $report->user_id,
            $report->id,
            'citizen',
            'Report Rejected',
            'Your report "'.$report->title.'" was reviewed and could not be processed.'
        );

        if ($report->assigned_to) {
            $this->notify(
                $report->assigned_to,
                $report->id,
                'worker',
                'Funding Request Rejected',
                'Admin rejected the funding request for "'.$report->title.'".'
            );
        }

        return redirect()
            ->route('admin.reports.show', $report)
            ->with('status', 'Funding request rejected.');
    }

    public function create()
    {
        return view('admin.reports.form', [
            'report' => new Issue,
            'citizens' => $this->citizens(),
            'workers' => $this->workers(),
            'categories' => Issue::CATEGORIES,
            'statuses' => Issue::STATUSES,
            'priorities' => ['low', 'medium', 'high', 'critical'],
            'mode' => 'create',
        ]);
    }

    public function store(Request $request)
    {
        $data = $this->validatedReportData($request);

        if (($data['status'] ?? null) === 'resolved') {
            $data['resolved_at'] = now();
        }

        Issue::create($data);

        return redirect()
            ->route('admin.reports.index')
            ->with('status', 'Report created successfully.');
    }

    public function edit(Issue $report)
    {
        return view('admin.reports.form', [
            'report' => $report,
            'citizens' => $this->citizens(),
            'workers' => $this->workers(),
            'categories' => Issue::CATEGORIES,
            'statuses' => Issue::STATUSES,
            'priorities' => ['low', 'medium', 'high', 'critical'],
            'mode' => 'edit',
        ]);
    }

    public function update(Request $request, Issue $report)
    {
        $data = $this->validatedReportData($request);

        if (($data['status'] ?? null) === 'resolved' && ! $report->resolved_at) {
            $data['resolved_at'] = now();
        }

        if (($data['status'] ?? null) !== 'resolved') {
            $data['resolved_at'] = null;
        }

        $oldStatus = $report->status;
        $report->update($data);

        if ($oldStatus !== $data['status']) {
            $statusLabel = str_replace('_', ' ', $data['status']);

            $citizenNotif = CommuTechNotification::create([
                'user_id' => $report->user_id,
                'issue_id' => $report->id,
                'type' => 'status_update',
                'recipient_role' => 'citizen',
                'title' => 'Report Status Updated',
                'body' => 'Your report "' . $report->title . '" has been updated to: ' . $statusLabel . '.',
            ]);
            try {
                NotificationSent::dispatch($citizenNotif);
            } catch (\Throwable $e) {
                \Log::warning('Broadcast failed: ' . $e->getMessage());
            }

            if ($report->assigned_to) {
                $workerNotif = CommuTechNotification::create([
                    'user_id' => $report->assigned_to,
                    'issue_id' => $report->id,
                    'type' => 'status_update',
                    'recipient_role' => 'worker',
                    'title' => 'Assigned Report Updated',
                    'body' => 'Admin updated "' . $report->title . '" to: ' . $statusLabel . '.',
                ]);
                try {
                    NotificationSent::dispatch($workerNotif);
                } catch (\Throwable $e) {
                    \Log::warning('Broadcast failed: ' . $e->getMessage());
                }
            }
        }

        return redirect()
            ->route('admin.reports.index')
            ->with('status', 'Report updated successfully.');
    }

    public function destroy(Issue $report)
    {
        $report->delete();

        return redirect()
            ->route('admin.reports.index')
            ->with('status', 'Report deleted successfully.');
    }

    private function validatedReportData(Request $request): array
    {
        $data = $request->validate([
            'user_id' => ['required', Rule::exists('users', 'id')],
            'assigned_to' => ['nullable', Rule::exists('users', 'id')],
            'title' => ['required', 'string', 'min:4', 'max:180'],
            'description' => ['required', 'string', 'min:10'],
            'category' => ['required', Rule::in(Issue::CATEGORIES)],
            'status' => ['required', Rule::in(Issue::STATUSES)],
            'priority' => ['required', Rule::in(['low', 'medium', 'high', 'critical'])],
            'location' => ['required', 'string', 'max:255'],
            'latitude' => ['nullable', 'numeric', 'between:-90,90'],
            'longitude' => ['nullable', 'numeric', 'between:-180,180'],
            'image_url' => ['nullable', 'url', 'max:2048'],
            'rejection_reason' => ['nullable', 'string'],
        ]);

        if (! User::find($data['user_id'])?->hasRole(User::ROLE_CITIZEN)) {
            throw ValidationException::withMessages([
                'user_id' => 'The report creator must have the citizen role.',
            ]);
        }

        if (! empty($data['assigned_to']) && ! User::find($data['assigned_to'])?->hasRole(User::ROLE_WORKER)) {
            throw ValidationException::withMessages([
                'assigned_to' => 'Reports can only be assigned to users with the worker role.',
            ]);
        }

        if (! empty($data['assigned_to']) && (int) $data['assigned_to'] === (int) $data['user_id']) {
            throw ValidationException::withMessages([
                'assigned_to' => 'The report creator cannot be assigned as the worker.',
            ]);
        }

        return $data;
    }

    private function citizens()
    {
        return User::withRole(User::ROLE_CITIZEN)->orderBy('name')->get(['id', 'name', 'email', 'role']);
    }

    private function workers()
    {
        return User::withRole(User::ROLE_WORKER)->orderBy('name')->get(['id', 'name', 'email', 'role']);
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
            NotificationSent::dispatch($notification);
        } catch (\Throwable $e) {
            \Log::warning('Broadcast failed: '.$e->getMessage());
        }
    }
}
