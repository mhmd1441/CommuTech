<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('issues', function (Blueprint $table) {
            $table->text('worker_resolution_note')->nullable();
            $table->string('worker_resolution_image_url')->nullable();
            $table->timestamp('worker_resolved_at')->nullable();
            $table->boolean('citizen_resolution_confirmed')->nullable();
            $table->text('citizen_resolution_note')->nullable();
            $table->string('citizen_resolution_image_url')->nullable();
            $table->timestamp('citizen_confirmed_at')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('issues', function (Blueprint $table) {
            $table->dropColumn([
                'worker_resolution_note',
                'worker_resolution_image_url',
                'worker_resolved_at',
                'citizen_resolution_confirmed',
                'citizen_resolution_note',
                'citizen_resolution_image_url',
                'citizen_confirmed_at',
            ]);
        });
    }
};
