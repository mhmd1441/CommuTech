<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('issues', function (Blueprint $table) {
            $table->string('funding_status')->default('none')->index();
            $table->string('funding_type')->nullable()->index();
            $table->decimal('funding_goal', 12, 2)->nullable();
            $table->decimal('estimated_cost', 12, 2)->nullable();
            $table->decimal('funding_raised', 12, 2)->default(0);
            $table->timestamp('funding_deadline')->nullable()->index();
            $table->decimal('municipality_contribution', 12, 2)->nullable();
            $table->text('funding_request_note')->nullable();
            $table->timestamp('funding_approved_at')->nullable();
            $table->timestamp('funding_funded_at')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('issues', function (Blueprint $table) {
            $table->dropColumn([
                'funding_status',
                'funding_type',
                'funding_goal',
                'estimated_cost',
                'funding_raised',
                'funding_deadline',
                'municipality_contribution',
                'funding_request_note',
                'funding_approved_at',
                'funding_funded_at',
            ]);
        });
    }
};
