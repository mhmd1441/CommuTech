@extends('admin.panel')

@section('title', 'Report #'.$report->id.' | CommuTech Admin')
@section('page_title', 'Report #'.$report->id)
@section('page_subtitle', $report->title)
@section('page_actions')
    <div class="row-actions">
        <a class="button" href="{{ route('admin.reports.index') }}">Back to Reports</a>
        <a class="button primary" href="{{ route('admin.reports.edit', $report) }}">Edit Report</a>
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

        $imageUrl = function ($url) {
            if (blank($url)) {
                return null;
            }

            if (\Illuminate\Support\Str::startsWith($url, ['http://', 'https://', '/'])) {
                return $url;
            }

            return asset('storage/'.$url);
        };

        $submittedImage = $imageUrl($report->image_url);
        $workerImage = $imageUrl($report->worker_resolution_image_url);
        $citizenImage = $imageUrl($report->citizen_resolution_image_url);
    @endphp

    <style>
        .detail-grid { display: grid; grid-template-columns: 1.45fr .75fr; gap: 14px; }
        .detail-card { border: 1px solid var(--line); background: var(--panel); padding: 18px; }
        .detail-card h2 { margin: 0 0 14px; font-size: 17px; }
        .metric-row { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; margin-bottom: 14px; }
        .metric { border: 1px solid var(--line); background: var(--panel-2); padding: 14px; }
        .metric span { display: block; color: var(--muted); font-size: 11px; font-weight: 900; text-transform: uppercase; }
        .metric strong { display: block; margin-top: 8px; font-size: 18px; }
        .kv-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
        .kv { border-bottom: 1px solid var(--line); padding-bottom: 10px; min-height: 54px; }
        .kv span { display: block; color: var(--muted); font-size: 11px; font-weight: 900; text-transform: uppercase; }
        .kv strong { display: block; margin-top: 6px; font-size: 13px; line-height: 1.5; }
        .body-copy { color: #d8dee9; line-height: 1.7; font-weight: 700; white-space: pre-wrap; }
        .media-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 14px; margin-top: 14px; }
        .media-box { border: 1px solid var(--line); background: #0d0f11; min-height: 190px; display: flex; align-items: center; justify-content: center; overflow: hidden; }
        .media-box img { width: 100%; height: 100%; object-fit: cover; display: block; }
        .timeline { display: grid; gap: 12px; }
        .timeline-item { border-left: 3px solid var(--blue); padding-left: 12px; }
        .timeline-item strong { display: block; font-size: 13px; }
        .timeline-item span { display: block; color: var(--muted); font-size: 12px; margin-top: 3px; font-weight: 700; }
        .stack { display: grid; gap: 14px; }
        @media (max-width: 1100px) { .detail-grid, .metric-row, .media-grid, .kv-grid { grid-template-columns: 1fr; } }
    </style>

    <div class="metric-row">
        <div class="metric"><span>Status</span><strong><span class="tag {{ $tagClass($report->status) }}">{{ str_replace('_', ' ', $report->status) }}</span></strong></div>
        <div class="metric"><span>Priority</span><strong>{{ ucfirst($report->priority) }}</strong></div>
        <div class="metric"><span>Category</span><strong>{{ $report->category }}</strong></div>
        <div class="metric"><span>SLA</span><strong>{{ $report->sla_breached ? 'Breached' : ($report->due_at ? 'Active' : 'N/A') }}</strong></div>
    </div>

    <div class="detail-grid">
        <div class="stack">
            <section class="detail-card">
                <h2>Report Details</h2>
                <div class="kv-grid">
                    <div class="kv"><span>ID</span><strong>#{{ $report->id }}</strong></div>
                    <div class="kv"><span>Submitted</span><strong>{{ $report->created_at?->format('M j, Y g:i A') ?? 'N/A' }}</strong></div>
                    <div class="kv"><span>Location</span><strong>{{ $report->location }}</strong></div>
                    <div class="kv"><span>Coordinates</span><strong>{{ $report->latitude && $report->longitude ? $report->latitude.', '.$report->longitude : 'N/A' }}</strong></div>
                    <div class="kv"><span>Municipality</span><strong>{{ $report->municipality_en ?? 'N/A' }}</strong></div>
                    <div class="kv"><span>Due At</span><strong>{{ $report->due_at?->format('M j, Y g:i A') ?? 'N/A' }}</strong></div>
                    <div class="kv"><span>ML Category</span><strong>{{ $report->ai_category ?? 'N/A' }}</strong></div>
                    <div class="kv"><span>ML Confidence</span><strong>{{ filled($report->ai_confidence) ? round($report->ai_confidence * 100, 1).'%' : 'N/A' }}</strong></div>
                </div>
            </section>

            <section class="detail-card">
                <h2>Description</h2>
                <div class="body-copy">{{ $report->description }}</div>
            </section>

            <section class="detail-card">
                <h2>Images</h2>
                <div class="media-grid">
                    <div>
                        <label>Citizen Photo</label>
                        <div class="media-box">
                            @if ($submittedImage)
                                <img src="{{ $submittedImage }}" alt="Submitted report image">
                            @else
                                <span class="muted">No image uploaded</span>
                            @endif
                        </div>
                    </div>
                    <div>
                        <label>Worker Proof</label>
                        <div class="media-box">
                            @if ($workerImage)
                                <img src="{{ $workerImage }}" alt="Worker resolution image">
                            @else
                                <span class="muted">No worker proof yet</span>
                            @endif
                        </div>
                    </div>
                    <div>
                        <label>Citizen Review Photo</label>
                        <div class="media-box">
                            @if ($citizenImage)
                                <img src="{{ $citizenImage }}" alt="Citizen review image">
                            @else
                                <span class="muted">No citizen review photo</span>
                            @endif
                        </div>
                    </div>
                </div>
            </section>

            <section class="detail-card">
                <h2>Resolution And Review</h2>
                <div class="kv-grid">
                    <div class="kv"><span>Worker Resolved At</span><strong>{{ $report->worker_resolved_at?->format('M j, Y g:i A') ?? 'N/A' }}</strong></div>
                    <div class="kv"><span>Citizen Confirmed</span><strong>{{ is_null($report->citizen_resolution_confirmed) ? 'Pending' : ($report->citizen_resolution_confirmed ? 'Yes' : 'Requested review') }}</strong></div>
                    <div class="kv"><span>Citizen Confirmed At</span><strong>{{ $report->citizen_confirmed_at?->format('M j, Y g:i A') ?? 'N/A' }}</strong></div>
                    <div class="kv"><span>Rejected Reason</span><strong>{{ $report->rejection_reason ?? 'N/A' }}</strong></div>
                </div>
                <div style="margin-top:14px;">
                    <label>Worker Resolution Note</label>
                    <div class="body-copy">{{ $report->worker_resolution_note ?? 'No worker note yet.' }}</div>
                </div>
                <div style="margin-top:14px;">
                    <label>Citizen Review Note</label>
                    <div class="body-copy">{{ $report->citizen_resolution_note ?? 'No citizen review note yet.' }}</div>
                </div>
            </section>
        </div>

        <aside class="stack">
            <section class="detail-card">
                <h2>Citizen</h2>
                <div class="kv-grid" style="grid-template-columns:1fr;">
                    <div class="kv"><span>Name</span><strong>{{ $report->user?->name ?? 'Unknown' }}</strong></div>
                    <div class="kv"><span>Email</span><strong>{{ $report->user?->email ?? 'N/A' }}</strong></div>
                    <div class="kv"><span>Phone</span><strong>{{ $report->user?->phone ?? 'N/A' }}</strong></div>
                    <div class="kv"><span>City</span><strong>{{ $report->user?->city ?? 'N/A' }}</strong></div>
                </div>
            </section>

            <section class="detail-card">
                <h2>Assigned Worker</h2>
                @if ($report->assignee)
                    <div class="kv-grid" style="grid-template-columns:1fr;">
                        <div class="kv"><span>Name</span><strong><a href="{{ route('admin.workers.show', $report->assignee) }}">{{ $report->assignee->name }}</a></strong></div>
                        <div class="kv"><span>Email</span><strong>{{ $report->assignee->email }}</strong></div>
                        <div class="kv"><span>Phone</span><strong>{{ $report->assignee->phone ?? 'N/A' }}</strong></div>
                        <div class="kv"><span>Municipality</span><strong>{{ $report->assignee->assigned_municipality ?? 'N/A' }}</strong></div>
                    </div>
                @else
                    <p class="muted">This report is not assigned to a worker.</p>
                @endif
            </section>

            <section class="detail-card">
                <h2>Timeline</h2>
                <div class="timeline">
                    <div class="timeline-item"><strong>Report submitted</strong><span>{{ $report->created_at?->format('M j, Y g:i A') ?? 'N/A' }}</span></div>
                    @if ($report->assigned_to)
                        <div class="timeline-item"><strong>Worker attached</strong><span>{{ $report->assignee?->name ?? 'Assigned worker' }}</span></div>
                    @endif
                    @if ($report->worker_resolved_at || $report->resolved_at)
                        <div class="timeline-item"><strong>Marked resolved</strong><span>{{ ($report->worker_resolved_at ?? $report->resolved_at)?->format('M j, Y g:i A') }}</span></div>
                    @endif
                    @if ($report->citizen_confirmed_at)
                        <div class="timeline-item"><strong>Citizen reviewed result</strong><span>{{ $report->citizen_confirmed_at->format('M j, Y g:i A') }}</span></div>
                    @endif
                    <div class="timeline-item"><strong>Current status</strong><span>{{ str_replace('_', ' ', $report->status) }}</span></div>
                </div>
            </section>

            <section class="detail-card">
                <h2>Recent Notifications</h2>
                @forelse ($notifications as $notification)
                    <div class="kv">
                        <span>{{ $notification->created_at?->format('M j, Y g:i A') }}</span>
                        <strong>{{ $notification->title }}</strong>
                        <div class="muted">{{ $notification->body }}</div>
                    </div>
                @empty
                    <p class="muted">No notifications were recorded for this report.</p>
                @endforelse
            </section>
        </aside>
    </div>
@endsection
