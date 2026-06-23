<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>@yield('title', 'CommuTech Admin')</title>
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

        * { box-sizing: border-box; }

        body {
            margin: 0;
            min-height: 100vh;
            background: var(--bg);
            color: var(--text);
            font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        }

        a { color: inherit; }

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
            position: sticky;
            top: 0;
            height: 100vh;
            overflow-y: auto;
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

        .profile strong { display: block; font-size: 14px; }
        .profile span { display: block; color: var(--muted); font-size: 12px; margin-top: 2px; }

        .nav { display: grid; gap: 8px; }

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

        .nav a.active { background: var(--panel-2); }

        .sidebar-bottom {
            margin-top: auto;
            display: grid;
            gap: 8px;
            color: var(--muted);
            font-size: 12px;
        }

        .main {
            padding: 28px;
            overflow-x: hidden;
        }

        .topbar {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 18px;
            margin-bottom: 24px;
        }

        h1 { font-size: 28px; margin: 0; }
        .sub { margin: 6px 0 0; color: var(--muted); font-weight: 700; }

        .button,
        button.button {
            min-height: 38px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            padding: 0 14px;
            border: 1px solid var(--line);
            background: var(--panel-2);
            color: var(--text);
            text-decoration: none;
            font-size: 13px;
            font-weight: 900;
            cursor: pointer;
        }

        .button.primary { background: var(--blue); border-color: var(--blue); color: #fff; }
        .button.danger { background: rgba(239, 83, 80, .12); border-color: rgba(239, 83, 80, .35); color: #ffb2af; }

        .panel {
            border: 1px solid var(--line);
            background: var(--panel);
            padding: 18px;
        }

        .filters {
            display: grid;
            grid-template-columns: 1fr 180px 180px auto;
            gap: 10px;
            margin-bottom: 14px;
        }

        input,
        select,
        textarea {
            width: 100%;
            border: 1px solid var(--line);
            background: #0d0f11;
            color: var(--text);
            padding: 0 12px;
            min-height: 42px;
            outline: none;
            font: inherit;
        }

        textarea { min-height: 130px; padding-top: 12px; resize: vertical; }
        input:focus, select:focus, textarea:focus { border-color: var(--blue); }
        label { display: block; color: var(--muted); font-size: 12px; font-weight: 900; margin-bottom: 8px; }

        .form-grid {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 14px;
        }

        .full { grid-column: 1 / -1; }

        table {
            width: 100%;
            border-collapse: collapse;
        }

        th, td {
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

        td { color: var(--text); font-weight: 700; }
        .muted { color: var(--muted); font-weight: 700; font-size: 12px; }

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

        .tag.blue { color: #9bd4ff; background: rgba(18, 145, 255, .12); }
        .tag.green { color: #9df0c8; background: rgba(66, 211, 146, .12); }
        .tag.orange { color: #ffd09a; background: rgba(244, 163, 64, .12); }
        .tag.red { color: #ffb2af; background: rgba(239, 83, 80, .12); }

        .row-actions {
            display: flex;
            gap: 8px;
            align-items: center;
        }

        .notice {
            margin-bottom: 14px;
            border: 1px solid rgba(66, 211, 146, .35);
            background: rgba(66, 211, 146, .1);
            color: #b8f5d8;
            padding: 12px;
            font-weight: 800;
        }

        .error {
            margin-bottom: 14px;
            border: 1px solid rgba(239, 83, 80, .4);
            background: rgba(239, 83, 80, .1);
            color: #ffb2af;
            padding: 12px;
            font-weight: 800;
        }

        .pagination {
            margin-top: 16px;
            color: var(--muted);
            font-size: 12px;
        }

        .pagination nav {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 12px;
            flex-wrap: wrap;
        }

        .pagination nav > div:first-child {
            display: none;
        }

        .pagination nav > div:last-child {
            width: 100%;
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 12px;
            flex-wrap: wrap;
        }

        .pagination p {
            margin: 0;
            color: var(--muted);
            font-size: 12px;
            font-weight: 800;
        }

        .pagination span,
        .pagination a {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            min-width: 34px;
            height: 34px;
            padding: 0 10px;
            border: 1px solid var(--line);
            background: var(--panel-2);
            color: var(--text);
            text-decoration: none;
            font-size: 12px;
            font-weight: 900;
        }

        .pagination a:hover {
            border-color: var(--blue);
            color: #9bd4ff;
        }

        .pagination [aria-current="page"] span,
        .pagination span[aria-current="page"] {
            background: var(--blue);
            border-color: var(--blue);
            color: #fff;
        }

        .pagination [aria-disabled="true"] span,
        .pagination span[aria-disabled="true"] {
            opacity: .45;
        }

        .pagination svg {
            width: 14px;
            height: 14px;
            display: block;
        }

        @media (max-width: 1100px) {
            .app { grid-template-columns: 1fr; }
            .sidebar { display: none; }
            .filters, .form-grid { grid-template-columns: 1fr; }
        }
    </style>
</head>
<body>
@php
    $fundingRequestCount = \App\Models\Issue::where('funding_status', 'requested')->count();

    $tagClass = function ($value) {
        return match ($value) {
            'resolved', 'citizen' => 'green',
            'in_progress', 'worker' => 'orange',
            'under_investigation' => 'orange',
            'rejected', 'admin' => 'red',
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
            <a href="{{ route('admin.dashboard') }}" class="{{ request()->routeIs('admin.dashboard') ? 'active' : '' }}">Dashboard</a>
            <a href="{{ route('admin.reports.index') }}" class="{{ request()->routeIs('admin.reports.*') && request('funding_status') !== 'requested' ? 'active' : '' }}">Reports</a>
            <a href="{{ route('admin.reports.index', ['funding_status' => 'requested']) }}" class="{{ request()->routeIs('admin.reports.index') && request('funding_status') === 'requested' ? 'active' : '' }}">
                Funding Requests
                @if ($fundingRequestCount > 0)
                    <span class="tag orange" style="margin-left:auto;">{{ $fundingRequestCount }}</span>
                @endif
            </a>
            <a href="{{ route('admin.chat.index') }}" class="{{ request()->routeIs('admin.chat.*') ? 'active' : '' }}">
                Messages
                @php $unreadMsgs = \App\Models\Conversation::where('unread_count_admin', '>', 0)->count(); @endphp
                @if ($unreadMsgs > 0)
                    <span class="tag orange" style="margin-left:auto;">{{ $unreadMsgs }}</span>
                @endif
            </a>
            <a href="{{ route('admin.workers.index') }}" class="{{ request()->routeIs('admin.workers.*') || request('role') === 'worker' ? 'active' : '' }}">Workers</a>
            <a href="{{ route('admin.citizens.index') }}" class="{{ request('role') === 'citizen' ? 'active' : '' }}">Citizens</a>
            <a href="{{ route('admin.admins.index') }}" class="{{ request('role') === 'admin' ? 'active' : '' }}">Admins</a>
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
                <h1>@yield('page_title')</h1>
                <p class="sub">@yield('page_subtitle')</p>
            </div>
            <div>
                @yield('page_actions')
            </div>
        </header>

        @if (session('status'))
            <div class="notice">{{ session('status') }}</div>
        @endif

        @if ($errors->any())
            <div class="error">{{ $errors->first() }}</div>
        @endif

        @yield('content')
    </main>
</div>
@stack('scripts')
</body>
</html>
