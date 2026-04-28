<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            if (Schema::hasColumn('users', 'balance_lbp')) {
                $table->dropColumn('balance_lbp');
            }

            if (Schema::hasColumn('users', 'balance_usd')) {
                $table->dropColumn('balance_usd');
            }
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->decimal('balance_lbp', 16, 2)->default(0)->after('password');
            $table->decimal('balance_usd', 16, 2)->default(0)->after('balance_lbp');
        });
    }
};
