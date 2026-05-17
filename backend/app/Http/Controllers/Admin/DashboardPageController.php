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

        $statusCounts = $this->countIssuesBy('status', $statusLabels, $dateRange['start'], $dateRange['end']);
        $priorityCounts = $this->countIssuesBy('priority', $priorityLabels, $dateRange['start'], $dateRange['end']);
        $categoryCounts = $this->countIssuesBy('category', Issue::CATEGORIES, $dateRange['start'], $dateRange['end']);
        $trend = $this->issueTrend($dateRange['start'], $dateRange['end']);

        return view('admin.dashboard', [
            'summary' => [
                'totalUsers' => User::count(),
                'citizens' => User::withRole(User::ROLE_CITIZEN)->count(),
                'workers' => User::withRole(User::ROLE_WORKER)->count(),
                'admins' => User::withRole(User::ROLE_ADMIN)->count(),
                'totalIssues' => $this->issuesInRange($dateRange['start'], $dateRange['end'])->count(),
                'pendingIssues' => $this->issuesInRange($dateRange['start'], $dateRange['end'])->where('status', 'pending')->count(),
                'inProgressIssues' => $this->issuesInRange($dateRange['start'], $dateRange['end'])->where('status', 'in_progress')->count(),
                'resolvedIssues' => $this->issuesInRange($dateRange['start'], $dateRange['end'])->where('status', 'resolved')->count(),
                'unassignedIssues' => $this->issuesInRange($dateRange['start'], $dateRange['end'])->whereNull('assigned_to')->count(),
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

    private function countIssuesBy(string $column, array $labels, Carbon $start, Carbon $end): array
    {
        $counts = $this->issuesInRange($start, $end)
            ->select($column, DB::raw('count(*) as total'))
            ->groupBy($column)
            ->pluck('total', $column);

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
        $rows = $this->issuesInRange($start, $end)
            ->selectRaw('DATE(created_at) as report_date, COUNT(*) as total')
            ->groupBy('report_date')
            ->orderBy('report_date')
            ->pluck('total', 'report_date');

        $days = (int) $start->diffInDays($end);
        $bucket = match (true) {
            $days > 186 => 'month',
            $days > 31 => 'week',
            default => 'day',
        };

        $bucketedRows = $rows->reduce(function (array $totals, $total, string $date) use ($bucket) {
            $key = match ($bucket) {
                'month' => Carbon::parse($date)->startOfMonth()->toDateString(),
                'week' => Carbon::parse($date)->startOfWeek()->toDateString(),
                default => $date,
            };

            $totals[$key] = ($totals[$key] ?? 0) + (int) $total;

            return $totals;
        }, []);

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
