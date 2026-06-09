<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        DB::statement('CREATE EXTENSION IF NOT EXISTS postgis SCHEMA extensions');
        DB::statement('SET search_path TO "$user", public, extensions');

        Schema::dropIfExists('municipalities');

        Schema::create('municipalities', function (Blueprint $table) {
            $table->id();
            $table->string('name_en');
            $table->string('name_ar');
            $table->bigInteger('osm_id')->nullable();
            $table->timestamps();
        });

        DB::statement('ALTER TABLE municipalities ADD COLUMN boundary geometry(MULTIPOLYGON,4326)');
        DB::statement('CREATE INDEX municipalities_boundary_gist ON municipalities USING GIST(boundary)');

        Schema::table('issues', function (Blueprint $table) {
            $table->string('municipality_en')->nullable()->after('longitude');
            $table->string('municipality_ar')->nullable()->after('municipality_en');
        });

        Schema::table('users', function (Blueprint $table) {
            $table->string('assigned_municipality')->nullable()->after('area');
        });
    }

    public function down(): void
    {
        DB::statement('DROP INDEX IF EXISTS municipalities_boundary_gist');

        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('assigned_municipality');
        });

        Schema::table('issues', function (Blueprint $table) {
            $table->dropColumn(['municipality_en', 'municipality_ar']);
        });

        Schema::dropIfExists('municipalities');
    }
};
