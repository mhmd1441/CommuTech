<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Issue;
use App\Models\User;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

class DashboardController extends Controller
{
    public function summary()
    {
        return response()->json([
            'users' => [
                'total' => User::count(),
                'citizens' => User::withRole(User::ROLE_CITIZEN)->count(),
                'workers' => User::withRole(User::ROLE_WORKER)->count(),
                'admins' => User::withRole(User::ROLE_ADMIN)->count(),
            ],
            'issues' => [
                'total' => Issue::count(),
                'pending' => Issue::where('status', 'pending')->count(),
                'in_progress' => Issue::where('status', 'in_progress')->count(),
                'resolved' => Issue::where('status', 'resolved')->count(),
                'rejected' => Issue::where('status', 'rejected')->count(),
                'unassigned' => Issue::whereNull('assigned_to')->count(),
            ],
        ]);
    }

    public function issueStatus()
    {
        return response()->json([
            'data' => $this->countIssuesBy('status', ['pending', 'in_progress', 'resolved', 'rejected']),
        ]);
    }

    public function issueCategories()
    {
        return response()->json([
            'data' => $this->countIssuesBy('category', Issue::CATEGORIES),
        ]);
    }

    public function issuePriorities()
    {
        return response()->json([
            'data' => $this->countIssuesBy('priority', ['low', 'medium', 'high', 'critical']),
        ]);
    }

    public function issueTrend()
    {
        $startDate = now()->subDays(13)->startOfDay();

        $rows = Issue::query()
            ->selectRaw('DATE(created_at) as report_date, COUNT(*) as total')
            ->where('created_at', '>=', $startDate)
            ->groupBy('report_date')
            ->orderBy('report_date')
            ->pluck('total', 'report_date');

        $data = collect(range(0, 13))->map(function (int $daysAgo) use ($rows) {
            $date = $this->dateExpression(now()->subDays(13 - $daysAgo));

            return [
                'date' => $date,
                'total' => (int) ($rows[$date] ?? 0),
            ];
        });

        return response()->json(['data' => $data]);
    }

    public function recentIssues()
    {
        $issues = Issue::query()
            ->with(['user:id,name,email,role,phone', 'assignee:id,name,email,role,phone'])
            ->latest()
            ->limit(10)
            ->get();

        return response()->json(['data' => $issues]);
    }

    public function recentUsers()
    {
        $users = User::query()
            ->with('roles')
            ->select(['id', 'name', 'email', 'role', 'phone', 'city', 'created_at'])
            ->latest()
            ->limit(10)
            ->get();

        return response()->json(['data' => $users]);
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

    private function dateExpression(Carbon $date): string
    {
        return $date->toDateString();
    }
}
