<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Issue;
use App\Models\User;
use Illuminate\Support\Facades\DB;

class DashboardPageController extends Controller
{
    public function index()
    {
        $statusLabels = ['pending', 'in_progress', 'resolved', 'rejected'];
        $priorityLabels = ['low', 'medium', 'high', 'critical'];

        $statusCounts = $this->countIssuesBy('status', $statusLabels);
        $priorityCounts = $this->countIssuesBy('priority', $priorityLabels);
        $categoryCounts = $this->countIssuesBy('category', Issue::CATEGORIES);
        $trend = $this->issueTrend();

        return view('admin.dashboard', [
            'summary' => [
                'totalUsers' => User::count(),
                'citizens' => User::where('role', User::ROLE_CITIZEN)->count(),
                'workers' => User::where('role', User::ROLE_WORKER)->count(),
                'admins' => User::where('role', User::ROLE_ADMIN)->count(),
                'totalIssues' => Issue::count(),
                'pendingIssues' => Issue::where('status', 'pending')->count(),
                'inProgressIssues' => Issue::where('status', 'in_progress')->count(),
                'resolvedIssues' => Issue::where('status', 'resolved')->count(),
                'unassignedIssues' => Issue::whereNull('assigned_to')->count(),
            ],
            'statusCounts' => $statusCounts,
            'priorityCounts' => $priorityCounts,
            'categoryCounts' => $categoryCounts,
            'trend' => $trend,
            'recentIssues' => Issue::with(['user:id,name,email,role', 'assignee:id,name,email,role'])
                ->latest()
                ->limit(8)
                ->get(),
            'recentUsers' => User::select(['id', 'name', 'email', 'role', 'phone', 'city', 'created_at'])
                ->latest()
                ->limit(8)
                ->get(),
        ]);
    }

    private function countIssuesBy(string $column, array $labels): array
    {
        $counts = Issue::query()
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

    private function issueTrend(): array
    {
        $rows = Issue::query()
            ->selectRaw('DATE(created_at) as report_date, COUNT(*) as total')
            ->where('created_at', '>=', now()->subDays(13)->startOfDay())
            ->groupBy('report_date')
            ->orderBy('report_date')
            ->pluck('total', 'report_date');

        return collect(range(0, 13))->map(function (int $index) use ($rows) {
            $date = now()->subDays(13 - $index)->toDateString();

            return [
                'label' => now()->subDays(13 - $index)->format('M d'),
                'date' => $date,
                'total' => (int) ($rows[$date] ?? 0),
            ];
        })->all();
    }
}
