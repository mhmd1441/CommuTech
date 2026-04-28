<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;

class ProfileController extends Controller
{
    public function show(Request $request)
    {
        return response()->json([
            'user' => $request->user(),
            'stats' => $this->stats($request),
        ]);
    }

    public function update(Request $request)
    {
        $user = $request->user();

        $data = $request->validate([
            'name' => ['sometimes', 'string', 'max:160'],
            'email' => ['sometimes', 'email', 'max:255', Rule::unique('users', 'email')->ignore($user->id)],
            'phone' => ['sometimes', 'nullable', 'string', 'max:40'],
            'country' => ['sometimes', 'nullable', 'string', 'max:80'],
            'city' => ['sometimes', 'nullable', 'string', 'max:80'],
            'street' => ['sometimes', 'nullable', 'string', 'max:160'],
            'building' => ['sometimes', 'nullable', 'string', 'max:80'],
        ]);

        if (isset($data['email'])) {
            $data['email'] = strtolower($data['email']);
        }

        $user->update($data);

        return response()->json([
            'user' => $user->fresh(),
            'stats' => $this->stats($request),
        ]);
    }

    public function updatePassword(Request $request)
    {
        $data = $request->validate([
            'current_password' => ['required', 'string'],
            'password' => ['required', 'confirmed', Password::min(8)],
        ]);

        if (! Hash::check($data['current_password'], $request->user()->password)) {
            return response()->json([
                'message' => 'The current password is incorrect.',
            ], 422);
        }

        $request->user()->update(['password' => $data['password']]);

        return response()->json(['message' => 'Password updated.']);
    }

    private function stats(Request $request): array
    {
        $issues = $request->user()->issues();

        return [
            'submitted' => (clone $issues)->count(),
            'resolved' => (clone $issues)->where('status', 'resolved')->count(),
            'in_progress' => (clone $issues)->where('status', 'in_progress')->count(),
            'points' => (clone $issues)->where('status', 'resolved')->count() * 20,
        ];
    }
}
