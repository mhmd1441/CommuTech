<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>CommuTech Dashboard</title>
    <style>
        :root {
            --bg: #050607;
            --sidebar: #090a0b;
            --panel: #17191c;
            --panel-2: #202327;
            --line: #2b3036;
            --text: #f8fafc;
            --muted: #909bad;
            --blue: #1291ff;
            --green: #42d392;
            --orange: #f4a340;
            --red: #ef5350;
            --cyan: #5de7f1;
        }

        * {
            box-sizing: border-box;
        }

        body {
            margin: 0;
            min-height: 100vh;
            background: var(--bg);
            color: var(--text);
            font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        }

        .app {
            min-height: 100vh;
            display: grid;
            grid-template-columns: 240px 1fr;
        }

        .sidebar {
            border-right: 1px solid var(--line);
            background: var(--sidebar);
            padding: 24px 16px;
            display: flex;
            flex-direction: column;
            gap: 24px;
        }

        .profile {
            display: flex;
            align-items: center;
            gap: 12px;
        }

        .avatar {
            width: 42px;
            height: 42px;
            border-radius: 50%;
            background: radial-gradient(circle at 30% 20%, #ffffff, #72efff 30%, #7c5cff 67%, #101214 100%);
            flex: 0 0 auto;
        }

        .profile strong {
            display: block;
            font-size: 14px;
        }

        .profile span {
            display: block;
            color: var(--muted);
            font-size: 12px;
            margin-top: 2px;
        }

        .nav {
            display: grid;
            gap: 8px;
        }

        .nav a,
        .logout-button {
            min-height: 42px;
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 0 12px;
            border: 0;
            color: var(--text);
            background: transparent;
            text-decoration: none;
            font-weight: 800;
            font-size: 13px;
            width: 100%;
            cursor: pointer;
            text-align: left;
        }

        .nav a.active {
            background: var(--panel-2);
        }

        .sidebar-bottom {
            margin-top: auto;
            display: grid;
            gap: 8px;
            color: var(--muted);
            font-size: 12px;
        }

        .main {
            padding: 28px;
            overflow: hidden;
        }

        .topbar {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 18px;
            margin-bottom: 24px;
        }

        h1 {
            font-size: 28px;
            margin: 0;
        }

        .sub {
            margin: 6px 0 0;
            color: var(--muted);
            font-weight: 700;
        }

        .actions {
            display: flex;
            gap: 10px;
            align-items: center;
            justify-content: flex-end;
            flex-wrap: wrap;
        }

        .pill {
            min-height: 38px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            padding: 0 14px;
            background: var(--panel-2);
            border: 1px solid var(--line);
            color: var(--text);
            font-size: 13px;
            font-weight: 900;
        }

        .range-form {
            display: flex;
            gap: 8px;
            align-items: center;
            justify-content: flex-end;
            flex-wrap: wrap;
        }

        .range-form select,
        .range-form input {
            min-height: 38px;
            border: 1px solid var(--line);
            background: #0d0f11;
            color: var(--text);
            padding: 0 10px;
            font: inherit;
            font-size: 13px;
            font-weight: 800;
            outline: none;
        }

        .range-form select {
            width: 190px;
        }

        .range-form input {
            width: 140px;
        }

        .range-form button {
            border: 1px solid var(--blue);
            background: var(--blue);
            color: #fff;
            cursor: pointer;
        }

        .grid-cards {
            display: grid;
            grid-template-columns: repeat(4, minmax(0, 1fr));
            gap: 14px;
        }

        .card,
        .chart-card,
        .table-card {
            border: 1px solid var(--line);
            background: var(--panel);
        }

        .card {
            padding: 18px;
            min-height: 104px;
        }

        .label {
            color: var(--muted);
            font-size: 12px;
            font-weight: 900;
        }

        .value {
            margin-top: 12px;
            font-size: 28px;
            font-weight: 950;
        }

        .delta {
            display: inline-block;
            margin-top: 10px;
            color: var(--green);
            background: rgba(66, 211, 146, .12);
            padding: 5px 8px;
            font-size: 12px;
            font-weight: 900;
        }

        .dashboard-grid {
            margin-top: 14px;
            display: grid;
            grid-template-columns: 1.2fr .8fr;
            gap: 14px;
        }

        .chart-card,
        .table-card {
            padding: 18px;
        }

        .section-head {
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: 12px;
            margin-bottom: 14px;
        }

        h2 {
            font-size: 16px;
            margin: 0;
        }

        .bars {
            height: 220px;
            display: grid;
            grid-template-columns: repeat(14, 1fr);
            align-items: end;
            gap: 10px;
            border-top: 1px solid var(--line);
            border-bottom: 1px solid var(--line);
            padding-top: 12px;
            padding-bottom: 26px;
            position: relative;
        }

        .bar-wrap {
            height: 100%;
            display: flex;
            align-items: end;
            position: relative;
        }

        .bar {
            width: 100%;
            min-height: 4px;
            background: var(--blue);
        }

        .bar-label {
            position: absolute;
            left: 50%;
            bottom: -22px;
            transform: translateX(-50%);
            color: var(--muted);
            font-size: 10px;
            white-space: nowrap;
        }

        .stack {
            display: grid;
            gap: 12px;
        }

        .metric-row {
            display: grid;
            grid-template-columns: 112px 1fr 44px;
            align-items: center;
            gap: 10px;
            color: var(--muted);
            font-size: 12px;
            font-weight: 900;
        }

        .track {
            height: 10px;
            background: #0c0d0f;
            border: 1px solid var(--line);
        }

        .fill {
            height: 100%;
            background: var(--cyan);
        }

        .fill.green {
            background: var(--green);
        }

        .fill.orange {
            background: var(--orange);
        }

        .fill.red {
            background: var(--red);
        }

        .tables {
            margin-top: 14px;
            display: grid;
            grid-template-columns: 1.15fr .85fr;
            gap: 14px;
        }

        table {
            width: 100%;
            border-collapse: collapse;
        }

        th,
        td {
            padding: 13px 10px;
            text-align: left;
            border-bottom: 1px solid var(--line);
            font-size: 13px;
            vertical-align: middle;
        }

        th {
            color: var(--muted);
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: .04em;
        }

        td {
            color: var(--text);
            font-weight: 700;
        }

        .muted {
            color: var(--muted);
            font-weight: 700;
            font-size: 12px;
        }

        .tag {
            display: inline-flex;
            min-height: 24px;
            align-items: center;
            padding: 0 8px;
            background: var(--panel-2);
            border: 1px solid var(--line);
            color: var(--text);
            font-size: 11px;
            font-weight: 900;
        }

        .tag.blue {
            color: #9bd4ff;
            background: rgba(18, 145, 255, .12);
        }

        .tag.green {
            color: #9df0c8;
            background: rgba(66, 211, 146, .12);
        }

        .tag.orange {
            color: #ffd09a;
            background: rgba(244, 163, 64, .12);
        }

        .tag.red {
            color: #ffb2af;
            background: rgba(239, 83, 80, .12);
        }

        @media (max-width: 1100px) {
            .app {
                grid-template-columns: 1fr;
            }

            .sidebar {
                display: none;
            }

            .grid-cards,
            .dashboard-grid,
            .tables {
                grid-template-columns: 1fr;
            }
        }
    </style>
</head>
<body>
@php
    $maxTrend = max(1, collect($trend)->max('total'));
    $maxStatus = max(1, collect($statusCounts)->max('total'));
    $maxCategory = max(1, collect($categoryCounts)->max('total'));
    $trendLabelEvery = max(1, (int) ceil(max(1, count($trend)) / 8));

    $dashboardTagClass = function ($value) {
        return match ($value) {
            'resolved', 'citizen' => 'green',
            'in_progress', 'worker' => 'orange',
            'under_investigation' => 'orange',
            'rejected' => 'red',
            default => 'blue',
        };
    };
@endphp
<div class="app">
    <aside class="sidebar">
        <div class="profile">
            <div class="avatar"></div>
            <div>
                <strong>{{ auth()->user()->name }}</strong>
                <span>Administrator</span>
            </div>
        </div>

        <nav class="nav">
            <a href="{{ route('admin.dashboard') }}" class="active">Dashboard</a>
            <a href="{{ route('admin.reports.index') }}">Reports</a>
            <a href="{{ route('admin.workers.index') }}">Workers</a>
            <a href="{{ route('admin.citizens.index') }}">Citizens</a>
            <a href="{{ route('admin.admins.index') }}">Admins</a>
        </nav>

        <div class="sidebar-bottom">
            <span>CommuTech Control Center</span>
            <form method="POST" action="{{ route('admin.logout') }}">
                @csrf
                <button class="logout-button" type="submit">Log out</button>
            </form>
        </div>
    </aside>

    <main class="main">
        <header class="topbar">
            <div>
                <h1>Good morning, {{ explode(' ', auth()->user()->name)[0] }}</h1>
                <p class="sub">Live overview of community reports, workers, citizens, and response activity.</p>
            </div>
            <div class="actions">
                <form class="range-form" method="GET" action="{{ route('admin.dashboard') }}">
                    <select name="range" aria-label="Dashboard date range">
                        @foreach ($dateRange['options'] as $value => $label)
                            <option value="{{ $value }}" @selected($dateRange['preset'] === $value)>{{ $label }}</option>
                        @endforeach
                    </select>
                    <input name="from" type="date" value="{{ $dateRange['from'] }}" aria-label="Start date" data-custom-date>
                    <input name="to" type="date" value="{{ $dateRange['to'] }}" aria-label="End date" data-custom-date>
                    <button class="pill" type="submit">Apply</button>
                </form>
                <span class="pill">{{ now()->format('M d, Y') }}</span>
            </div>
        </header>

        <section class="grid-cards">
            <article class="card">
                <div class="label">Total Reports</div>
                <div class="value">{{ number_format($summary['totalIssues']) }}</div>
                <span class="delta">{{ number_format($summary['pendingIssues']) }} pending</span>
            </article>
            <article class="card">
                <div class="label">In Progress</div>
                <div class="value">{{ number_format($summary['inProgressIssues']) }}</div>
                <span class="delta">{{ number_format($summary['unassignedIssues']) }} unassigned</span>
            </article>
            <article class="card">
                <div class="label">Resolved</div>
                <div class="value">{{ number_format($summary['resolvedIssues']) }}</div>
                <span class="delta">Community impact</span>
            </article>
            <article class="card">
                <div class="label">People</div>
                <div class="value">{{ number_format($summary['totalUsers']) }}</div>
                <span class="delta">{{ number_format($summary['workers']) }} workers</span>
            </article>
        </section>

        <section class="dashboard-grid">
            <article class="chart-card">
                <div class="section-head">
                    <h2>Reports Trend</h2>
                    <span class="muted">{{ $dateRange['label'] }}</span>
                </div>
                <div class="bars" style="grid-template-columns: repeat({{ max(1, count($trend)) }}, minmax(8px, 1fr));">
                    @foreach ($trend as $point)
                        <div class="bar-wrap" title="{{ $point['label'] }}: {{ $point['total'] }}">
                            <div class="bar" style="height: {{ max(4, ($point['total'] / $maxTrend) * 100) }}%;"></div>
                            <span class="bar-label">
                                {{ $loop->first || $loop->last || $loop->iteration % $trendLabelEvery === 0 ? $point['axis_label'] : '' }}
                            </span>
                        </div>
                    @endforeach
                </div>
            </article>

            <article class="chart-card">
                <div class="section-head">
                    <h2>Reports By Status</h2>
                    <span class="muted">Operations</span>
                </div>
                <div class="stack">
                    @foreach ($statusCounts as $item)
                        <div class="metric-row">
                            <span>{{ str_replace('_', ' ', $item['label']) }}</span>
                            <div class="track">
                                <div class="fill {{ $dashboardTagClass($item['label']) }}" style="width: {{ ($item['total'] / $maxStatus) * 100 }}%;"></div>
                            </div>
                            <strong>{{ $item['total'] }}</strong>
                        </div>
                    @endforeach
                </div>

                <div class="section-head" style="margin-top: 24px;">
                    <h2>Categories</h2>
                    <span class="muted">Demand</span>
                </div>
                <div class="stack">
                    @foreach ($categoryCounts as $item)
                        <div class="metric-row">
                            <span>{{ $item['label'] }}</span>
                            <div class="track">
                                <div class="fill" style="width: {{ ($item['total'] / $maxCategory) * 100 }}%;"></div>
                            </div>
                            <strong>{{ $item['total'] }}</strong>
                        </div>
                    @endforeach
                </div>
            </article>
        </section>

        <section class="tables">
            <article class="table-card">
                <div class="section-head">
                    <h2>Recent Reports</h2>
                    <span class="muted">{{ $summary['totalIssues'] }} in range</span>
                </div>
                <table>
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Report</th>
                            <th>Citizen</th>
                            <th>Status</th>
                            <th>Priority</th>
                        </tr>
                    </thead>
                    <tbody>
                        @forelse ($recentIssues as $issue)
                            <tr>
                                <td>#{{ $issue->id }}</td>
                                <td>
                                    {{ $issue->title }}
                                    <div class="muted">{{ $issue->category }} | {{ $issue->location }}</div>
                                </td>
                                <td>{{ $issue->user?->name ?? 'Unknown' }}</td>
                                <td><span class="tag {{ $dashboardTagClass($issue->status) }}">{{ str_replace('_', ' ', $issue->status) }}</span></td>
                                <td><span class="tag">{{ $issue->priority }}</span></td>
                            </tr>
                        @empty
                            <tr>
                                <td colspan="5" class="muted">No reports yet.</td>
                            </tr>
                        @endforelse
                    </tbody>
                </table>
            </article>

            <article class="table-card">
                <div class="section-head">
                    <h2>Recent Users</h2>
                    <span class="muted">{{ $summary['citizens'] }} citizens</span>
                </div>
                <table>
                    <thead>
                        <tr>
                            <th>User</th>
                            <th>Role</th>
                            <th>City</th>
                        </tr>
                    </thead>
                    <tbody>
                        @forelse ($recentUsers as $user)
                            <tr>
                                <td>
                                    {{ $user->name }}
                                    <div class="muted">{{ $user->email }}</div>
                                </td>
                                <td>
                                    @foreach ($user->role_names as $userRole)
                                        <span class="tag {{ $dashboardTagClass($userRole) }}">{{ $userRole }}</span>
                                    @endforeach
                                </td>
                                <td>{{ $user->city ?? 'N/A' }}</td>
                            </tr>
                        @empty
                            <tr>
                                <td colspan="3" class="muted">No users yet.</td>
                            </tr>
                        @endforelse
                    </tbody>
                </table>
            </article>
        </section>

        <section class="tables" style="margin-top: 14px;">
            <article class="table-card" style="grid-column: 1 / -1;">
                <div class="section-head">
                    <div>
                        <h2 style="display:flex; align-items:center; gap:8px;">
                            <span style="font-size:18px;">✦</span> AI Weekly Briefing
                        </h2>
                        <span class="muted" style="font-size:11px;">Powered by Gemini · refreshes hourly</span>
                    </div>
                    <button id="briefing-refresh" class="pill" style="font-size:12px; cursor:pointer; border:1px solid var(--line); background:var(--panel-2); color:var(--muted);">Refresh</button>
                </div>
                <div id="briefing-body" style="font-size:13px; line-height:1.75; color:var(--text); white-space:pre-wrap; min-height:60px;">
                    <span style="color:var(--muted);">Loading briefing…</span>
                </div>
            </article>
        </section>
    </main>
</div>
<script>
    document.querySelectorAll('[data-custom-date]').forEach((input) => {
        input.addEventListener('change', () => {
            document.querySelector('[name="range"]').value = 'custom';
        });
    });

    function loadBriefing(refresh) {
        const el = document.getElementById('briefing-body');
        const btn = document.getElementById('briefing-refresh');
        el.innerHTML = '<span style="color:var(--muted);">Loading briefing…</span>';
        btn.disabled = true;

        const url = '{{ route("admin.ai-briefing") }}' + (refresh ? '?refresh=1' : '');
        fetch(url, { headers: { 'X-Requested-With': 'XMLHttpRequest' } })
            .then(r => r.json())
            .then(data => {
                if (data.briefing) {
                    el.textContent = data.briefing;
                } else if (data.error === 'not_configured') {
                    el.innerHTML = '<span style="color:var(--muted);">Add GEMINI_API_KEY to your .env to enable this feature.</span>';
                } else {
                    el.innerHTML = '<span style="color:var(--muted);">Briefing unavailable — Gemini API did not respond.</span>';
                }
            })
            .catch(() => {
                el.innerHTML = '<span style="color:var(--muted);">Could not load briefing.</span>';
            })
            .finally(() => { btn.disabled = false; });
    }

    document.getElementById('briefing-refresh').addEventListener('click', function () {
        loadBriefing(true);
    });

    loadBriefing(false);
</script>
</body>
</html>
