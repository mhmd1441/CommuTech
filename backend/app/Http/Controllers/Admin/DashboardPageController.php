<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Issue;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class DashboardPageController extends Controller
{
    private const RANGE_PRESETS = [
        'week' => 'Past week',
        'month' => 'Past month',
        'quarter' => 'Past quarter (3 months)',
        'six_months' => 'Past 6 months',
        'year' => 'Past year',
        'custom' => 'Custom dates',
    ];

    public function index(Request $request)
    {
        $dateRange = $this->resolveDateRange($request);
        $statusLabels = Issue::STATUSES;
        $priorityLabels = ['low', 'medium', 'high', 'critical'];

        $userSummary = $this->userSummary();
        $issueSummary = $this->issueSummary($dateRange['start'], $dateRange['end'], $statusLabels);
        $statusCounts = $this->formatCounts($statusLabels, $issueSummary['statusTotals']);
        $priorityCounts = $this->formatCounts(
            $priorityLabels,
            $this->issueTotalsBy('priority', $dateRange['start'], $dateRange['end'])
        );
        $categoryCounts = $this->formatCounts(
            Issue::CATEGORIES,
            $this->issueTotalsBy('category', $dateRange['start'], $dateRange['end'])
        );
        $trend = $this->issueTrend($dateRange['start'], $dateRange['end']);

        return view('admin.dashboard', [
            'summary' => [
                'totalUsers' => $userSummary['totalUsers'],
                'citizens' => $userSummary['citizens'],
                'workers' => $userSummary['workers'],
                'admins' => $userSummary['admins'],
                'totalIssues' => $issueSummary['totalIssues'],
                'pendingIssues' => $issueSummary['pendingIssues'],
                'inProgressIssues' => $issueSummary['inProgressIssues'],
                'resolvedIssues' => $issueSummary['resolvedIssues'],
                'unassignedIssues' => $issueSummary['unassignedIssues'],
            ],
            'statusCounts' => $statusCounts,
            'priorityCounts' => $priorityCounts,
            'categoryCounts' => $categoryCounts,
            'trend' => $trend,
            'dateRange' => [
                ...$dateRange,
                'options' => self::RANGE_PRESETS,
                'from' => $dateRange['start']->toDateString(),
                'to' => $dateRange['end']->toDateString(),
            ],
            'recentIssues' => Issue::with(['user:id,name,email,role', 'assignee:id,name,email,role'])
                ->whereBetween('created_at', [$dateRange['start'], $dateRange['end']])
                ->latest()
                ->limit(8)
                ->get(),
            'recentUsers' => User::with('roles')
                ->select(['id', 'name', 'email', 'role', 'phone', 'city', 'created_at'])
                ->latest()
                ->limit(8)
                ->get(),
        ]);
    }

    private function userSummary(): array
    {
        $row = DB::table('users')
            ->leftJoin('role_user', 'users.id', '=', 'role_user.user_id')
            ->leftJoin('roles', 'roles.id', '=', 'role_user.role_id')
            ->selectRaw('COUNT(DISTINCT users.id) as total_users')
            ->selectRaw('COUNT(DISTINCT CASE WHEN users.role = ? OR roles.name = ? THEN users.id END) as citizens', [
                User::ROLE_CITIZEN,
                User::ROLE_CITIZEN,
            ])
            ->selectRaw('COUNT(DISTINCT CASE WHEN users.role = ? OR roles.name = ? THEN users.id END) as workers', [
                User::ROLE_WORKER,
                User::ROLE_WORKER,
            ])
            ->selectRaw('COUNT(DISTINCT CASE WHEN users.role = ? OR roles.name = ? THEN users.id END) as admins', [
                User::ROLE_ADMIN,
                User::ROLE_ADMIN,
            ])
            ->first();

        return [
            'totalUsers' => (int) ($row->total_users ?? 0),
            'citizens' => (int) ($row->citizens ?? 0),
            'workers' => (int) ($row->workers ?? 0),
            'admins' => (int) ($row->admins ?? 0),
        ];
    }

    private function issueSummary(Carbon $start, Carbon $end, array $statuses): array
    {
        $selects = [
            'COUNT(*) as total_issues',
            'SUM(CASE WHEN assigned_to IS NULL THEN 1 ELSE 0 END) as unassigned_issues',
        ];
        $bindings = [];

        foreach ($statuses as $status) {
            $selects[] = "SUM(CASE WHEN status = ? THEN 1 ELSE 0 END) as {$status}_issues";
            $bindings[] = $status;
        }

        $row = $this->issuesInRange($start, $end)
            ->selectRaw(implode(', ', $selects), $bindings)
            ->first();

        $statusTotals = collect($statuses)
            ->mapWithKeys(fn (string $status) => [$status => (int) ($row->{$status.'_issues'} ?? 0)]);

        return [
            'totalIssues' => (int) ($row->total_issues ?? 0),
            'pendingIssues' => (int) ($statusTotals['pending'] ?? 0),
            'inProgressIssues' => (int) ($statusTotals['in_progress'] ?? 0),
            'resolvedIssues' => (int) ($statusTotals['resolved'] ?? 0),
            'unassignedIssues' => (int) ($row->unassigned_issues ?? 0),
            'statusTotals' => $statusTotals,
        ];
    }

    private function issueTotalsBy(string $column, Carbon $start, Carbon $end)
    {
        return $this->issuesInRange($start, $end)
            ->select($column, DB::raw('count(*) as total'))
            ->groupBy($column)
            ->pluck('total', $column);
    }

    private function formatCounts(array $labels, $counts): array
    {
        return collect($labels)
            ->map(fn (string $label) => [
                'label' => $label,
                'total' => (int) ($counts[$label] ?? 0),
            ])
            ->values()
            ->all();
    }

    private function issueTrend(Carbon $start, Carbon $end): array
    {
        $days = (int) $start->diffInDays($end);
        $bucket = match (true) {
            $days > 186 => 'month',
            $days > 31 => 'week',
            default => 'day',
        };

        $expression = match ($bucket) {
            'month' => "DATE_TRUNC('month', created_at)::date",
            'week' => "DATE_TRUNC('week', created_at)::date",
            default => 'DATE(created_at)',
        };

        $bucketedRows = $this->issuesInRange($start, $end)
            ->selectRaw("{$expression} as bucket_date, COUNT(*) as total")
            ->groupByRaw($expression)
            ->orderByRaw($expression)
            ->pluck('total', 'bucket_date')
            ->map(fn ($total) => (int) $total)
            ->all();

        $points = [];
        $cursor = match ($bucket) {
            'month' => $start->copy()->startOfMonth(),
            'week' => $start->copy()->startOfWeek(),
            default => $start->copy(),
        };

        while ($cursor->lte($end)) {
            $key = $cursor->toDateString();
            $points[] = [
                'label' => match ($bucket) {
                    'month' => $cursor->format('M Y'),
                    'week' => 'Week of '.$cursor->format('M d'),
                    default => $cursor->format('M d'),
                },
                'axis_label' => match ($bucket) {
                    'month' => $cursor->format('M'),
                    default => $cursor->format('M d'),
                },
                'date' => $key,
                'total' => (int) ($bucketedRows[$key] ?? 0),
            ];

            match ($bucket) {
                'month' => $cursor->addMonth(),
                'week' => $cursor->addWeek(),
                default => $cursor->addDay(),
            };
        }

        return $points;
    }

    private function resolveDateRange(Request $request): array
    {
        $data = $request->validate([
            'range' => ['nullable', Rule::in(array_keys(self::RANGE_PRESETS))],
            'from' => ['nullable', 'date'],
            'to' => ['nullable', 'date'],
        ]);

        $preset = $data['range'] ?? 'month';
        $end = now()->endOfDay();

        $start = match ($preset) {
            'week' => now()->subDays(6)->startOfDay(),
            'quarter' => now()->subMonths(3)->startOfDay(),
            'six_months' => now()->subMonths(6)->startOfDay(),
            'year' => now()->subYear()->startOfDay(),
            'custom' => isset($data['from'])
                ? Carbon::parse($data['from'])->startOfDay()
                : now()->subMonth()->startOfDay(),
            default => now()->subMonth()->startOfDay(),
        };

        if ($preset === 'custom' && isset($data['to'])) {
            $end = Carbon::parse($data['to'])->endOfDay();
        }

        if ($start->gt($end)) {
            [$start, $end] = [$end->copy()->startOfDay(), $start->copy()->endOfDay()];
        }

        return [
            'preset' => $preset,
            'label' => $preset === 'custom'
                ? $start->format('M d, Y').' - '.$end->format('M d, Y')
                : self::RANGE_PRESETS[$preset],
            'start' => $start,
            'end' => $end,
        ];
    }

    private function issuesInRange(Carbon $start, Carbon $end)
    {
        return Issue::query()->whereBetween('created_at', [$start, $end]);
    }
}
