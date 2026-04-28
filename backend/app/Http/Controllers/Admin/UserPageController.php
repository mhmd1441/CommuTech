<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
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
            ->when($data['role'] ?? null, fn ($query, $role) => $query->where('role', $role))
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
            'user' => new User,
            'roles' => User::ROLES,
            'mode' => 'create',
        ]);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'min:2', 'max:160'],
            'email' => ['required', 'email:rfc', 'max:255', 'unique:users,email'],
            'phone' => ['required', 'regex:/^\+961\s?[0-9]{7,8}$/'],
            'role' => ['required', Rule::in(User::ROLES)],
            'country' => ['nullable', 'string', 'max:80'],
            'city' => ['nullable', 'string', 'max:80'],
            'street' => ['nullable', 'string', 'max:160'],
            'building' => ['nullable', 'string', 'max:80'],
            'password' => ['required', 'confirmed', Password::min(8)->letters()->numbers()],
        ]);

        $data['email'] = strtolower($data['email']);

        User::create($data);

        return redirect()
            ->route('admin.users.index', ['role' => $data['role']])
            ->with('status', 'User created successfully.');
    }

    public function edit(User $user)
    {
        return view('admin.users.form', [
            'user' => $user,
            'roles' => User::ROLES,
            'mode' => 'edit',
        ]);
    }

    public function update(Request $request, User $user)
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'min:2', 'max:160'],
            'email' => ['required', 'email:rfc', 'max:255', Rule::unique('users', 'email')->ignore($user->id)],
            'phone' => ['required', 'regex:/^\+961\s?[0-9]{7,8}$/'],
            'role' => ['required', Rule::in(User::ROLES)],
            'country' => ['nullable', 'string', 'max:80'],
            'city' => ['nullable', 'string', 'max:80'],
            'street' => ['nullable', 'string', 'max:160'],
            'building' => ['nullable', 'string', 'max:80'],
            'password' => ['nullable', 'confirmed', Password::min(8)->letters()->numbers()],
        ]);

        $data['email'] = strtolower($data['email']);

        if (blank($data['password'] ?? null)) {
            unset($data['password']);
        }

        $user->update($data);

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
}
