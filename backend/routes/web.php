<?php

use App\Http\Controllers\Admin\AdminChatController;
use App\Http\Controllers\Admin\AiSummaryController;
use App\Http\Controllers\Admin\AuthPageController;
use App\Http\Controllers\Admin\ChatPageController;
use App\Http\Controllers\Admin\DashboardPageController;
use App\Http\Controllers\Admin\ReportPageController;
use App\Http\Controllers\Admin\UserPageController;
use App\Http\Controllers\PublicIssueStatusController;
use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return redirect()->route('admin.login');
});

Route::redirect('/admin', '/admin/dashboard');

Route::get('/issue/{id}/status', [PublicIssueStatusController::class, 'show'])
    ->name('issue.public.status')
    ->middleware('throttle:60,1');

Route::get('/issue/{id}/sticker', [PublicIssueStatusController::class, 'sticker'])
    ->name('issue.public.sticker')
    ->middleware('throttle:60,1');

Route::get('/issue/{id}/sticker-image', [PublicIssueStatusController::class, 'stickerImage'])
    ->name('issue.public.sticker.image')
    ->middleware('throttle:60,1');

Route::prefix('admin')->name('admin.')->group(function () {
    Route::get('/login', [AuthPageController::class, 'showLogin'])->name('login');
    Route::post('/login', [AuthPageController::class, 'login'])->name('login.store');

    Route::middleware(['auth', 'role:admin'])->group(function () {
        Route::get('/dashboard', [DashboardPageController::class, 'index'])->name('dashboard');
        Route::get('/ai-briefing', AiSummaryController::class)->name('ai-briefing');

        Route::prefix('reports')->name('reports.')->controller(ReportPageController::class)->group(function () {
            Route::get('/', 'index')->name('index');
            Route::get('/create', 'create')->name('create');
            Route::post('/', 'store')->name('store');
            Route::get('/{report}', 'show')->name('show');
            Route::get('/{report}/edit', 'edit')->name('edit');
            Route::post('/{report}/funding/approve', 'approveFunding')->name('funding.approve');
            Route::post('/{report}/funding/reject', 'rejectFunding')->name('funding.reject');
            Route::post('/{report}/funding/update', 'updateFunding')->name('funding.update');
            Route::put('/{report}', 'update')->name('update');
            Route::delete('/{report}', 'destroy')->name('destroy');
        });

        Route::prefix('users')->name('users.')->controller(UserPageController::class)->group(function () {
            Route::get('/', 'index')->name('index');
            Route::get('/create', 'create')->name('create');
            Route::post('/', 'store')->name('store');
            Route::get('/{user}/edit', 'edit')->name('edit');
            Route::put('/{user}', 'update')->name('update');
            Route::delete('/{user}', 'destroy')->name('destroy');
        });

        // issue search for chat tagging
        Route::get('/issues/search', function (\Illuminate\Http\Request $request) {
            $q = $request->get('q', '');
            $issues = \App\Models\Issue::query()
                ->when($q, fn($query) => $query->where('title', 'ilike', "%{$q}%")
                    ->orWhere('id', 'like', "%{$q}%"))
                ->orderBy('created_at', 'desc')
                ->limit($q ? 8 : 5)
                ->get(['id', 'title', 'status', 'municipality_en']);
            return response()->json($issues);
        })->name('issues.search');

        Route::prefix('chat')->name('chat.')->group(function () {
            Route::get('/', [ChatPageController::class, 'index'])->name('index');
            Route::get('/{conversation}', [ChatPageController::class, 'show'])->name('show');
            // write actions — session auth, no token needed
            Route::post('/{conversation}/messages', [AdminChatController::class, 'sendMessage'])->name('messages.store');
            Route::post('/{conversation}/assign', [AdminChatController::class, 'takeOver'])->name('assign');
            Route::patch('/{conversation}/archive', [AdminChatController::class, 'archive'])->name('archive');
            Route::patch('/{conversation}/unarchive', [AdminChatController::class, 'unarchive'])->name('unarchive');
        });

        Route::get('/workers/{worker}', [UserPageController::class, 'workerShow'])->name('workers.show');
        Route::get('/citizens', fn () => redirect()->route('admin.users.index', ['role' => 'citizen']))->name('citizens.index');
        Route::get('/workers', fn () => redirect()->route('admin.users.index', ['role' => 'worker']))->name('workers.index');
        Route::get('/admins', fn () => redirect()->route('admin.users.index', ['role' => 'admin']))->name('admins.index');

        Route::post('/logout', [AuthPageController::class, 'logout'])->name('logout');
    });
});
