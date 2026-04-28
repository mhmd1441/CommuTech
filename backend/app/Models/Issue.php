<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Issue extends Model
{
    use HasFactory;

    public const CATEGORIES = [
        'Roads',
        'Lighting',
        'Traffic',
        'Environment',
        'Water',
        'Sanitation',
    ];

    protected $fillable = [
        'user_id',
        'assigned_to',
        'title',
        'description',
        'category',
        'status',
        'priority',
        'location',
        'latitude',
        'longitude',
        'image_url',
        'ai_score',
        'rejection_reason',
        'resolved_at',
    ];

    protected function casts(): array
    {
        return [
            'latitude' => 'decimal:7',
            'longitude' => 'decimal:7',
            'ai_score' => 'decimal:2',
            'resolved_at' => 'datetime',
        ];
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function assignee()
    {
        return $this->belongsTo(User::class, 'assigned_to');
    }

    public function notifications()
    {
        return $this->hasMany(CommuTechNotification::class);
    }
}
