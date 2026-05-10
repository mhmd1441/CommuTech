<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Issue;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class ReportPageController extends Controller
{
    public function index(Request $request)
    {
        $data = $request->validate([
            'status' => ['nullable', Rule::in(['pending', 'in_progress', 'resolved', 'rejected'])],
            'category' => ['nullable', Rule::in(Issue::CATEGORIES)],
            'search' => ['nullable', 'string', 'max:100'],
        ]);

        $reports = Issue::query()
            ->with(['user:id,name,email,role', 'assignee:id,name,email,role'])
            ->when($data['status'] ?? null, fn ($query, $status) => $query->where('status', $status))
            ->when($data['category'] ?? null, fn ($query, $category) => $query->where('category', $category))
            ->when($data['search'] ?? null, function ($query, $search) {
                $query->where(function ($query) use ($search) {
                    $query
                        ->where('title', 'like', "%{$search}%")
                        ->orWhere('location', 'like', "%{$search}%")
                        ->orWhere('description', 'like', "%{$search}%");
                });
            })
            ->latest()
            ->paginate(10)
            ->withQueryString();

        return view('admin.reports.index', [
            'reports' => $reports,
            'categories' => Issue::CATEGORIES,
            'status' => $data['status'] ?? null,
            'category' => $data['category'] ?? null,
            'search' => $data['search'] ?? '',
        ]);
    }

    public function create()
    {
        return view('admin.reports.form', [
            'report' => new Issue,
            'citizens' => $this->citizens(),
            'workers' => $this->workers(),
            'categories' => Issue::CATEGORIES,
            'statuses' => ['pending', 'in_progress', 'resolved', 'rejected'],
            'priorities' => ['low', 'medium', 'high', 'critical'],
            'mode' => 'create',
        ]);
    }

    public function store(Request $request)
    {
        $data = $this->validatedReportData($request);

        if (($data['status'] ?? null) === 'resolved') {
            $data['resolved_at'] = now();
        }

        Issue::create($data);

        return redirect()
            ->route('admin.reports.index')
            ->with('status', 'Report created successfully.');
    }

    public function edit(Issue $report)
    {
        return view('admin.reports.form', [
            'report' => $report,
            'citizens' => $this->citizens(),
            'workers' => $this->workers(),
            'categories' => Issue::CATEGORIES,
            'statuses' => ['pending', 'in_progress', 'resolved', 'rejected'],
            'priorities' => ['low', 'medium', 'high', 'critical'],
            'mode' => 'edit',
        ]);
    }

    public function update(Request $request, Issue $report)
    {
        $data = $this->validatedReportData($request);

        if (($data['status'] ?? null) === 'resolved' && ! $report->resolved_at) {
            $data['resolved_at'] = now();
        }

        if (($data['status'] ?? null) !== 'resolved') {
            $data['resolved_at'] = null;
        }

        $report->update($data);

        return redirect()
            ->route('admin.reports.index')
            ->with('status', 'Report updated successfully.');
    }

    public function destroy(Issue $report)
    {
        $report->delete();

        return redirect()
            ->route('admin.reports.index')
            ->with('status', 'Report deleted successfully.');
    }

    private function validatedReportData(Request $request): array
    {
        $data = $request->validate([
            'user_id' => ['required', Rule::exists('users', 'id')],
            'assigned_to' => ['nullable', Rule::exists('users', 'id')],
            'title' => ['required', 'string', 'min:5', 'max:180'],
            'description' => ['required', 'string', 'min:20'],
            'category' => ['required', Rule::in(Issue::CATEGORIES)],
            'status' => ['required', Rule::in(['pending', 'in_progress', 'resolved', 'rejected'])],
            'priority' => ['required', Rule::in(['low', 'medium', 'high', 'critical'])],
            'location' => ['required', 'string', 'min:4', 'max:255'],
            'latitude' => ['nullable', 'numeric', 'between:-90,90'],
            'longitude' => ['nullable', 'numeric', 'between:-180,180'],
            'image_url' => ['nullable', 'url', 'max:2048'],
            'rejection_reason' => ['nullable', 'string'],
        ]);

        if (! User::find($data['user_id'])?->hasRole(User::ROLE_CITIZEN)) {
            throw ValidationException::withMessages([
                'user_id' => 'The report creator must have the citizen role.',
            ]);
        }

        if (! empty($data['assigned_to']) && ! User::find($data['assigned_to'])?->hasRole(User::ROLE_WORKER)) {
            throw ValidationException::withMessages([
                'assigned_to' => 'Reports can only be assigned to users with the worker role.',
            ]);
        }

        return $data;
    }

    private function citizens()
    {
        return User::withRole(User::ROLE_CITIZEN)->orderBy('name')->get(['id', 'name', 'email', 'role']);
    }

    private function workers()
    {
        return User::withRole(User::ROLE_WORKER)->orderBy('name')->get(['id', 'name', 'email', 'role']);
    }
}
