<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;

class UserPageController extends Controller
{
    public function index(Request $request)
    {
        $data = $request->validate([
            'role' => ['nullable', Rule::in(User::ROLES)],
            'search' => ['nullable', 'string', 'max:100'],
        ]);

        $users = User::query()
            ->with('roles')
            ->when($data['role'] ?? null, fn ($query, $role) => $query->withRole($role))
            ->when($data['search'] ?? null, function ($query, $search) {
                $query->where(function ($query) use ($search) {
                    $query
                        ->where('name', 'like', "%{$search}%")
                        ->orWhere('email', 'like', "%{$search}%")
                        ->orWhere('phone', 'like', "%{$search}%");
                });
            })
            ->latest()
            ->paginate(10)
            ->withQueryString();

        return view('admin.users.index', [
            'users' => $users,
            'role' => $data['role'] ?? null,
            'search' => $data['search'] ?? '',
        ]);
    }

    public function create()
    {
        return view('admin.users.form', [
            'user'           => new User,
            'roles'          => User::ROLES,
            'selectedRoles'  => [request('role', User::ROLE_CITIZEN)],
            'municipalities' => DB::table('municipalities')->orderBy('name_en')->pluck('name_en'),
            'mode'           => 'create',
        ]);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'first_name' => ['required', 'string', 'min:2', 'max:80'],
            'father_name' => ['nullable', 'string', 'min:2', 'max:80'],
            'last_name' => ['required', 'string', 'min:2', 'max:80'],
            'email' => ['required', 'email:rfc', 'max:255', 'unique:users,email'],
            'phone' => ['required', 'regex:/^\+961\s?[0-9]{7,8}$/', 'unique:users,phone'],
            'roles' => ['required', 'array', 'min:1'],
            'roles.*' => ['required', Rule::in(User::ROLES)],
            'country' => ['nullable', 'string', 'max:80'],
            'city' => ['nullable', 'string', 'max:80'],
            'area' => ['nullable', 'string', 'max:120'],
            'street' => ['nullable', 'string', 'max:160'],
            'building' => ['nullable', 'string', 'max:80'],
            'profile_picture_url'   => ['nullable', 'url', 'max:2048'],
            'assigned_municipality' => ['nullable', 'string', 'max:120'],
            'password' => ['required', 'confirmed', Password::min(8)->letters()->numbers()],
        ]);

        $data['email'] = strtolower($data['email']);
        $roles = $data['roles'];
        unset($data['roles']);
        $data['name'] = $this->displayName($data);
        $data['role'] = $this->primaryRole($roles);
        $data['is_verified'] = $this->isProfileVerified($data);

        $user = User::create($data);
        $user->syncRolesByName($roles);

        return redirect()
            ->route('admin.users.index', ['role' => $data['role']])
            ->with('status', 'User created successfully.');
    }

    public function edit(User $user)
    {
        $user->load('roles');

        return view('admin.users.form', [
            'user'           => $user,
            'roles'          => User::ROLES,
            'selectedRoles'  => $user->role_names,
            'municipalities' => DB::table('municipalities')->orderBy('name_en')->pluck('name_en'),
            'mode'           => 'edit',
        ]);
    }

    public function update(Request $request, User $user)
    {
        if (blank($request->input('password')) || blank($request->input('password_confirmation'))) {
            $request->request->remove('password');
            $request->request->remove('password_confirmation');
        }

        $data = $request->validate([
            'first_name' => ['required', 'string', 'min:2', 'max:80'],
            'father_name' => ['nullable', 'string', 'min:2', 'max:80'],
            'last_name' => ['required', 'string', 'min:2', 'max:80'],
            'email' => ['required', 'email:rfc', 'max:255', Rule::unique('users', 'email')->ignore($user->id)],
            'phone' => ['required', 'regex:/^\+961\s?[0-9]{7,8}$/', Rule::unique('users', 'phone')->ignore($user->id)],
            'roles' => ['required', 'array', 'min:1'],
            'roles.*' => ['required', Rule::in(User::ROLES)],
            'country' => ['nullable', 'string', 'max:80'],
            'city' => ['nullable', 'string', 'max:80'],
            'area' => ['nullable', 'string', 'max:120'],
            'street' => ['nullable', 'string', 'max:160'],
            'building' => ['nullable', 'string', 'max:80'],
            'profile_picture_url'   => ['nullable', 'url', 'max:2048'],
            'assigned_municipality' => ['nullable', 'string', 'max:120'],
            'password' => ['sometimes', 'confirmed', Password::min(8)->letters()->numbers()],
        ]);

        $data['email'] = strtolower($data['email']);
        $roles = $data['roles'];
        unset($data['roles']);
        $data['name'] = $this->displayName($data);
        $data['role'] = $this->primaryRole($roles);
        $data['is_verified'] = $this->isProfileVerified($data);

        $user->update($data);
        $user->syncRolesByName($roles);

        return redirect()
            ->route('admin.users.index', ['role' => $user->fresh()->role])
            ->with('status', 'User updated successfully.');
    }

    public function destroy(Request $request, User $user)
    {
        if ($request->user()->is($user)) {
            return back()->withErrors(['user' => 'You cannot delete your own admin account.']);
        }

        $role = $user->role;
        $user->delete();

        return redirect()
            ->route('admin.users.index', ['role' => $role])
            ->with('status', 'User deleted successfully.');
    }

    private function displayName(array $data): string
    {
        return trim(collect([
            $data['first_name'] ?? null,
            $data['father_name'] ?? null,
            $data['last_name'] ?? null,
        ])->filter()->implode(' '));
    }

    private function primaryRole(array $roles): string
    {
        if (in_array(User::ROLE_ADMIN, $roles, true)) {
            return User::ROLE_ADMIN;
        }

        if (in_array(User::ROLE_CITIZEN, $roles, true)) {
            return User::ROLE_CITIZEN;
        }

        return $roles[0] ?? User::ROLE_CITIZEN;
    }

    private function isProfileVerified(array $data): bool
    {
        return collect([
            $data['first_name'] ?? null,
            $data['father_name'] ?? null,
            $data['last_name'] ?? null,
            $data['email'] ?? null,
            $data['phone'] ?? null,
            $data['country'] ?? null,
            $data['city'] ?? null,
            $data['area'] ?? null,
            $data['street'] ?? null,
            $data['building'] ?? null,
            $data['profile_picture_url'] ?? null,
        ])->every(fn ($value) => filled($value));
    }
}
