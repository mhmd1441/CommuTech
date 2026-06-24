@extends('admin.panel')

@section('title', ($mode === 'create' ? 'Create Report' : 'Edit Report').' | CommuTech Admin')
@section('page_title', $mode === 'create' ? 'Create Report' : 'Edit Report')
@section('page_subtitle', 'Manage report details, status, priority, and worker assignment.')
@section('page_actions')
    <a class="button" href="{{ route('admin.reports.index') }}">Back to Reports</a>
@endsection

@section('content')
    <section class="panel">
        <form method="POST" action="{{ $mode === 'create' ? route('admin.reports.store') : route('admin.reports.update', $report) }}">
            @csrf
            @if ($mode === 'edit')
                @method('PUT')
            @endif

            <div class="form-grid">
                <div>
                    <label>Citizen</label>
                    <select name="user_id" required>
                        <option value="">Choose citizen</option>
                        @foreach ($citizens as $citizen)
                            <option value="{{ $citizen->id }}" @selected((int) old('user_id', $report->user_id) === $citizen->id)>
                                {{ $citizen->name }} - {{ $citizen->email }}
                            </option>
                        @endforeach
                    </select>
                </div>
                <div>
                    <label>Assigned Worker</label>
                    <select name="assigned_to" id="assigned-to-select">
                        <option value="">Unassigned</option>
                    @foreach ($workers as $worker)
                        <option value="{{ $worker->id }}" @selected((int) old('assigned_to', $report->assigned_to) === $worker->id)>
                            {{ $worker->name }} - {{ $worker->email }}
                        </option>
                    @endforeach
                </select>
                <div class="muted" style="margin-top:6px;">The report creator cannot be assigned as the worker.</div>
            </div>
                <div class="full">
                    <label>Title</label>
                    <input name="title" value="{{ old('title', $report->title) }}" required>
                </div>
                <div class="full">
                    <label>Description</label>
                    <textarea name="description" required>{{ old('description', $report->description) }}</textarea>
                </div>
                <div>
                    <label>Category</label>
                    <select name="category" required>
                        @foreach ($categories as $category)
                            <option value="{{ $category }}" @selected(old('category', $report->category) === $category)>{{ $category }}</option>
                        @endforeach
                    </select>
                </div>
                <div>
                    <label>Status</label>
                    <select name="status" id="status-select" required>
                        @foreach ($statuses as $status)
                            <option
                                value="{{ $status }}"
                                @selected(old('status', $report->status ?: 'pending') === $status)
                                @if (in_array($status, ['in_progress', 'resolved'], true)) data-requires-worker="true" @endif
                            >
                                {{ str_replace('_', ' ', ucfirst($status)) }}
                            </option>
                        @endforeach
                    </select>
                    <div id="status-worker-helper" class="muted" style="margin-top:6px;">
                        Assign a worker before moving this report to In Progress or Resolved.
                    </div>
                </div>
                <div>
                    <label>Priority</label>
                    <select name="priority" required>
                        @foreach ($priorities as $priority)
                            <option value="{{ $priority }}" @selected(old('priority', $report->priority ?: 'medium') === $priority)>{{ ucfirst($priority) }}</option>
                        @endforeach
                    </select>
                </div>
                <div>
                    <label>Location</label>
                    <input name="location" value="{{ old('location', $report->location) }}" required>
                </div>
                <div>
                    <label>Latitude</label>
                    <input name="latitude" value="{{ old('latitude', $report->latitude) }}">
                </div>
                <div>
                    <label>Longitude</label>
                    <input name="longitude" value="{{ old('longitude', $report->longitude) }}">
                </div>
                <div class="full">
                    <label>Image URL</label>
                    <input name="image_url" value="{{ old('image_url', $report->image_url) }}">
                </div>
                <div class="full">
                    <label>Rejection Reason</label>
                    <textarea name="rejection_reason">{{ old('rejection_reason', $report->rejection_reason) }}</textarea>
                </div>
            </div>

            <div style="margin-top: 18px;">
                <button class="button primary" type="submit">{{ $mode === 'create' ? 'Create Report' : 'Save Changes' }}</button>
            </div>
        </form>
    </section>

    <script>
        document.addEventListener('DOMContentLoaded', function () {
            const assignedToSelect = document.getElementById('assigned-to-select');
            const statusSelect = document.getElementById('status-select');
            const helper = document.getElementById('status-worker-helper');

            if (!assignedToSelect || !statusSelect || !helper) {
                return;
            }

            const workerRequiredStatuses = statusSelect.querySelectorAll('[data-requires-worker="true"]');

            function syncWorkerRequiredStatuses() {
                const hasWorker = assignedToSelect.value !== '';
                const selectedOption = statusSelect.options[statusSelect.selectedIndex];
                const selectedRequiresWorker = selectedOption?.dataset.requiresWorker === 'true';

                workerRequiredStatuses.forEach(function (option) {
                    option.disabled = !hasWorker && option !== selectedOption;
                });

                helper.style.display = hasWorker ? 'none' : 'block';

                if (!hasWorker && selectedRequiresWorker) {
                    helper.textContent = 'Assign a worker before saving this report as In Progress or Resolved.';
                } else {
                    helper.textContent = 'Assign a worker before moving this report to In Progress or Resolved.';
                }
            }

            assignedToSelect.addEventListener('change', syncWorkerRequiredStatuses);
            syncWorkerRequiredStatuses();
        });
    </script>
@endsection
