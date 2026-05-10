<?php

use App\Models\User;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('roles', function (Blueprint $table) {
            $table->id();
            $table->string('name')->unique();
            $table->timestamps();
        });

        Schema::create('role_user', function (Blueprint $table) {
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('role_id')->constrained()->cascadeOnDelete();
            $table->timestamps();

            $table->primary(['user_id', 'role_id']);
        });

        $now = now();

        DB::table('roles')->insert([
            ['name' => User::ROLE_CITIZEN, 'created_at' => $now, 'updated_at' => $now],
            ['name' => User::ROLE_WORKER, 'created_at' => $now, 'updated_at' => $now],
            ['name' => User::ROLE_ADMIN, 'created_at' => $now, 'updated_at' => $now],
        ]);

        $roleIds = DB::table('roles')->pluck('id', 'name');

        DB::table('users')
            ->select(['id', 'role'])
            ->orderBy('id')
            ->chunk(100, function ($users) use ($roleIds, $now) {
                $rows = [];

                foreach ($users as $user) {
                    $roleId = $roleIds[$user->role] ?? $roleIds[User::ROLE_CITIZEN] ?? null;

                    if ($roleId) {
                        $rows[] = [
                            'user_id' => $user->id,
                            'role_id' => $roleId,
                            'created_at' => $now,
                            'updated_at' => $now,
                        ];
                    }
                }

                if ($rows !== []) {
                    DB::table('role_user')->insert($rows);
                }
            });
    }

    public function down(): void
    {
        Schema::dropIfExists('role_user');
        Schema::dropIfExists('roles');
    }
};
