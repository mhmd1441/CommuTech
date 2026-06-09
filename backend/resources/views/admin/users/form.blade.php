@extends('admin.panel')

@section('title', ($mode === 'create' ? 'Create User' : 'Edit User').' | CommuTech Admin')
@section('page_title', $mode === 'create' ? 'Create User' : 'Edit User')
@section('page_subtitle', 'Keep account details and roles organized.')
@section('page_actions')
    <a class="button" href="{{ route('admin.users.index') }}">Back to Users</a>
@endsection

@push('scripts')
<script>
    function toggleMunicipalityField() {
        const workerChecked = document.querySelector('input[name="roles[]"][value="worker"]')?.checked;
        const field = document.getElementById('municipality-field');
        const input = document.querySelector('input[name="assigned_municipality"]');
        if (!field) return;
        field.style.display = workerChecked ? 'block' : 'none';
        if (input) {
            input.disabled = !workerChecked;
            if (!workerChecked) input.value = '';
        }
    }
    document.addEventListener('DOMContentLoaded', function () {
        document.querySelectorAll('input[name="roles[]"]').forEach(function (cb) {
            cb.addEventListener('change', toggleMunicipalityField);
        });
        toggleMunicipalityField();
    });
</script>
@endpush

@section('content')
    <section class="panel">
        @php
            $selectedRoleValues = old('roles', $selectedRoles ?? [$user->role ?: request('role', 'citizen')]);
            $selectedRoleValues = is_array($selectedRoleValues) ? $selectedRoleValues : [$selectedRoleValues];
        @endphp

        <form method="POST" action="{{ $mode === 'create' ? route('admin.users.store') : route('admin.users.update', $user) }}">
            @csrf
            @if ($mode === 'edit')
                @method('PUT')
            @endif

            <div class="form-grid">
                <div>
                    <label>First Name</label>
                    <input name="first_name" value="{{ old('first_name', $user->first_name) }}" required>
                </div>
                <div>
                    <label>Father Name</label>
                    <input name="father_name" value="{{ old('father_name', $user->father_name) }}">
                </div>
                <div>
                    <label>Last Name</label>
                    <input name="last_name" value="{{ old('last_name', $user->last_name) }}" required>
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
                    <label>Roles</label>
                    <div style="display: flex; gap: 10px; flex-wrap: wrap; min-height: 42px; align-items: center;">
                        @foreach ($roles as $role)
                            <label style="display: inline-flex; align-items: center; gap: 6px; margin: 0;">
                                <input
                                    type="checkbox"
                                    name="roles[]"
                                    value="{{ $role }}"
                                    @checked(in_array($role, $selectedRoleValues, true))
                                >
                                {{ ucfirst($role) }}
                            </label>
                        @endforeach
                    </div>
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
                    <label>Area</label>
                    <input name="area" value="{{ old('area', $user->area) }}">
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
                    <label>Profile Picture URL</label>
                    <input name="profile_picture_url" type="url" value="{{ old('profile_picture_url', $user->profile_picture_url) }}">
                </div>
                <div id="municipality-field" style="display: none;">
                    <label>Assigned Municipality</label>
                    <input
                        name="assigned_municipality"
                        list="municipalities-list"
                        value="{{ old('assigned_municipality', $user->assigned_municipality) }}"
                        placeholder="Type to search municipality..."
                        autocomplete="off"
                    >
                    <datalist id="municipalities-list">
                        @foreach ($municipalities as $m)
                            <option value="{{ $m }}">
                        @endforeach
                    </datalist>
                </div>
                @if ($mode === 'create')
                    <div>
                        <label>Password</label>
                        <input name="password" type="password" value="" autocomplete="new-password" required>
                    </div>
                    <div>
                        <label>Confirm Password</label>
                        <input name="password_confirmation" type="password" value="" autocomplete="new-password" required>
                    </div>
                @endif
            </div>

            <div style="margin-top: 18px;">
                <button class="button primary" type="submit">{{ $mode === 'create' ? 'Create User' : 'Save Changes' }}</button>
            </div>
        </form>
    </section>
@endsection
