<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Issue;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;

class UserPageController extends Controller
{
    public function index(Request $request)
    {
        $data = $request->validate([
            'role' => ['nullable', Rule::in(User::ROLES)],
            'search' => ['nullable', 'string', 'max:100'],
        ]);

        $users = User::query()
            ->with('roles')
            ->when($data['role'] ?? null, fn ($query, $role) => $query->withRole($role))
            ->when($data['search'] ?? null, function ($query, $search) {
                $query->where(function ($query) use ($search) {
                    $query
                        ->where('name', 'like', "%{$search}%")
                        ->orWhere('email', 'like', "%{$search}%")
                        ->orWhere('phone', 'like', "%{$search}%");
                });
            })
            ->latest()
            ->paginate(10)
            ->withQueryString();

        return view('admin.users.index', [
            'users' => $users,
            'role' => $data['role'] ?? null,
            'search' => $data['search'] ?? '',
        ]);
    }

    public function workerShow(Request $request, User $worker)
    {
        $worker->load('roles');
        abort_unless($worker->hasRole(User::ROLE_WORKER), 404);

        $data = $request->validate([
            'range' => ['nullable', Rule::in(['today', 'week', 'month', 'year', 'all'])],
        ]);

        $range = $data['range'] ?? 'month';
        [$rangeStart, $rangeEnd, $rangeLabel] = $this->workerAnalyticsRange($range);

        $baseReports = $this->workerReportQuery($worker->id, $rangeStart, $rangeEnd);
        $activeStatuses = ['pending', 'in_progress', 'under_investigation'];

        $statusCounts = (clone $baseReports)
            ->select('status', DB::raw('count(*) as total'))
            ->groupBy('status')
            ->pluck('total', 'status');

        $priorityCounts = (clone $baseReports)
            ->select('priority', DB::raw('count(*) as total'))
            ->groupBy('priority')
            ->pluck('total', 'priority');

        $totalReports = (int) $statusCounts->sum();
        $activeReports = collect($activeStatuses)->sum(fn ($status) => (int) ($statusCounts[$status] ?? 0));
        $resolvedMilestones = $this->resolvedCountsForPeriods($worker->id, [
            'today' => [now()->startOfDay(), now()->endOfDay()],
            'week' => [now()->startOfWeek(), now()->endOfWeek()],
            'month' => [now()->startOfMonth(), now()->endOfMonth()],
        ]);

        $dailyActivity = $this->workerDailyActivity($worker->id, $rangeStart, $rangeEnd);
        $weeklyActivity = $this->workerWeeklyActivity($worker->id, $rangeStart, $rangeEnd);

        $recentReports = (clone $baseReports)
            ->with('user:id,name,email,phone')
            ->latest()
            ->take(12)
            ->get();

        return view('admin.workers.show', [
            'worker' => $worker,
            'range' => $range,
            'rangeLabel' => $rangeLabel,
            'rangeOptions' => [
                'today' => 'Today',
                'week' => 'This Week',
                'month' => 'This Month',
                'year' => 'This Year',
                'all' => 'All Time',
            ],
            'totalReports' => $totalReports,
            'activeReports' => $activeReports,
            'resolvedReports' => (int) ($statusCounts['resolved'] ?? 0),
            'underInvestigationReports' => (int) ($statusCounts['under_investigation'] ?? 0),
            'rejectedReports' => (int) ($statusCounts['rejected'] ?? 0),
            'resolvedToday' => $resolvedMilestones['today'],
            'resolvedThisWeek' => $resolvedMilestones['week'],
            'resolvedThisMonth' => $resolvedMilestones['month'],
            'averageResolutionHours' => $this->workerAverageResolutionHours($baseReports),
            'statusCounts' => $statusCounts,
            'priorityCounts' => $priorityCounts,
            'dailyActivity' => $dailyActivity,
            'weeklyActivity' => $weeklyActivity,
            'dailyActivityTitle' => ($rangeStart && $rangeStart->diffInDays($rangeEnd) <= 31) ? 'Daily Work' : 'Recent Daily Work',
            'weeklyActivityTitle' => ($rangeStart && $rangeStart->diffInWeeks($rangeEnd) <= 8) ? 'Weekly Work' : 'Recent Weekly Work',
            'recentReports' => $recentReports,
        ]);
    }

    private function workerAnalyticsRange(string $range): array
    {
        return match ($range) {
            'today' => [now()->startOfDay(), now()->endOfDay(), 'Today'],
            'week' => [now()->startOfWeek(), now()->endOfWeek(), 'This Week'],
            'year' => [now()->startOfYear(), now()->endOfYear(), 'This Year'],
            'all' => [null, null, 'All Time'],
            default => [now()->startOfMonth(), now()->endOfMonth(), 'This Month'],
        };
    }

    private function workerReportQuery(int $workerId, ?Carbon $start, ?Carbon $end)
    {
        $query = Issue::query()->where('assigned_to', $workerId);

        if ($start && $end) {
            $query->where(function ($query) use ($start, $end) {
                $query->whereBetween('created_at', [$start, $end])
                    ->orWhereBetween('updated_at', [$start, $end])
                    ->orWhereBetween('worker_resolved_at', [$start, $end])
                    ->orWhereBetween('resolved_at', [$start, $end]);
            });
        }

        return $query;
    }

    private function workerDailyActivity(int $workerId, ?Carbon $rangeStart, ?Carbon $rangeEnd)
    {
        $start = $rangeStart?->copy()->startOfDay() ?? now()->subDays(6)->startOfDay();
        $end = $rangeEnd?->copy()->endOfDay() ?? now()->endOfDay();

        if ($start->diffInDays($end) > 31) {
            $start = now()->subDays(6)->startOfDay();
            $end = now()->endOfDay();
        }

        $newWorkByDay = $this->createdActivityBuckets($workerId, $start, $end, 'day');
        $resolvedByDay = $this->resolvedActivityBuckets($workerId, $start, $end, 'day');

        $rows = collect();
        $current = $start->copy();
        while ($current->lte($end)) {
            $key = $current->toDateString();

            $rows->push([
                'label' => $current->format('M j'),
                'new_work' => (int) ($newWorkByDay[$key] ?? 0),
                'resolved' => (int) ($resolvedByDay[$key] ?? 0),
            ]);

            $current->addDay();
        }

        return $rows;
    }

    private function workerWeeklyActivity(int $workerId, ?Carbon $rangeStart, ?Carbon $rangeEnd)
    {
        $start = $rangeStart?->copy()->startOfWeek() ?? now()->subWeeks(3)->startOfWeek();
        $end = $rangeEnd?->copy()->endOfWeek() ?? now()->endOfWeek();

        if ($start->diffInWeeks($end) > 8) {
            $start = now()->subWeeks(3)->startOfWeek();
            $end = now()->endOfWeek();
        }

        $newWorkByWeek = $this->createdActivityBuckets($workerId, $start, $end, 'week');
        $resolvedByWeek = $this->resolvedActivityBuckets($workerId, $start, $end, 'week');

        $rows = collect();
        $current = $start->copy();
        while ($current->lte($end)) {
            $weekStart = $current->copy()->startOfWeek();
            $weekEnd = $current->copy()->endOfWeek();
            $key = $weekStart->toDateString();

            $rows->push([
                'label' => $weekStart->format('M j').' - '.$weekEnd->format('M j'),
                'new_work' => (int) ($newWorkByWeek[$key] ?? 0),
                'resolved' => (int) ($resolvedByWeek[$key] ?? 0),
            ]);

            $current->addWeek();
        }

        return $rows;
    }

    public function create()
    {
        return view('admin.users.form', [
            'user' => new User,
            'roles' => User::ROLES,
            'selectedRoles' => [request('role', User::ROLE_CITIZEN)],
            'municipalities' => DB::table('municipalities')->orderBy('name_en')->pluck('name_en'),
            'mode' => 'create',
        ]);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'first_name' => ['required', 'string', 'min:2', 'max:80'],
            'father_name' => ['nullable', 'string', 'min:2', 'max:80'],
            'last_name' => ['required', 'string', 'min:2', 'max:80'],
            'email' => ['required', 'email:rfc', 'max:255', 'unique:users,email'],
            'phone' => ['required', 'regex:/^\+961\s?[0-9]{7,8}$/', 'unique:users,phone'],
            'roles' => ['required', 'array', 'min:1'],
            'roles.*' => ['required', Rule::in(User::ROLES)],
            'country' => ['nullable', 'string', 'max:80'],
            'city' => ['nullable', 'string', 'max:80'],
            'area' => ['nullable', 'string', 'max:120'],
            'street' => ['nullable', 'string', 'max:160'],
            'building' => ['nullable', 'string', 'max:80'],
            'profile_picture_url' => ['nullable', 'url', 'max:2048'],
            'assigned_municipality' => [
                Rule::requiredIf(in_array(User::ROLE_WORKER, $request->input('roles', []), true)),
                'nullable', 'string', 'max:120',
            ],
            'password' => ['required', 'confirmed', Password::min(8)->letters()->numbers()],
        ]);

        $data['email'] = strtolower($data['email']);
        $roles = $data['roles'];
        unset($data['roles']);
        $data['name'] = $this->displayName($data);
        $data['role'] = $this->primaryRole($roles);
        $data['is_verified'] = $this->isProfileVerified($data);
        $data['email_verified'] = true;

        $user = User::create($data);
        $user->syncRolesByName($roles);

        return redirect()
            ->route('admin.users.index', ['role' => $data['role']])
            ->with('status', 'User created successfully.');
    }

    public function edit(User $user)
    {
        $user->load('roles');

        return view('admin.users.form', [
            'user' => $user,
            'roles' => User::ROLES,
            'selectedRoles' => $user->role_names,
            'municipalities' => DB::table('municipalities')->orderBy('name_en')->pluck('name_en'),
            'mode' => 'edit',
        ]);
    }

    public function update(Request $request, User $user)
    {
        if (blank($request->input('password')) || blank($request->input('password_confirmation'))) {
            $request->request->remove('password');
            $request->request->remove('password_confirmation');
        }

        $data = $request->validate([
            'first_name' => ['required', 'string', 'min:2', 'max:80'],
            'father_name' => ['nullable', 'string', 'min:2', 'max:80'],
            'last_name' => ['required', 'string', 'min:2', 'max:80'],
            'email' => ['required', 'email:rfc', 'max:255', Rule::unique('users', 'email')->ignore($user->id)],
            'phone' => ['required', 'regex:/^\+961\s?[0-9]{7,8}$/', Rule::unique('users', 'phone')->ignore($user->id)],
            'roles' => ['required', 'array', 'min:1'],
            'roles.*' => ['required', Rule::in(User::ROLES)],
            'country' => ['nullable', 'string', 'max:80'],
            'city' => ['nullable', 'string', 'max:80'],
            'area' => ['nullable', 'string', 'max:120'],
            'street' => ['nullable', 'string', 'max:160'],
            'building' => ['nullable', 'string', 'max:80'],
            'profile_picture_url' => ['nullable', 'url', 'max:2048'],
            'assigned_municipality' => [
                Rule::requiredIf(in_array(User::ROLE_WORKER, $request->input('roles', []), true)),
                'nullable', 'string', 'max:120',
            ],
            'password' => ['sometimes', 'confirmed', Password::min(8)->letters()->numbers()],
        ]);

        $data['email'] = strtolower($data['email']);
        $roles = $data['roles'];
        unset($data['roles']);
        $data['name'] = $this->displayName($data);
        $data['role'] = $this->primaryRole($roles);
        $data['is_verified'] = $this->isProfileVerified($data);

        $user->update($data);
        $user->syncRolesByName($roles);

        return redirect()
            ->route('admin.users.index', ['role' => $user->fresh()->role])
            ->with('status', 'User updated successfully.');
    }

    public function destroy(Request $request, User $user)
    {
        if ($request->user()->is($user)) {
            return back()->withErrors(['user' => 'You cannot delete your own admin account.']);
        }

        $role = $user->role;
        $user->delete();

        return redirect()
            ->route('admin.users.index', ['role' => $role])
            ->with('status', 'User deleted successfully.');
    }

    private function createdActivityBuckets(int $workerId, Carbon $start, Carbon $end, string $bucket)
    {
        $expression = $bucket === 'week'
            ? "DATE_TRUNC('week', created_at)::date"
            : 'DATE(created_at)';

        return Issue::query()
            ->where('assigned_to', $workerId)
            ->whereBetween('created_at', [$start, $end])
            ->selectRaw("{$expression} as bucket, COUNT(*) as total")
            ->groupByRaw($expression)
            ->orderByRaw($expression)
            ->pluck('total', 'bucket');
    }

    private function resolvedActivityBuckets(int $workerId, Carbon $start, Carbon $end, string $bucket)
    {
        $resolvedAt = 'COALESCE(worker_resolved_at, resolved_at)';
        $expression = $bucket === 'week'
            ? "DATE_TRUNC('week', {$resolvedAt})::date"
            : "DATE({$resolvedAt})";

        return Issue::query()
            ->where('assigned_to', $workerId)
            ->whereRaw("{$resolvedAt} IS NOT NULL")
            ->whereRaw("{$resolvedAt} BETWEEN ? AND ?", [$start, $end])
            ->selectRaw("{$expression} as bucket, COUNT(*) as total")
            ->groupByRaw($expression)
            ->orderByRaw($expression)
            ->pluck('total', 'bucket');
    }

    private function resolvedCountsForPeriods(int $workerId, array $periods): array
    {
        $resolvedAt = 'COALESCE(worker_resolved_at, resolved_at)';
        $selects = [];
        $bindings = [];

        foreach ($periods as $key => [$start, $end]) {
            $selects[] = "SUM(CASE WHEN {$resolvedAt} BETWEEN ? AND ? THEN 1 ELSE 0 END) as {$key}";
            $bindings[] = $start;
            $bindings[] = $end;
        }

        $row = Issue::query()
            ->where('assigned_to', $workerId)
            ->whereRaw("{$resolvedAt} IS NOT NULL")
            ->selectRaw(implode(', ', $selects), $bindings)
            ->first();

        return collect(array_keys($periods))
            ->mapWithKeys(fn ($key) => [$key => (int) ($row->{$key} ?? 0)])
            ->all();
    }

    private function workerAverageResolutionHours($baseReports): ?float
    {
        $resolvedAt = 'COALESCE(worker_resolved_at, resolved_at)';

        $average = (clone $baseReports)
            ->where('status', 'resolved')
            ->whereRaw("{$resolvedAt} IS NOT NULL")
            ->selectRaw("AVG(EXTRACT(EPOCH FROM ({$resolvedAt} - created_at)) / 3600) as average_hours")
            ->value('average_hours');

        return $average !== null ? round((float) $average, 1) : null;
    }

    private function displayName(array $data): string
    {
        return trim(collect([
            $data['first_name'] ?? null,
            $data['father_name'] ?? null,
            $data['last_name'] ?? null,
        ])->filter()->implode(' '));
    }

    private function primaryRole(array $roles): string
    {
        if (in_array(User::ROLE_ADMIN, $roles, true)) {
            return User::ROLE_ADMIN;
        }

        if (in_array(User::ROLE_CITIZEN, $roles, true)) {
            return User::ROLE_CITIZEN;
        }

        return $roles[0] ?? User::ROLE_CITIZEN;
    }

    private function isProfileVerified(array $data): bool
    {
        return collect([
            $data['first_name'] ?? null,
            $data['father_name'] ?? null,
            $data['last_name'] ?? null,
            $data['email'] ?? null,
            $data['phone'] ?? null,
            $data['country'] ?? null,
            $data['city'] ?? null,
            $data['area'] ?? null,
            $data['street'] ?? null,
            $data['building'] ?? null,
            $data['profile_picture_url'] ?? null,
        ])->every(fn ($value) => filled($value));
    }
}
