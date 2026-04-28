<?php

namespace Database\Factories;

use App\Models\Issue;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Issue>
 */
class IssueFactory extends Factory
{
    protected $model = Issue::class;

    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'title' => fake()->sentence(5),
            'description' => fake()->paragraph(3),
            'category' => fake()->randomElement(Issue::CATEGORIES),
            'status' => fake()->randomElement(['pending', 'in_progress', 'resolved']),
            'priority' => fake()->randomElement(['low', 'medium', 'high']),
            'location' => fake()->randomElement(['Hamra, Beirut', 'Verdun, Beirut', 'Jounieh', 'Tripoli']),
            'latitude' => fake()->latitude(33.80, 34.10),
            'longitude' => fake()->longitude(35.45, 35.70),
            'image_url' => 'https://picsum.photos/seed/'.fake()->uuid().'/800/500',
            'ai_score' => fake()->randomFloat(2, 35, 95),
        ];
    }
}
