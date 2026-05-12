@extends('admin.panel')

@section('title', 'Reports | CommuTech Admin')
@section('page_title', 'Reports')
@section('page_subtitle', 'Review, assign, update, and delete community reports.')
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
        <form class="filters" method="GET" action="{{ route('admin.reports.index') }}">
            <input name="search" value="{{ $search }}" placeholder="Search by title, location, or description">
            <select name="status">
                <option value="">All statuses</option>
                @foreach (\App\Models\Issue::STATUSES as $item)
                    <option value="{{ $item }}" @selected($status === $item)>{{ str_replace('_', ' ', ucfirst($item)) }}</option>
                @endforeach
            </select>
            <select name="category">
                <option value="">All categories</option>
                @foreach ($categories as $item)
                    <option value="{{ $item }}" @selected($category === $item)>{{ $item }}</option>
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
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
                @forelse ($reports as $report)
                    <tr>
                        <td>#{{ $report->id }}</td>
                        <td>
                            {{ $report->title }}
                            <div class="muted">{{ $report->category }} | {{ $report->location }}</div>
                        </td>
                        <td>{{ $report->user?->name ?? 'Unknown' }}</td>
                        <td>{{ $report->assignee?->name ?? 'Unassigned' }}</td>
                        <td><span class="tag {{ $tagClass($report->status) }}">{{ str_replace('_', ' ', $report->status) }}</span></td>
                        <td><span class="tag">{{ $report->priority }}</span></td>
                        <td>
                            <div class="row-actions">
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
                        <td colspan="7" class="muted">No reports found.</td>
                    </tr>
                @endforelse
            </tbody>
        </table>

        <div class="pagination">{{ $reports->links() }}</div>
    </section>
@endsection
