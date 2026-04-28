<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            // Safe drop: only remove if they exist
            if (Schema::hasColumn('users', 'email_verified_at')) {
                $table->dropColumn('email_verified_at');
            }
            if (Schema::hasColumn('users', 'remember_token')) {
                $table->dropColumn('remember_token');
            }

            // Add your simple extra fields
            $table->string('phone')->nullable()->after('name');
            $table->string('country')->nullable()->after('phone');
            $table->string('city')->nullable()->after('country');
            $table->string('street')->nullable()->after('city');
            $table->string('building')->nullable()->after('street');
            $table->decimal('balance_lbp', 16, 2)->default(0)->after('password');
            $table->decimal('balance_usd', 16, 2)->default(0)->after('balance_lbp');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn([
                'phone',
                'country',
                'city',
                'street',
                'building',
                'balance_lbp',
                'balance_usd',
            ]);
        });
    }
};
