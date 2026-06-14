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

        $resolvedReports = (clone $baseReports)
            ->where('status', 'resolved')
            ->get(['created_at', 'resolved_at', 'worker_resolved_at']);

        $resolutionHours = $resolvedReports
            ->map(fn (Issue $issue) => $this->hoursBetween($issue->created_at, $issue->worker_resolved_at ?? $issue->resolved_at))
            ->filter(fn ($hours) => $hours !== null);

        $statusCounts = (clone $baseReports)
            ->select('status', DB::raw('count(*) as total'))
            ->groupBy('status')
            ->pluck('total', 'status');

        $priorityCounts = (clone $baseReports)
            ->select('priority', DB::raw('count(*) as total'))
            ->groupBy('priority')
            ->pluck('total', 'priority');

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
            'totalReports' => (clone $baseReports)->count(),
            'activeReports' => (clone $baseReports)->whereIn('status', $activeStatuses)->count(),
            'resolvedReports' => (clone $baseReports)->where('status', 'resolved')->count(),
            'underInvestigationReports' => (clone $baseReports)->where('status', 'under_investigation')->count(),
            'rejectedReports' => (clone $baseReports)->where('status', 'rejected')->count(),
            'resolvedToday' => $this->resolvedCountBetween($worker->id, now()->startOfDay(), now()->endOfDay()),
            'resolvedThisWeek' => $this->resolvedCountBetween($worker->id, now()->startOfWeek(), now()->endOfWeek()),
            'resolvedThisMonth' => $this->resolvedCountBetween($worker->id, now()->startOfMonth(), now()->endOfMonth()),
            'averageResolutionHours' => $resolutionHours->isNotEmpty() ? round($resolutionHours->avg(), 1) : null,
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

        $rows = collect();
        $current = $start->copy();

        while ($current->lte($end)) {
            $dayStart = $current->copy()->startOfDay();
            $dayEnd = $current->copy()->endOfDay();

            $rows->push([
                'label' => $current->format('M j'),
                'new_work' => Issue::query()
                    ->where('assigned_to', $workerId)
                    ->whereBetween('created_at', [$dayStart, $dayEnd])
                    ->count(),
                'resolved' => $this->resolvedCountBetween($workerId, $dayStart, $dayEnd),
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

        $rows = collect();
        $current = $start->copy();

        while ($current->lte($end)) {
            $weekStart = $current->copy()->startOfWeek();
            $weekEnd = $current->copy()->endOfWeek();

            $rows->push([
                'label' => $weekStart->format('M j').' - '.$weekEnd->format('M j'),
                'new_work' => Issue::query()
                    ->where('assigned_to', $workerId)
                    ->whereBetween('created_at', [$weekStart, $weekEnd])
                    ->count(),
                'resolved' => $this->resolvedCountBetween($workerId, $weekStart, $weekEnd),
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
            'assigned_municipality' => ['nullable', 'string', 'max:120'],
            'password' => ['required', 'confirmed', Password::min(8)->letters()->numbers()],
        ]);

        $data['email'] = strtolower($data['email']);
        $roles = $data['roles'];
        unset($data['roles']);
        $data['name'] = $this->displayName($data);
        $data['role'] = $this->primaryRole($roles);
        $data['is_verified'] = $this->isProfileVerified($data);

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
            'assigned_municipality' => ['nullable', 'string', 'max:120'],
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

    private function resolvedCountBetween(int $workerId, $start, $end): int
    {
        return Issue::query()
            ->where('assigned_to', $workerId)
            ->where(function ($query) use ($start, $end) {
                $query->whereBetween('worker_resolved_at', [$start, $end])
                    ->orWhere(function ($query) use ($start, $end) {
                        $query->whereNull('worker_resolved_at')
                            ->whereBetween('resolved_at', [$start, $end]);
                    });
            })
            ->count();
    }

    private function hoursBetween($start, $end): ?float
    {
        if (! $start || ! $end) {
            return null;
        }

        return round(Carbon::parse($start)->diffInMinutes(Carbon::parse($end)) / 60, 1);
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
