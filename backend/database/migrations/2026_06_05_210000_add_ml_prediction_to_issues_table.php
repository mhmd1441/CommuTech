<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('issues', function (Blueprint $table) {
            $table->string('ai_category')->nullable()->after('ai_score');
            $table->decimal('ai_confidence', 5, 4)->nullable()->after('ai_category');
        });
    }

    public function down(): void
    {
        Schema::table('issues', function (Blueprint $table) {
            $table->dropColumn(['ai_category', 'ai_confidence']);
        });
    }
};
