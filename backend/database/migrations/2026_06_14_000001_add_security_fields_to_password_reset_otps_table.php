<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('password_reset_otps', function (Blueprint $table) {
            $table->string('otp', 255)->change();
            $table->unsignedTinyInteger('attempts')->default(0)->after('otp');
            $table->timestamp('resend_available_at')->nullable()->after('attempts');
        });
    }

    public function down(): void
    {
        Schema::table('password_reset_otps', function (Blueprint $table) {
            $table->string('otp', 6)->change();
            $table->dropColumn(['attempts', 'resend_available_at']);
        });
    }
};
