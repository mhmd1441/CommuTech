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
            ->paginate(20);

        return response()->json($users);
    }

    public function store(StoreUserRequest $request)
    {
        $user = User::create($request->validated());

        return response()->json([
            'message' => 'User created successfully.',
            'user' => $user,
        ], 201);
    }

    public function show(User $user)
    {
        return response()->json([
            'user' => $user,
            'stats' => [
                'issues_count' => $user->issues()->count(),
                'notifications_count' => $user->commuTechNotifications()->count(),
            ],
        ]);
    }

    public function update(UpdateUserRequest $request, User $user)
    {
        $user->update($request->validated());

        return response()->json([
            'message' => 'User updated successfully.',
            'user' => $user->fresh(),
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
}
