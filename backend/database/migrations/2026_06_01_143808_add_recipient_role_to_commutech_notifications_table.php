<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('commu_tech_notifications', function (Blueprint $table) {
            $table->string('recipient_role')->default('citizen')->after('type');
        });
    }

    public function down(): void
    {
        Schema::table('commu_tech_notifications', function (Blueprint $table) {
            $table->dropColumn('recipient_role');
        });
    }
};
