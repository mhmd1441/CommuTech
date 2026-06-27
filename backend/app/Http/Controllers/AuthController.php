<?php

namespace App\Http\Controllers;

use App\Http\Requests\Auth\ForgotPasswordRequest;
use App\Http\Requests\Auth\LoginRequest;
use App\Http\Requests\Auth\RegisterRequest;
use App\Mail\OtpMail;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Validation\Rules\Password;
use Illuminate\Validation\ValidationException;
use Illuminate\Support\Facades\Http;
use Laravel\Socialite\Facades\Socialite;

class AuthController extends Controller
{
    public function register(RegisterRequest $request)
    {
        $data = $request->validated();
        $email = strtolower($data['email']);

        // Store registration data in cache — user is only created after email is verified
        Cache::put("pending_reg_{$email}", [
            'first_name' => $data['first_name'],
            'last_name'  => $data['last_name'],
            'phone'      => $data['phone'] ?? null,
            'city'       => $data['city'],
            'password'   => $data['password'],
        ], now()->addMinutes(15));

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

        try {
            Mail::to($email)->send(new \App\Mail\EmailVerificationMail($otp, $data['first_name']));
        } catch (\Throwable $e) {
            \Log::warning('Verification email failed: '.$e->getMessage());
        }

        return response()->json([
            'message' => 'Check your email for a 6-digit verification code.',
            'email'   => $email,
        ]);
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
            $existing = DB::table('password_reset_otps')
                ->where('email', $email)
                ->where('type', 'password_reset')
                ->first();

            if ($existing && $existing->resend_available_at && now()->isBefore($existing->resend_available_at)) {
                $secondsLeft = (int) now()->diffInSeconds($existing->resend_available_at);

                return response()->json([
                    'message'     => 'Please wait before requesting a new code.',
                    'retry_after' => $secondsLeft,
                ], 429);
            }

            $otp = str_pad(random_int(0, 999999), 6, '0', STR_PAD_LEFT);

            DB::table('password_reset_otps')
                ->where('email', $email)
                ->where('type', 'password_reset')
                ->delete();

            DB::table('password_reset_otps')->insert([
                'email'               => $email,
                'type'                => 'password_reset',
                'otp'                 => Hash::make($otp),
                'attempts'            => 0,
                'expires_at'          => now()->addMinutes(10),
                'resend_available_at' => now()->addSeconds(60),
                'created_at'          => now(),
                'updated_at'          => now(),
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
            ->where('type', 'password_reset')
            ->first();

        if (! $record || now()->isAfter($record->expires_at)) {
            throw ValidationException::withMessages([
                'otp' => ['Invalid or expired code. Please request a new one.'],
            ]);
        }

        if ($record->attempts >= 5) {
            DB::table('password_reset_otps')
                ->where('email', $email)
                ->where('type', 'password_reset')
                ->delete();
            throw ValidationException::withMessages([
                'otp' => ['Too many failed attempts. Please request a new code.'],
            ]);
        }

        if (! Hash::check($data['otp'], $record->otp)) {
            $newAttempts = $record->attempts + 1;
            DB::table('password_reset_otps')
                ->where('email', $email)
                ->where('type', 'password_reset')
                ->update(['attempts' => $newAttempts, 'updated_at' => now()]);

            if ($newAttempts >= 5) {
                DB::table('password_reset_otps')
                    ->where('email', $email)
                    ->where('type', 'password_reset')
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

        return response()->json(['message' => 'Code verified.']);
    }

    public function googleStart(Request $request)
    {
        $returnUrl = $request->query('return_url', '');
        $state     = \Str::random(40);
        Cache::put("google_oauth_{$state}", $returnUrl, now()->addMinutes(10));

        return Socialite::driver('google')
            ->stateless()
            ->with(['state' => $state])
            ->redirect();
    }

    public function googleCallback(Request $request)
    {
        $state     = $request->query('state', '');
        $returnUrl = Cache::pull("google_oauth_{$state}", '');

        try {
            $googleUser = Socialite::driver('google')->stateless()->user();
        } catch (\Throwable $e) {
            return response('<h3>Authentication failed. Please close this window and try again.</h3>', 400)
                ->header('Content-Type', 'text/html');
        }

        $user = User::updateOrCreate(
            ['email' => strtolower($googleUser->getEmail())],
            [
                'name'      => $googleUser->getName() ?? $googleUser->getEmail(),
                'google_id' => $googleUser->getId(),
                'password'  => Hash::make(\Str::random(24)),
            ]
        );

        if (! $user->hasAnyRole(['citizen', 'worker', 'municipality'])) {
            $user->syncRolesByName(['citizen']);
        }

        $token = $user->createToken('mobile')->plainTextToken;

        if ($returnUrl) {
            $sep = str_contains($returnUrl, '?') ? '&' : '?';
            return redirect($returnUrl . $sep . 'token=' . urlencode($token));
        }

        return response()->json(['token' => $token]);
    }

    public function googleTokenLogin(Request $request)
    {
        $request->validate(['token' => ['required', 'string']]);

        try {
            // Exchange authorization code for access token
            $tokenResponse = Http::post('https://oauth2.googleapis.com/token', [
                'code'          => $request->token,
                'client_id'     => config('services.google.client_id'),
                'client_secret' => config('services.google.client_secret'),
                'redirect_uri'  => 'https://auth.expo.io/@mhmd1441/commutech',
                'grant_type'    => 'authorization_code',
            ]);

            if ($tokenResponse->failed()) {
                return response()->json(['message' => 'Failed to exchange Google code.'], 401);
            }

            $accessToken = $tokenResponse->json()['access_token'];
            $googleUser  = Socialite::driver('google')->stateless()->userFromToken($accessToken);
        } catch (\Throwable $e) {
            return response()->json(['message' => 'Invalid Google token.'], 401);
        }

        $user = User::updateOrCreate(
            ['email' => strtolower($googleUser->getEmail())],
            [
                'name'      => $googleUser->getName() ?? $googleUser->getEmail(),
                'google_id' => $googleUser->getId(),
                'password'  => Hash::make(\Str::random(24)),
            ]
        );

        if (! $user->hasAnyRole(['citizen', 'worker', 'municipality'])) {
            $user->syncRolesByName(['citizen']);
        }

        return response()->json([
            'message'      => 'Logged in successfully.',
            'user'         => $user->load('roles'),
            'access_token' => $user->createToken('mobile')->plainTextToken,
            'token_type'   => 'Bearer',
        ]);
    }

    public function resetPassword(Request $request)
    {
        $data = $request->validate([
            'email'    => ['required', 'email'],
            'otp'      => ['required', 'string', 'size:6'],
            'password' => ['required', 'confirmed', Password::min(8)->letters()->numbers()],
        ]);

        $email  = strtolower($data['email']);
        $record = DB::table('password_reset_otps')
            ->where('email', $email)
            ->where('type', 'password_reset')
            ->first();

        if (! $record || now()->isAfter($record->expires_at)) {
            throw ValidationException::withMessages([
                'otp' => ['Invalid or expired code. Please request a new one.'],
            ]);
        }

        if ($record->attempts >= 5 || ! Hash::check($data['otp'], $record->otp)) {
            DB::table('password_reset_otps')
                ->where('email', $email)
                ->where('type', 'password_reset')
                ->delete();
            throw ValidationException::withMessages([
                'otp' => ['Invalid or expired code. Please request a new one.'],
            ]);
        }

        User::where('email', $email)->update([
            'password' => Hash::make($data['password']),
        ]);

        DB::table('password_reset_otps')
            ->where('email', $email)
            ->where('type', 'password_reset')
            ->delete();

        return response()->json(['message' => 'Password reset successfully.']);
    }
}
