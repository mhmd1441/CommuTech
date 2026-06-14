@extends('admin.panel')

@section('title', $worker->name.' | Worker Analytics')
@section('page_title', $worker->name)
@section('page_subtitle', 'Worker activity, workload, and report history.')
@section('page_actions')
    <div class="row-actions">
        <a class="button" href="{{ route('admin.workers.index') }}">Back to Workers</a>
        <a class="button primary" href="{{ route('admin.users.edit', $worker) }}">Edit Worker</a>
    </div>
@endsection

@section('content')
    @php
        $tagClass = function ($value) {
            return match ($value) {
                'resolved', 'citizen' => 'green',
                'in_progress', 'worker' => 'orange',
                'under_investigation' => 'orange',
                'rejected', 'admin' => 'red',
                default => 'blue',
            };
        };

        $priorityOrder = ['critical', 'high', 'medium', 'low'];
        $statusTotal = max(1, $totalReports);
    @endphp

    <style>
        .analytics-grid { display: grid; grid-template-columns: 1.35fr .65fr; gap: 14px; }
        .metric-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; margin-bottom: 14px; }
        .metric { border: 1px solid var(--line); background: var(--panel); padding: 16px; }
        .metric span { display: block; color: var(--muted); font-size: 11px; font-weight: 900; text-transform: uppercase; }
        .metric strong { display: block; margin-top: 10px; font-size: 24px; }
        .card { border: 1px solid var(--line); background: var(--panel); padding: 18px; }
        .card h2 { margin: 0 0 14px; font-size: 17px; }
        .stack { display: grid; gap: 14px; }
        .kv { border-bottom: 1px solid var(--line); padding: 0 0 11px; margin-bottom: 11px; }
        .kv span { display: block; color: var(--muted); font-size: 11px; font-weight: 900; text-transform: uppercase; }
        .kv strong { display: block; margin-top: 6px; font-size: 13px; line-height: 1.5; }
        .bar-row { display: grid; gap: 7px; margin-bottom: 12px; }
        .bar-label { display: flex; justify-content: space-between; color: var(--muted); font-size: 12px; font-weight: 900; }
        .bar-track { height: 9px; background: #0d0f11; border: 1px solid var(--line); overflow: hidden; }
        .bar-fill { height: 100%; background: var(--blue); }
        .note { color: var(--muted); font-size: 12px; font-weight: 700; line-height: 1.6; margin-top: 10px; }
        .range-card { margin-bottom: 14px; display: flex; align-items: center; justify-content: space-between; gap: 14px; flex-wrap: wrap; }
        .range-title { display: grid; gap: 4px; }
        .range-title strong { font-size: 15px; }
        .range-title span { color: var(--muted); font-size: 12px; font-weight: 800; }
        .range-tabs { display: flex; gap: 8px; flex-wrap: wrap; }
        .range-tabs a { min-height: 34px; display: inline-flex; align-items: center; padding: 0 12px; border: 1px solid var(--line); background: var(--panel-2); color: var(--text); text-decoration: none; font-size: 12px; font-weight: 900; }
        .range-tabs a.active { border-color: var(--blue); background: var(--blue); color: #fff; }
        @media (max-width: 1100px) { .analytics-grid, .metric-grid { grid-template-columns: 1fr; } }
    </style>


    <section class="card range-card">
        <div class="range-title">
            <strong>{{ $rangeLabel }} Analytics</strong>
            <span>Shown only after opening this worker profile.</span>
        </div>
        <div class="range-tabs">
            @foreach ($rangeOptions as $rangeKey => $rangeName)
                <a class="{{ $range === $rangeKey ? 'active' : '' }}" href="{{ route('admin.workers.show', ['worker' => $worker, 'range' => $rangeKey]) }}">{{ $rangeName }}</a>
            @endforeach
        </div>
    </section>
    <div class="metric-grid">
        <div class="metric"><span>Reports in range</span><strong>{{ $totalReports }}</strong></div>
        <div class="metric"><span>Active in range</span><strong>{{ $activeReports }}</strong></div>
        <div class="metric"><span>Resolved in range</span><strong>{{ $resolvedReports }}</strong></div>
        <div class="metric"><span>Avg resolution</span><strong>{{ $averageResolutionHours ? $averageResolutionHours.'h' : 'N/A' }}</strong></div>
    </div>

    <div class="metric-grid">
        <div class="metric"><span>Resolved today</span><strong>{{ $resolvedToday }}</strong></div>
        <div class="metric"><span>Resolved this week</span><strong>{{ $resolvedThisWeek }}</strong></div>
        <div class="metric"><span>Resolved this month</span><strong>{{ $resolvedThisMonth }}</strong></div>
        <div class="metric"><span>Under review</span><strong>{{ $underInvestigationReports }}</strong></div>
    </div>

    <div class="analytics-grid">
        <div class="stack">
            <section class="card">
                <h2>{{ $dailyActivityTitle }}</h2>
                <table>
                    <thead>
                        <tr>
                            <th>Day</th>
                            <th>New Work</th>
                            <th>Resolved</th>
                        </tr>
                    </thead>
                    <tbody>
                        @foreach ($dailyActivity as $day)
                            <tr>
                                <td>{{ $day['label'] }}</td>
                                <td>{{ $day['new_work'] }}</td>
                                <td>{{ $day['resolved'] }}</td>
                            </tr>
                        @endforeach
                    </tbody>
                </table>
            </section>

            <section class="card">
                <h2>{{ $weeklyActivityTitle }}</h2>
                <table>
                    <thead>
                        <tr>
                            <th>Week</th>
                            <th>New Work</th>
                            <th>Resolved</th>
                        </tr>
                    </thead>
                    <tbody>
                        @foreach ($weeklyActivity as $week)
                            <tr>
                                <td>{{ $week['label'] }}</td>
                                <td>{{ $week['new_work'] }}</td>
                                <td>{{ $week['resolved'] }}</td>
                            </tr>
                        @endforeach
                    </tbody>
                </table>
            </section>

            <section class="card">
                <h2>Reports Worked On</h2>
                <table>
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Report</th>
                            <th>Citizen</th>
                            <th>Status</th>
                            <th>Priority</th>
                            <th>Updated</th>
                        </tr>
                    </thead>
                    <tbody>
                        @forelse ($recentReports as $report)
                            <tr>
                                <td>#{{ $report->id }}</td>
                                <td>
                                    <a href="{{ route('admin.reports.show', $report) }}" style="font-weight:900;color:#9bd4ff;text-decoration:none;">{{ $report->title }}</a>
                                    <div class="muted">{{ $report->location }}</div>
                                </td>
                                <td>{{ $report->user?->name ?? 'Unknown' }}</td>
                                <td><span class="tag {{ $tagClass($report->status) }}">{{ str_replace('_', ' ', $report->status) }}</span></td>
                                <td><span class="tag">{{ $report->priority }}</span></td>
                                <td>{{ $report->updated_at?->format('M j, Y') ?? 'N/A' }}</td>
                            </tr>
                        @empty
                            <tr><td colspan="6" class="muted">This worker has no assigned reports yet.</td></tr>
                        @endforelse
                    </tbody>
                </table>
                <p class="note">The selected range uses report creation, updates, and resolution dates. Resolution timing still uses report submission to resolution because the current database does not store a separate assignment timestamp.</p>
            </section>
        </div>

        <aside class="stack">
            <section class="card">
                <h2>Worker Profile</h2>
                <div class="kv"><span>Email</span><strong>{{ $worker->email }}</strong></div>
                <div class="kv"><span>Phone</span><strong>{{ $worker->phone ?? 'N/A' }}</strong></div>
                <div class="kv"><span>City</span><strong>{{ $worker->city ?? 'N/A' }}</strong></div>
                <div class="kv"><span>Municipality</span><strong>{{ $worker->assigned_municipality ?? 'N/A' }}</strong></div>
                <div class="kv"><span>Verified</span><strong>{{ $worker->is_verified ? 'Yes' : 'No' }}</strong></div>
                <div class="kv">
                    <span>Roles</span>
                    <strong>
                        @foreach ($worker->role_names as $workerRole)
                            <span class="tag {{ $tagClass($workerRole) }}">{{ $workerRole }}</span>
                        @endforeach
                    </strong>
                </div>
            </section>

            <section class="card">
                <h2>Status Breakdown</h2>
                @foreach (\App\Models\Issue::STATUSES as $statusName)
                    @php $count = $statusCounts[$statusName] ?? 0; @endphp
                    <div class="bar-row">
                        <div class="bar-label"><span>{{ str_replace('_', ' ', ucfirst($statusName)) }}</span><span>{{ $count }}</span></div>
                        <div class="bar-track"><div class="bar-fill" style="width: {{ min(100, round(($count / $statusTotal) * 100)) }}%;"></div></div>
                    </div>
                @endforeach
            </section>

            <section class="card">
                <h2>Priority Load</h2>
                @foreach ($priorityOrder as $priorityName)
                    @php $count = $priorityCounts[$priorityName] ?? 0; @endphp
                    <div class="bar-row">
                        <div class="bar-label"><span>{{ ucfirst($priorityName) }}</span><span>{{ $count }}</span></div>
                        <div class="bar-track"><div class="bar-fill" style="width: {{ min(100, round(($count / $statusTotal) * 100)) }}%; background: {{ in_array($priorityName, ['critical', 'high']) ? 'var(--orange)' : 'var(--blue)' }};"></div></div>
                    </div>
                @endforeach
            </section>
        </aside>
    </div>
@endsection
