<?php

namespace App\Http\Controllers;

use App\Http\Requests\Auth\ForgotPasswordRequest;
use App\Http\Requests\Auth\LoginRequest;
use App\Http\Requests\Auth\RegisterRequest;
use App\Mail\OtpMail;
use App\Models\CommuTechNotification;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
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
        $email = strtolower($request->validated()['email']);
        $user  = User::where('email', $email)->first();

        if ($user) {
            $otp = str_pad(random_int(0, 999999), 6, '0', STR_PAD_LEFT);

            DB::table('password_reset_otps')->where('email', $email)->delete();
            DB::table('password_reset_otps')->insert([
                'email'      => $email,
                'otp'        => $otp,
                'expires_at' => now()->addMinutes(10),
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            try {
                Mail::to($email)->send(new OtpMail($otp, $user->first_name ?? $user->name));
            } catch (\Throwable $e) {
                \Log::warning('OTP email failed: '.$e->getMessage());
            }
        }

        return response()->json([
            'message' => 'If this email is registered, a 6-digit code has been sent.',
        ]);
    }

    public function verifyOtp(Request $request)
    {
        $data = $request->validate([
            'email' => ['required', 'email'],
            'otp'   => ['required', 'string', 'size:6'],
        ]);

        $email  = strtolower($data['email']);
        $record = DB::table('password_reset_otps')
            ->where('email', $email)
            ->where('otp', $data['otp'])
            ->first();

        if (! $record || now()->isAfter($record->expires_at)) {
            throw ValidationException::withMessages([
                'otp' => ['Invalid or expired code. Please request a new one.'],
            ]);
        }

        return response()->json(['message' => 'Code verified.']);
    }

    public function resetPassword(Request $request)
    {
        $data = $request->validate([
            'email'    => ['required', 'email'],
            'otp'      => ['required', 'string', 'size:6'],
            'password' => ['required', 'string', 'min:8', 'confirmed'],
        ]);

        $email  = strtolower($data['email']);
        $record = DB::table('password_reset_otps')
            ->where('email', $email)
            ->where('otp', $data['otp'])
            ->first();

        if (! $record || now()->isAfter($record->expires_at)) {
            throw ValidationException::withMessages([
                'otp' => ['Invalid or expired code. Please request a new one.'],
            ]);
        }

        User::where('email', $email)->update([
            'password' => Hash::make($data['password']),
        ]);

        DB::table('password_reset_otps')->where('email', $email)->delete();

        return response()->json(['message' => 'Password reset successfully.']);
    }
}
