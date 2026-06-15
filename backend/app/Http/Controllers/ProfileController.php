<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;

class ProfileController extends Controller
{
    public function show(Request $request)
    {
        return response()->json([
            'user' => $request->user()->load('roles'),
            'stats' => $this->stats($request),
        ]);
    }

    public function update(Request $request)
    {
        $user = $request->user();

        $data = $request->validate([
            'first_name' => ['sometimes', 'required', 'string', 'min:2', 'max:80'],
            'father_name' => ['sometimes', 'nullable', 'string', 'min:2', 'max:80'],
            'last_name' => ['sometimes', 'required', 'string', 'min:2', 'max:80'],
            'email' => ['sometimes', 'required', 'email', 'max:255', Rule::unique('users', 'email')->ignore($user->id)],
            'phone' => ['sometimes', 'required', 'regex:/^\+961\s?[0-9]{7,8}$/', Rule::unique('users', 'phone')->ignore($user->id)],
            'country' => ['sometimes', 'required', 'string', 'max:80'],
            'city' => ['sometimes', 'required', 'string', 'max:80'],
            'area' => ['sometimes', 'nullable', 'string', 'max:120'],
            'street' => ['sometimes', 'nullable', 'string', 'max:160'],
            'building' => ['sometimes', 'nullable', 'string', 'max:80'],
            'profile_picture_url' => ['sometimes', 'nullable', 'url', 'max:2048'],
        ]);

        if (isset($data['email'])) {
            $data['email'] = strtolower($data['email']);
        }

        $nameParts = [
            $data['first_name'] ?? $user->first_name,
            $data['father_name'] ?? $user->father_name,
            $data['last_name'] ?? $user->last_name,
        ];

        $displayName = trim(implode(' ', array_filter($nameParts)));
        if ($displayName !== '') {
            $data['name'] = $displayName;
        }

        $user->update($data);
        $user->forceFill(['is_verified' => $this->isProfileVerified($user->fresh())])->save();

        return response()->json([
            'user' => $user->fresh()->load('roles'),
            'stats' => $this->stats($request),
        ]);
    }

    public function updateProfilePicture(Request $request)
    {
        $request->validate([
            'profile_picture' => ['required', 'image', 'mimes:jpg,jpeg,png,webp', 'max:4096'],
        ]);

        $path = $request->file('profile_picture')->store('profile-pictures', 'public');
        $user = $request->user();

        $user->forceFill([
            'profile_picture_url' => $this->publicStorageUrl($request, $path),
        ])->save();

        $user->forceFill(['is_verified' => $this->isProfileVerified($user->fresh())])->save();

        return response()->json([
            'message' => 'Profile picture updated.',
            'user' => $user->fresh()->load('roles'),
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

    private function publicStorageUrl(Request $request, string $path): string
    {
        return rtrim($request->getSchemeAndHttpHost(), '/').Storage::url($path);
    }

    private function stats(Request $request): array
    {
        $stats = $request->user()
            ->issues()
            ->selectRaw('COUNT(*) as submitted')
            ->selectRaw("COALESCE(SUM(CASE WHEN status = 'resolved' THEN 1 ELSE 0 END), 0) as resolved")
            ->selectRaw("COALESCE(SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END), 0) as in_progress")
            ->first();

        return [
            'submitted' => (int) ($stats->submitted ?? 0),
            'resolved' => (int) ($stats->resolved ?? 0),
            'in_progress' => (int) ($stats->in_progress ?? 0),
        ];
    }

    private function isProfileVerified($user): bool
    {
        return collect([
            $user->first_name,
            $user->father_name,
            $user->last_name,
            $user->email,
            $user->phone,
            $user->country,
            $user->city,
            $user->area,
            $user->street,
            $user->building,
            $user->profile_picture_url,
        ])->every(fn ($value) => filled($value));
    }
}
