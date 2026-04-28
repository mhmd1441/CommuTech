@extends('admin.panel')

@section('title', ($mode === 'create' ? 'Create User' : 'Edit User').' | CommuTech Admin')
@section('page_title', $mode === 'create' ? 'Create User' : 'Edit User')
@section('page_subtitle', 'Keep account details and roles organized.')
@section('page_actions')
    <a class="button" href="{{ route('admin.users.index') }}">Back to Users</a>
@endsection

@section('content')
    <section class="panel">
        <form method="POST" action="{{ $mode === 'create' ? route('admin.users.store') : route('admin.users.update', $user) }}">
            @csrf
            @if ($mode === 'edit')
                @method('PUT')
            @endif

            <div class="form-grid">
                <div>
                    <label>Name</label>
                    <input name="name" value="{{ old('name', $user->name) }}" required>
                </div>
                <div>
                    <label>Email</label>
                    <input name="email" type="email" value="{{ old('email', $user->email) }}" required>
                </div>
                <div>
                    <label>Phone</label>
                    <input name="phone" value="{{ old('phone', $user->phone) }}" placeholder="+961 70123456" required>
                </div>
                <div>
                    <label>Role</label>
                    <select name="role" required>
                        @foreach ($roles as $role)
                            <option value="{{ $role }}" @selected(old('role', $user->role ?: request('role', 'citizen')) === $role)>{{ ucfirst($role) }}</option>
                        @endforeach
                    </select>
                </div>
                <div>
                    <label>Country</label>
                    <input name="country" value="{{ old('country', $user->country ?? 'Lebanon') }}">
                </div>
                <div>
                    <label>City</label>
                    <input name="city" value="{{ old('city', $user->city) }}">
                </div>
                <div>
                    <label>Street</label>
                    <input name="street" value="{{ old('street', $user->street) }}">
                </div>
                <div>
                    <label>Building</label>
                    <input name="building" value="{{ old('building', $user->building) }}">
                </div>
                <div>
                    <label>Password {{ $mode === 'edit' ? '(leave empty to keep current)' : '' }}</label>
                    <input name="password" type="password" @required($mode === 'create')>
                </div>
                <div>
                    <label>Confirm Password</label>
                    <input name="password_confirmation" type="password" @required($mode === 'create')>
                </div>
            </div>

            <div style="margin-top: 18px;">
                <button class="button primary" type="submit">{{ $mode === 'create' ? 'Create User' : 'Save Changes' }}</button>
            </div>
        </form>
    </section>
@endsection
