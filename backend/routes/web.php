<?php

use App\Http\Controllers\Admin\AiSummaryController;
use App\Http\Controllers\Admin\AuthPageController;
use App\Http\Controllers\Admin\DashboardPageController;
use App\Http\Controllers\Admin\ReportPageController;
use App\Http\Controllers\Admin\UserPageController;
use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return redirect()->route('admin.login');
});

Route::redirect('/admin', '/admin/dashboard');

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

        Route::get('/workers/{worker}', [UserPageController::class, 'workerShow'])->name('workers.show');
        Route::get('/citizens', fn () => redirect()->route('admin.users.index', ['role' => 'citizen']))->name('citizens.index');
        Route::get('/workers', fn () => redirect()->route('admin.users.index', ['role' => 'worker']))->name('workers.index');
        Route::get('/admins', fn () => redirect()->route('admin.users.index', ['role' => 'admin']))->name('admins.index');

        Route::post('/logout', [AuthPageController::class, 'logout'])->name('logout');
    });
});
