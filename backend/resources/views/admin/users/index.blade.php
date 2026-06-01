@extends('admin.panel')

@section('title', 'Users | CommuTech Admin')
@section('page_title', $role ? ucfirst($role).'s' : 'All Users')
@section('page_subtitle', 'Manage citizens, workers, and admin accounts.')
@section('page_actions')
    <a class="button primary" href="{{ route('admin.users.create', ['role' => $role]) }}">Create {{ $role ? ucfirst($role) : 'User' }}</a>
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
        <form class="filters" method="GET" action="{{ route('admin.users.index') }}">
            <input name="search" value="{{ $search }}" placeholder="Search by name, email, or phone">
            <select name="role">
                <option value="">All roles</option>
                @foreach (\App\Models\User::ROLES as $item)
                    <option value="{{ $item }}" @selected($role === $item)>{{ ucfirst($item) }}</option>
                @endforeach
            </select>
            <span></span>
            <button class="button" type="submit">Filter</button>
        </form>

        <table>
            <thead>
                <tr>
                    <th>ID</th>
                    <th>User</th>
                    <th>Phone</th>
                    <th>Role</th>
                    <th>City</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
                @forelse ($users as $user)
                    <tr>
                        <td>#{{ $user->id }}</td>
                        <td>
                            {{ $user->name }}
                            <div class="muted">{{ $user->email }}</div>
                        </td>
                        <td>{{ $user->phone ?? 'N/A' }}</td>
                        <td>
                            @foreach ($user->role_names as $userRole)
                                <span class="tag {{ $tagClass($userRole) }}">{{ $userRole }}</span>
                            @endforeach
                        </td>
                        <td>{{ $user->city ?? 'N/A' }}</td>
                        <td>
                            <div class="row-actions">
                                <a class="button" href="{{ route('admin.users.edit', $user) }}">Edit</a>
                                <form method="POST" action="{{ route('admin.users.destroy', $user) }}" onsubmit="return confirm('Delete this user?')">
                                    @csrf
                                    @method('DELETE')
                                    <button class="button danger" type="submit">Delete</button>
                                </form>
                            </div>
                        </td>
                    </tr>
                @empty
                    <tr>
                        <td colspan="6" class="muted">No users found.</td>
                    </tr>
                @endforelse
            </tbody>
        </table>

        <div class="pagination">{{ $users->links() }}</div>
    </section>
@endsection
