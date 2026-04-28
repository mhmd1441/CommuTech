<?php

namespace Database\Factories;

use App\Models\CommuTechNotification;
use App\Models\Issue;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\CommuTechNotification>
 */
class CommuTechNotificationFactory extends Factory
{
    protected $model = CommuTechNotification::class;

    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'issue_id' => Issue::factory(),
            'type' => fake()->randomElement(['system', 'new_report', 'status_update', 'assigned', 'resolved']),
            'title' => fake()->sentence(3),
            'body' => fake()->sentence(12),
            'read_at' => fake()->optional()->dateTimeBetween('-1 week'),
        ];
    }
}
