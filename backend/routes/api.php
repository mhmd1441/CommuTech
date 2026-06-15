<?php

use App\Http\Controllers\Admin\DashboardController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\EmailVerificationController;
use App\Http\Controllers\IssueController;
use App\Http\Controllers\MetaController;
use App\Http\Controllers\MlController;
use App\Http\Controllers\NotificationController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\UserController;
use App\Http\Controllers\WorkerIssueController;
use Illuminate\Support\Facades\Broadcast;
use Illuminate\Support\Facades\Route;

Route::get('/health', fn () => [
    'status' => 'ok',
    'app' => 'CommuTech API',
]);

Route::get('/categories', [MetaController::class, 'categories']);

Route::prefix('auth')->group(function () {
    Route::controller(AuthController::class)->group(function () {
        Route::post('/register', 'register')->middleware('throttle:5,1');
        Route::post('/login', 'login')->middleware('throttle:10,1');
        Route::post('/forgot-password', 'forgotPassword')->middleware('throttle:5,1');
        Route::post('/verify-otp', 'verifyOtp')->middleware('throttle:5,1');
        Route::post('/reset-password', 'resetPassword')->middleware('throttle:5,1');
    });

    Route::controller(EmailVerificationController::class)->prefix('email')->middleware('throttle:5,1')->group(function () {
        Route::post('/resend', 'resend');
        Route::post('/verify', 'verify');
    });
});

Broadcast::routes(['middleware' => ['auth:sanctum']]);

Route::middleware('auth:sanctum')->group(function () {
    Route::prefix('auth')->controller(AuthController::class)->group(function () {
        Route::post('/logout', 'logout');
    });

    Route::prefix('me')->controller(ProfileController::class)->group(function () {
        Route::get('/', 'show');
        Route::put('/', 'update');
        Route::post('/profile-picture', 'updateProfilePicture');
        Route::put('/password', 'updatePassword');
    });

    Route::post('/ml/predict', [MlController::class, 'predict']);

    Route::prefix('issues')->controller(IssueController::class)->group(function () {
        Route::get('/', 'index');
        Route::post('/', 'store');
        Route::get('/{issue}', 'show');
        Route::post('/{issue}/upvote', 'upvote');
        Route::patch('/{issue}/confirm-resolution', 'confirmResolution');
        Route::put('/{issue}', 'update');
        Route::patch('/{issue}', 'update');
        Route::delete('/{issue}', 'destroy');
    });

    Route::prefix('notifications')->controller(NotificationController::class)->group(function () {
        Route::get('/', 'index');
        Route::patch('/read-all', 'markAllRead');
        Route::patch('/{notification}/read', 'markRead');
    });

    Route::prefix('worker')->middleware('role:worker')->group(function () {
        Route::prefix('issues')->controller(WorkerIssueController::class)->group(function () {
            Route::get('/assigned', 'assigned');
            Route::get('/nearby', 'nearby');
            Route::patch('/{issue}/assign-to-me', 'assignToMe');
            Route::patch('/{issue}/status', 'updateStatus');
            Route::post('/{issue}/status', 'updateStatus');
        });
    });

    Route::prefix('admin')->middleware('role:admin')->group(function () {
        Route::prefix('dashboard')->controller(DashboardController::class)->group(function () {
            Route::get('/summary', 'summary');
            Route::get('/issues/status', 'issueStatus');
            Route::get('/issues/categories', 'issueCategories');
            Route::get('/issues/priorities', 'issuePriorities');
            Route::get('/issues/trend', 'issueTrend');
            Route::get('/recent-issues', 'recentIssues');
            Route::get('/recent-users', 'recentUsers');
        });

        Route::prefix('users')->name('api.admin.users.')->controller(UserController::class)->group(function () {
            Route::get('/', 'index')->name('index');
            Route::post('/', 'store')->name('store');
            Route::get('/{user}', 'show')->name('show');
            Route::put('/{user}', 'update')->name('update');
            Route::patch('/{user}', 'update')->name('patch');
            Route::delete('/{user}', 'destroy')->name('destroy');
        });
    });
});
