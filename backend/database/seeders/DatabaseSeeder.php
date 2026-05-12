<?php

namespace Database\Seeders;

use App\Models\CommuTechNotification;
use App\Models\Issue;
use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        $admin = User::factory()->create([
            'name' => 'CommuTech Admin',
            'first_name' => 'CommuTech',
            'last_name' => 'Admin',
            'email' => 'admin@commutech.local',
            'role' => User::ROLE_ADMIN,
            'phone' => '+961 70111222',
            'city' => 'Beirut',
        ]);
        $admin->syncRolesByName([User::ROLE_ADMIN]);

        $worker = User::factory()->create([
            'name' => 'CommuTech Worker',
            'first_name' => 'CommuTech',
            'last_name' => 'Worker',
            'email' => 'worker@commutech.local',
            'role' => User::ROLE_WORKER,
            'phone' => '+961 71112233',
            'city' => 'Beirut',
        ]);
        $worker->syncRolesByName([User::ROLE_WORKER]);

        $user = User::factory()->create([
            'name' => 'CommuTech Citizen',
            'first_name' => 'CommuTech',
            'last_name' => 'Citizen',
            'email' => 'test@example.com',
            'role' => User::ROLE_CITIZEN,
            'phone' => '+961 70123456',
            'city' => 'Beirut',
            'street' => 'Hamra',
        ]);
        $user->syncRolesByName([User::ROLE_CITIZEN]);

        $issues = collect([
            [
                'title' => 'Traffic light not working',
                'description' => 'The traffic light at the intersection has stopped working since morning and is causing traffic confusion.',
                'category' => 'Traffic & Signals',
                'status' => 'pending',
                'priority' => 'high',
                'location' => 'Hamra, Beirut',
                'image_url' => 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?q=80&w=800&auto=format&fit=crop',
            ],
            [
                'title' => 'Streetlight damaged',
                'description' => 'One of the streetlights on the main road is broken and the area becomes very dark at night.',
                'category' => 'Street Lighting & Electricity',
                'status' => 'in_progress',
                'priority' => 'medium',
                'location' => 'Verdun, Beirut',
                'image_url' => 'https://images.unsplash.com/photo-1516321497487-e288fb19713f?q=80&w=800&auto=format&fit=crop',
            ],
        ])->map(fn (array $data) => Issue::create([
            ...$data,
            'user_id' => $user->id,
            'ai_score' => 72,
        ]));

        foreach ($issues as $issue) {
            CommuTechNotification::create([
                'user_id' => $user->id,
                'issue_id' => $issue->id,
                'type' => 'status_update',
                'title' => 'Report Updated',
                'body' => 'Your report "'.$issue->title.'" is currently '.$issue->status.'.',
            ]);
        }
    }
}
