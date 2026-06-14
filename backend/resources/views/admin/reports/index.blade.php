@extends('admin.panel')

@section('title', 'Reports | CommuTech Admin')
@section('page_title', 'Reports')
@section('page_subtitle', 'Review, inspect, assign, update, and delete community reports.')
@section('page_actions')
<a class="button primary" href="{{ route('admin.reports.create') }}">Create Report</a>
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
@endphp

<section class="panel">
    @if ($slaBreachedCount > 0)
    <div style="margin-bottom: 10px;">
        <a href="{{ route('admin.reports.index', ['sla' => 'breached']) }}"
            style="display:inline-flex;align-items:center;gap:8px;background:#FEF2F2;border:1px solid #FECACA;color:#B91C1C;padding:8px 16px;border-radius:8px;font-weight:700;font-size:13px;text-decoration:none;">
            {{ $slaBreachedCount }} overdue report{{ $slaBreachedCount > 1 ? 's' : '' }} - SLA breached
        </a>
    </div>
    @endif

    @if ($underInvestigationCount > 0)
    <div style="margin-bottom: 14px;">
        <a href="{{ route('admin.reports.index', ['status' => 'under_investigation']) }}"
            style="display:inline-flex;align-items:center;gap:8px;background:#FEF3C7;border:1px solid #F59E0B;color:#92400E;padding:8px 16px;border-radius:8px;font-weight:700;font-size:13px;text-decoration:none;">
            {{ $underInvestigationCount }} report{{ $underInvestigationCount > 1 ? 's' : '' }} under investigation - requires admin review
        </a>
    </div>
    @endif

    <form class="filters" method="GET" action="{{ route('admin.reports.index') }}" style="grid-template-columns: 1fr 240px 180px 220px auto;">
        <input name="search" value="{{ $search }}" placeholder="Search by title, location, or description">
        <div style="position:relative;">
            <input list="municipalities-list" name="municipality" value="{{ $municipality }}" placeholder="Search municipality">
            <datalist id="municipalities-list">
                @foreach ($municipalities as $item)
                <option value="{{ $item }}"></option>
                @endforeach
            </datalist>
        </div>
        <select name="status">
            <option value="">All statuses</option>
            @foreach (\App\Models\Issue::STATUSES as $item)
            <option value="{{ $item }}" @selected($status===$item)>{{ str_replace('_', ' ', ucfirst($item)) }}</option>
            @endforeach
        </select>
        <select name="category">
            <option value="">All categories</option>
            @foreach ($categories as $item)
            <option value="{{ $item }}" @selected($category===$item)>{{ $item }}</option>
            @endforeach
        </select>
        <button class="button" type="submit">Filter</button>
    </form>

    <table>
        <thead>
            <tr>
                <th>ID</th>
                <th>Report</th>
                <th>Citizen</th>
                <th>Worker</th>
                <th>Status</th>
                <th>Priority</th>
                <th>SLA</th>
                <th>Actions</th>
            </tr>
        </thead>
        <tbody>
            @forelse ($reports as $report)
            <tr>
                <td>#{{ $report->id }}</td>
                <td>
                    <a href="{{ route('admin.reports.show', $report) }}" style="font-weight:900;text-decoration:none;color:#9bd4ff;">
                        {{ $report->title }}
                    </a>
                    <div class="muted">{{ $report->category }} | {{ $report->location }}</div>
                </td>
                <td>{{ $report->user?->name ?? 'Unknown' }}</td>
                <td>
                    @if ($report->assignee)
                    <a href="{{ route('admin.workers.show', $report->assignee) }}" style="text-decoration:none;color:#ffd09a;">
                        {{ $report->assignee->name }}
                    </a>
                    @else
                    <span class="muted">Unassigned</span>
                    @endif
                </td>
                <td><span class="tag {{ $tagClass($report->status) }}">{{ str_replace('_', ' ', $report->status) }}</span></td>
                <td><span class="tag">{{ $report->priority }}</span></td>
                <td>
                    @if (in_array($report->status, ['resolved', 'rejected']))
                    <span class="tag green">Closed</span>
                    @elseif ($report->sla_breached)
                    <span class="tag red">Breached</span>
                    @elseif ($report->due_at)
                    @php $hoursLeft = now()->diffInHours($report->due_at, false); @endphp
                    @if ($hoursLeft < 0)
                        <span class="tag red">Overdue</span>
                        @elseif ($hoursLeft < 12)
                            <span class="tag orange">{{ $hoursLeft }}h left</span>
                            @else
                            <span class="tag">{{ round($hoursLeft / 24, 1) }}d left</span>
                            @endif
                            @else
                            <span class="tag">N/A</span>
                            @endif
                </td>
                <td>
                    <div class="row-actions">
                        <a class="button" href="{{ route('admin.reports.show', $report) }}">View</a>
                        <a class="button" href="{{ route('admin.reports.edit', $report) }}">Edit</a>
                        <form method="POST" action="{{ route('admin.reports.destroy', $report) }}" onsubmit="return confirm('Delete this report?')">
                            @csrf
                            @method('DELETE')
                            <button class="button danger" type="submit">Delete</button>
                        </form>
                    </div>
                </td>
            </tr>
            @empty
            <tr>
                <td colspan="8" class="muted">No reports found.</td>
            </tr>
            @endforelse
        </tbody>
    </table>

    <div class="pagination">{{ $reports->links() }}</div>
</section>
@endsection