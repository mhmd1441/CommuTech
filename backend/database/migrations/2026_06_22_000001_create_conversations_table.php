<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('conversations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('worker_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('assigned_admin_id')->nullable()->constrained('users')->nullOnDelete();
            $table->enum('status', ['open', 'archived'])->default('open');
            $table->unsignedInteger('unread_count_admin')->default(0);
            $table->unsignedInteger('unread_count_worker')->default(0);
            $table->timestamp('last_message_at')->nullable();
            $table->string('last_message_preview', 100)->nullable();
            $table->timestamps();

            $table->unique('worker_id'); // one conversation per worker
            $table->index(['assigned_admin_id', 'last_message_at']);
            $table->index('status');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('conversations');
    }
};
