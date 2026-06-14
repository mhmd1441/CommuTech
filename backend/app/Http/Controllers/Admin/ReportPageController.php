<?php

namespace App\Http\Controllers\Admin;

use App\Events\NotificationSent;
use App\Http\Controllers\Controller;
use App\Models\CommuTechNotification;
use App\Models\Issue;
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
            'category' => ['nullable', Rule::in(Issue::CATEGORIES)],
            'search' => ['nullable', 'string', 'max:100'],
            'sla' => ['nullable', Rule::in(['breached'])],
        ]);

        $reports = Issue::query()
            ->with(['user:id,name,email,phone,role', 'assignee:id,name,email,phone,role'])
            ->when($data['status'] ?? null, fn ($q, $status) => $q->where('status', $status))
            ->when($data['category'] ?? null, fn ($q, $category) => $q->where('category', $category))
            ->when($data['municipality'] ?? null, fn ($q, $municipality) => $q->where('municipality_en', $municipality))
            ->when(($data['sla'] ?? null) === 'breached', fn ($q) => $q->where('sla_breached', true))
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

        return view('admin.reports.index', [
<<<<<<< HEAD
            'reports' => $reports,
            'categories' => Issue::CATEGORIES,
            'status' => $data['status'] ?? null,
            'category' => $data['category'] ?? null,
            'search' => $data['search'] ?? '',
            'underInvestigationCount' => Issue::where('status', 'under_investigation')->count(),
            'slaBreachedCount' => Issue::where('sla_breached', true)
                ->whereNotIn('status', ['resolved', 'rejected'])
                ->count(),
        ]);
    }

    public function show(Issue $report)
    {
        $report->load(['user.roles', 'assignee.roles']);

        $notifications = CommuTechNotification::query()
            ->where('issue_id', $report->id)
            ->latest()
            ->take(8)
            ->get();

        return view('admin.reports.show', [
            'report' => $report,
            'notifications' => $notifications,
=======
            'reports'                => $reports,
            'categories'             => Issue::CATEGORIES,
            'municipalities'         => DB::table('municipalities')->orderBy('name_en')->pluck('name_en'),
            'status'                 => $data['status'] ?? null,
            'category'               => $data['category'] ?? null,
            'municipality'           => $data['municipality'] ?? null,
            'search'                 => $data['search'] ?? '',
            'underInvestigationCount'=> Issue::where('status', 'under_investigation')->count(),
            'slaBreachedCount'       => Issue::where('sla_breached', true)
                                            ->whereNotIn('status', ['resolved', 'rejected'])
                                            ->count(),
>>>>>>> 4e299a7390c630f10757fe7ec6eda4c4aa03479d
        ]);
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
                'body' => 'Your report "'.$report->title.'" has been updated to: '.$statusLabel.'.',
            ]);
            try { NotificationSent::dispatch($citizenNotif); } catch (\Throwable $e) { \Log::warning('Broadcast failed: '.$e->getMessage()); }

            if ($report->assigned_to) {
                $workerNotif = CommuTechNotification::create([
                    'user_id' => $report->assigned_to,
                    'issue_id' => $report->id,
                    'type' => 'status_update',
                    'recipient_role' => 'worker',
                    'title' => 'Assigned Report Updated',
                    'body' => 'Admin updated "'.$report->title.'" to: '.$statusLabel.'.',
                ]);
                try { NotificationSent::dispatch($workerNotif); } catch (\Throwable $e) { \Log::warning('Broadcast failed: '.$e->getMessage()); }
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
}
