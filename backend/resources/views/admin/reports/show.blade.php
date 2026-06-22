@extends('admin.panel')

@section('title', 'Report #'.$report->id.' | CommuTech Admin')
@section('page_title', 'Report #'.$report->id)
@section('page_subtitle', $report->title)
@section('page_actions')
    <div class="row-actions">
        <a class="button" href="{{ route('admin.reports.index') }}">Back to Reports</a>
        <a class="button" href="{{ request()->fullUrl() }}">Refresh</a>
        <a class="button primary" href="{{ route('admin.reports.edit', $report) }}">Edit Report</a>
        @if($report->isPubliclyVisible())
            @php
                $publicBase = rtrim(config('services.public_status.base_url'), '/');
                $publicStatusUrl = $publicBase.'/issue/'.$report->id.'/status';
                $publicStickerUrl = $publicBase.'/issue/'.$report->id.'/sticker';
            @endphp
            <a class="button" href="{{ $publicStatusUrl }}" target="_blank">View Public Page</a>
            <a class="button" href="{{ $publicStickerUrl }}" target="_blank">Print Sticker</a>
        @endif
    </div>
@endsection

@section('content')
    @php
        $tagClass = function ($value) {
            return match ($value) {
                'resolved', 'citizen' => 'green',
                'in_progress', 'under_review', 'awaiting_funding', 'worker' => 'orange',
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
        $money = fn ($value) => filled($value) ? '$'.number_format((float) $value, 2) : 'N/A';
        $fundingGoal = (float) ($report->funding_goal ?? 0);
        $fundingRaised = (float) ($report->funding_raised ?? 0);
        $fundingProgress = $fundingGoal > 0 ? min(100, round(($fundingRaised / $fundingGoal) * 100)) : 0;
        $citizenReviewLabel = is_null($report->citizen_resolution_confirmed)
            ? 'Pending'
            : ($report->citizen_resolution_confirmed ? 'Confirmed resolved' : 'Requested review');
        $citizenReviewTimeLabel = $report->citizen_resolution_confirmed === false
            ? 'Review Requested At'
            : 'Resolution Confirmed At';
        $citizenTimelineTitle = $report->citizen_resolution_confirmed === false
            ? 'Citizen requested review'
            : 'Citizen confirmed resolution';
    @endphp

    <style>
        .detail-grid { display: grid; grid-template-columns: 1.45fr .75fr; gap: 14px; }
        .detail-card { border: 1px solid var(--line); background: var(--panel); padding: 18px; }
        .detail-card h2 { margin: 0 0 14px; font-size: 17px; }
        .metric-row { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 12px; margin-bottom: 14px; }
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
        .funding-progress { height: 10px; border-radius: 999px; background: #252a31; overflow: hidden; border: 1px solid var(--line); }
        .funding-progress span { display: block; height: 100%; background: var(--blue); }
        .funding-actions { display: grid; grid-template-columns: 1.2fr .8fr; gap: 12px; margin-top: 14px; }
        .mini-table { width: 100%; margin-top: 10px; }
        .mini-table th, .mini-table td { font-size: 12px; padding: 9px; }
        @media (max-width: 1100px) { .detail-grid, .metric-row, .media-grid, .kv-grid { grid-template-columns: 1fr; } }
        @media (max-width: 900px) { .funding-actions { grid-template-columns: 1fr; } }
    </style>

    @if ($errors->any())
        <div class="detail-card" style="border-color:#7f1d1d;background:#2a1013;margin-bottom:14px;">
            <strong style="color:#fecaca;">{{ $errors->first() }}</strong>
        </div>
    @endif

    <div class="metric-row">
        <div class="metric"><span>Status</span><strong><span class="tag {{ $tagClass($report->status) }}">{{ str_replace('_', ' ', $report->status) }}</span></strong></div>
        <div class="metric"><span>Priority</span><strong>{{ ucfirst($report->priority) }}</strong></div>
        <div class="metric"><span>Category</span><strong>{{ $report->category }}</strong></div>
        <div class="metric"><span>Affected Citizens</span><strong>{{ $report->affected_count ?? 1 }}</strong></div>
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
                <h2>Funding</h2>
                <div class="kv-grid">
                    <div class="kv"><span>Funding Status</span><strong><span class="tag {{ $tagClass($report->funding_status) }}">{{ str_replace('_', ' ', $report->funding_status ?? 'none') }}</span></strong></div>
                    <div class="kv"><span>Funding Type</span><strong>{{ $report->funding_type ? ucfirst($report->funding_type) : 'N/A' }}</strong></div>
                    <div class="kv"><span>Estimated Cost</span><strong>{{ $money($report->estimated_cost) }}</strong></div>
                    <div class="kv"><span>Community Goal</span><strong>{{ $money($report->funding_goal) }}</strong></div>
                    <div class="kv"><span>Raised</span><strong>{{ $money($report->funding_raised) }}</strong></div>
                    <div class="kv"><span>Municipality Contribution</span><strong>{{ $money($report->municipality_contribution) }}</strong></div>
                    <div class="kv"><span>Deadline</span><strong>{{ $report->funding_deadline?->format('M j, Y') ?? 'N/A' }}</strong></div>
                    <div class="kv"><span>Approved At</span><strong>{{ $report->funding_approved_at?->format('M j, Y g:i A') ?? 'N/A' }}</strong></div>
                </div>

                @if ($fundingGoal > 0)
                    <div style="margin-top:14px;">
                        <label>Funding Progress</label>
                        <div class="funding-progress"><span style="width: {{ $fundingProgress }}%;"></span></div>
                        <div class="muted" style="margin-top:6px;">{{ $fundingProgress }}% funded</div>
                    </div>
                @endif

                <div style="margin-top:14px;">
                    <label>Worker Funding Justification</label>
                    <div class="body-copy">{{ $report->funding_request_note ?? 'No funding request was submitted.' }}</div>
                </div>

                @if ($report->funding_status === 'requested')
                    <div class="funding-actions">
                        <form method="POST" action="{{ route('admin.reports.funding.approve', $report) }}">
                            @csrf
                            <h2 style="font-size:15px;">Approve Funding</h2>
                            <div class="form-grid" style="grid-template-columns:1fr 1fr;">
                                <div>
                                    <label>Approval Type</label>
                                    <select name="funding_type" required>
                                        <option value="municipal">Municipal</option>
                                        <option value="community">Community</option>
                                        <option value="mixed">Mixed</option>
                                    </select>
                                </div>
                                <div>
                                    <label>Funding Deadline</label>
                                    <input type="date" name="funding_deadline" value="{{ old('funding_deadline', now()->addDays(30)->format('Y-m-d')) }}">
                                </div>
                                <div class="full">
                                    <label>Municipality Contribution</label>
                                    <input name="municipality_contribution" value="{{ old('municipality_contribution') }}" placeholder="Only needed for mixed funding">
                                </div>
                            </div>
                            <button class="button primary" type="submit" style="margin-top:12px;">Approve Request</button>
                        </form>

                        <form method="POST" action="{{ route('admin.reports.funding.reject', $report) }}">
                            @csrf
                            <h2 style="font-size:15px;">Reject Funding</h2>
                            <label>Reason</label>
                            <textarea name="rejection_reason" required placeholder="Explain why this request cannot be processed.">{{ old('rejection_reason') }}</textarea>
                            <button class="button danger" type="submit" style="margin-top:12px;">Reject Request</button>
                        </form>
                    </div>
                @endif

                <div style="margin-top:16px;">
                    <label>Donations</label>
                    @if ($report->donations->isNotEmpty())
                        <table class="mini-table">
                            <thead>
                                <tr>
                                    <th>Citizen</th>
                                    <th>Amount</th>
                                    <th>Status</th>
                                    <th>Created</th>
                                </tr>
                            </thead>
                            <tbody>
                                @foreach ($report->donations as $donation)
                                    <tr>
                                        <td>{{ $donation->user?->name ?? 'Unknown' }}</td>
                                        <td>{{ $money($donation->amount) }}</td>
                                        <td><span class="tag {{ $donation->status === 'refunded' ? 'orange' : 'green' }}">{{ $donation->status }}</span></td>
                                        <td>{{ $donation->created_at?->format('M j, Y g:i A') }}</td>
                                    </tr>
                                @endforeach
                            </tbody>
                        </table>
                    @else
                        <p class="muted">No donations recorded for this report.</p>
                    @endif
                </div>
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
                    <div class="kv"><span>Citizen Response</span><strong>{{ $citizenReviewLabel }}</strong></div>
                    <div class="kv"><span>{{ $citizenReviewTimeLabel }}</span><strong>{{ $report->citizen_confirmed_at?->format('M j, Y g:i A') ?? 'N/A' }}</strong></div>
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
                        <div class="timeline-item"><strong>{{ $citizenTimelineTitle }}</strong><span>{{ $report->citizen_confirmed_at->format('M j, Y g:i A') }}</span></div>
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
