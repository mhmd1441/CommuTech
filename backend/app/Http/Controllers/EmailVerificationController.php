<?php

namespace App\Http\Controllers;

use App\Mail\EmailVerificationMail;
use App\Models\CommuTechNotification;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Validation\ValidationException;

class EmailVerificationController extends Controller
{
    public function resend(Request $request)
    {
        $data  = $request->validate(['email' => ['required', 'email']]);
        $email = strtolower($data['email']);

        // Must have a pending registration in cache
        $pending = Cache::get("pending_reg_{$email}");
        if (! $pending) {
            return response()->json([
                'message' => 'Registration session expired. Please register again.',
            ], 422);
        }

        // Enforce resend cooldown
        $existing = DB::table('password_reset_otps')
            ->where('email', $email)
            ->where('type', 'email_verification')
            ->first();

        if ($existing && $existing->resend_available_at && now()->isBefore($existing->resend_available_at)) {
            $secondsLeft = (int) now()->diffInSeconds($existing->resend_available_at);

            return response()->json([
                'message'     => 'Please wait before requesting a new code.',
                'retry_after' => $secondsLeft,
            ], 429);
        }

        $otp = str_pad(random_int(0, 999999), 6, '0', STR_PAD_LEFT);

        if (app()->isLocal()) {
            \Log::info("Email verification OTP for {$email}: {$otp}");
        }

        DB::table('password_reset_otps')
            ->where('email', $email)
            ->where('type', 'email_verification')
            ->delete();

        DB::table('password_reset_otps')->insert([
            'email'               => $email,
            'type'                => 'email_verification',
            'otp'                 => Hash::make($otp),
            'attempts'            => 0,
            'expires_at'          => now()->addMinutes(10),
            'resend_available_at' => now()->addSeconds(60),
            'created_at'          => now(),
            'updated_at'          => now(),
        ]);

        // Refresh the cache TTL so pending data doesn't expire before the new OTP
        Cache::put("pending_reg_{$email}", $pending, now()->addMinutes(15));

        try {
            Mail::to($email)->send(new EmailVerificationMail($otp, $pending['first_name']));
        } catch (\Throwable $e) {
            \Log::warning('Verification email failed: '.$e->getMessage());
        }

        return response()->json(['message' => 'Verification code resent.']);
    }

    public function verify(Request $request)
    {
        $data = $request->validate([
            'email' => ['required', 'email'],
            'otp'   => ['required', 'string', 'size:6'],
        ]);

        $email  = strtolower($data['email']);
        $record = DB::table('password_reset_otps')
            ->where('email', $email)
            ->where('type', 'email_verification')
            ->first();

        if (! $record || now()->isAfter($record->expires_at)) {
            throw ValidationException::withMessages([
                'otp' => ['Code expired. Please request a new one.'],
            ]);
        }

        if ($record->attempts >= 5) {
            DB::table('password_reset_otps')
                ->where('email', $email)
                ->where('type', 'email_verification')
                ->delete();
            throw ValidationException::withMessages([
                'otp' => ['Too many failed attempts. Please request a new code.'],
            ]);
        }

        if (! Hash::check($data['otp'], $record->otp)) {
            $newAttempts = $record->attempts + 1;
            DB::table('password_reset_otps')
                ->where('email', $email)
                ->where('type', 'email_verification')
                ->update(['attempts' => $newAttempts, 'updated_at' => now()]);

            if ($newAttempts >= 5) {
                DB::table('password_reset_otps')
                    ->where('email', $email)
                    ->where('type', 'email_verification')
                    ->delete();
                throw ValidationException::withMessages([
                    'otp' => ['Too many failed attempts. Please request a new code.'],
                ]);
            }

            $remaining = 5 - $newAttempts;
            throw ValidationException::withMessages([
                'otp' => ["Invalid code. {$remaining} attempt(s) remaining."],
            ]);
        }

        // OTP correct — retrieve pending registration data
        $pending = Cache::get("pending_reg_{$email}");
        if (! $pending) {
            throw ValidationException::withMessages([
                'otp' => ['Registration session expired. Please register again.'],
            ]);
        }

        // Create the user
        try {
            $name = trim($pending['first_name'].' '.$pending['last_name']);
            $user = User::create([
                'name'           => $name,
                'first_name'     => $pending['first_name'],
                'last_name'      => $pending['last_name'],
                'email'          => $email,
                'role'           => User::ROLE_CITIZEN,
                'phone'          => $pending['phone'] ?? null,
                'country'        => 'Lebanon',
                'city'           => $pending['city'],
                'password'       => $pending['password'],
                'email_verified' => true,
            ]);
        } catch (\Illuminate\Database\QueryException $e) {
            throw ValidationException::withMessages([
                'email' => ['This email or phone is already registered. Please log in.'],
            ]);
        }

        $user->syncRolesByName([User::ROLE_CITIZEN]);

        // Clean up OTP and cache
        DB::table('password_reset_otps')
            ->where('email', $email)
            ->where('type', 'email_verification')
            ->delete();
        Cache::forget("pending_reg_{$email}");

        // Welcome notification
        $notification = CommuTechNotification::create([
            'user_id'        => $user->id,
            'type'           => 'system',
            'recipient_role' => 'citizen',
            'title'          => 'Welcome to CommuTech',
            'body'           => 'Your CommuTech account is ready. You can now submit and track civic reports.',
        ]);
        try { \App\Events\NotificationSent::dispatch($notification); } catch (\Throwable $e) { \Log::warning('Broadcast failed: '.$e->getMessage()); }

        return response()->json([
            'message'      => 'Email verified. Account created successfully.',
            'user'         => $user->fresh()->load('roles'),
            'access_token' => $user->createToken('mobile')->plainTextToken,
            'token_type'   => 'Bearer',
        ], 201);
    }
}
