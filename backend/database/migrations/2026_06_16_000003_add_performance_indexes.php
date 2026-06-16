<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // issues — foreign keys exist but PostgreSQL does not auto-index FK columns
        Schema::table('issues', function (Blueprint $table) {
            $table->index('user_id');
            $table->index('assigned_to');
            $table->index('municipality_en');
            $table->index('sla_breached');
        });

        // notifications — composite covers: WHERE user_id = ? AND recipient_role = ? ORDER BY created_at DESC
        Schema::table('commu_tech_notifications', function (Blueprint $table) {
            $table->index(['user_id', 'recipient_role', 'created_at'], 'notifications_user_role_created_index');
        });

        // upvotes — deduplicate first so the unique constraint never fails
        DB::statement(<<<'SQL'
            DELETE FROM issue_upvotes
            WHERE id NOT IN (
                SELECT MIN(id)
                FROM issue_upvotes
                GROUP BY issue_id, user_id
            )
        SQL);

        Schema::table('issue_upvotes', function (Blueprint $table) {
            $table->unique(['issue_id', 'user_id']);
        });
    }

    public function down(): void
    {
        Schema::table('issue_upvotes', function (Blueprint $table) {
            $table->dropUnique(['issue_id', 'user_id']);
        });

        Schema::table('commu_tech_notifications', function (Blueprint $table) {
            $table->dropIndex('notifications_user_role_created_index');
        });

        Schema::table('issues', function (Blueprint $table) {
            $table->dropIndex(['sla_breached']);
            $table->dropIndex(['municipality_en']);
            $table->dropIndex(['assigned_to']);
            $table->dropIndex(['user_id']);
        });
    }
};
