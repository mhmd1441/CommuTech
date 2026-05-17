<?php

namespace App\Http\Controllers;

use App\Http\Requests\Users\StoreUserRequest;
use App\Http\Requests\Users\UpdateUserRequest;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class UserController extends Controller
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
            ->paginate(20);

        return response()->json($users);
    }

    public function store(StoreUserRequest $request)
    {
        $data = $request->validated();
        $roles = $data['roles'];
        unset($data['roles']);

        $data['name'] = $this->displayName($data);
        $data['role'] = $this->primaryRole($roles);
        $data['is_verified'] = $this->isProfileVerified($data);

        $user = User::create($data);
        $user->syncRolesByName($roles);

        return response()->json([
            'message' => 'User created successfully.',
            'user' => $user->fresh()->load('roles'),
        ], 201);
    }

    public function show(User $user)
    {
        return response()->json([
            'user' => $user->load('roles'),
            'stats' => [
                'issues_count' => $user->issues()->count(),
                'notifications_count' => $user->commuTechNotifications()->count(),
            ],
        ]);
    }

    public function update(UpdateUserRequest $request, User $user)
    {
        $data = $request->validated();
        $roles = $data['roles'] ?? null;
        unset($data['roles']);

        if ($roles !== null) {
            $data['role'] = $this->primaryRole($roles);
        }

        if (array_intersect(['first_name', 'father_name', 'last_name'], array_keys($data)) !== []) {
            $data['name'] = $this->displayName([
                'first_name' => $data['first_name'] ?? $user->first_name,
                'father_name' => $data['father_name'] ?? $user->father_name,
                'last_name' => $data['last_name'] ?? $user->last_name,
            ]);
        }

        $user->update($data);

        if ($roles !== null) {
            $user->syncRolesByName($roles);
        }

        $user->forceFill(['is_verified' => $this->isProfileVerified($user->fresh()->toArray())])->save();

        return response()->json([
            'message' => 'User updated successfully.',
            'user' => $user->fresh()->load('roles'),
        ]);
    }

    public function destroy(Request $request, User $user)
    {
        if ($request->user()->is($user)) {
            return response()->json([
                'message' => 'You cannot delete your own account from this endpoint.',
            ], 422);
        }

        $user->delete();

        return response()->noContent();
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
