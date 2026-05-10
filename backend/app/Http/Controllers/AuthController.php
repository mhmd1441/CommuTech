<?php

namespace App\Http\Controllers;

use App\Http\Requests\Auth\ForgotPasswordRequest;
use App\Http\Requests\Auth\LoginRequest;
use App\Http\Requests\Auth\RegisterRequest;
use App\Models\CommuTechNotification;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function register(RegisterRequest $request)
    {
        $data = $request->validated();
        $name = trim($data['first_name'].' '.$data['last_name']);

        $user = User::create([
            'name' => $name,
            'first_name' => $data['first_name'],
            'last_name' => $data['last_name'],
            'email' => strtolower($data['email']),
            'role' => User::ROLE_CITIZEN,
            'phone' => $data['phone'] ?? null,
            'country' => 'Lebanon',
            'city' => $data['city'],
            'password' => $data['password'],
        ]);

        $user->syncRolesByName([User::ROLE_CITIZEN]);

        CommuTechNotification::create([
            'user_id' => $user->id,
            'type' => 'system',
            'title' => 'Welcome to CommuTech',
            'body' => 'Your CommuTech account is ready. You can now submit and track civic reports.',
        ]);

        return response()->json([
            'message' => 'Account created successfully.',
            'user' => $user->fresh()->load('roles'),
            'access_token' => $user->createToken('mobile')->plainTextToken,
            'token_type' => 'Bearer',
        ], 201);
    }

    public function login(LoginRequest $request)
    {
        $data = $request->validated();
        $user = User::where('email', strtolower($data['email']))->first();

        if (! $user || ! Hash::check($data['password'], $user->password)) {
            throw ValidationException::withMessages([
                'email' => ['The provided credentials are incorrect.'],
            ]);
        }

        return response()->json([
            'message' => 'Logged in successfully.',
            'user' => $user->load('roles'),
            'access_token' => $user->createToken('mobile')->plainTextToken,
            'token_type' => 'Bearer',
        ]);
    }

    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()?->delete();

        return response()->json(['message' => 'Logged out.']);
    }

    public function forgotPassword(ForgotPasswordRequest $request)
    {
        $request->validated();

        return response()->json([
            'message' => 'If this email exists, reset instructions will be sent.',
        ]);
    }
}
