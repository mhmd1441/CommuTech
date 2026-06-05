<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Issue extends Model
{
    use HasFactory;

    public const CATEGORIES = [
        'Roads & Sidewalks',
        'Street Lighting & Electricity',
        'Traffic & Signals',
        'Waste & Sanitation',
        'Water & Drainage',
        'Environment & Public Spaces',
        'Public Safety',
        'Other',
    ];

    public const STATUSES = [
        'pending',
        'in_progress',
        'resolved',
        'under_investigation',
        'rejected',
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
        'ai_category',
        'ai_confidence',
        'rejection_reason',
        'resolved_at',
        'worker_resolution_note',
        'worker_resolution_image_url',
        'worker_resolved_at',
        'citizen_resolution_confirmed',
        'citizen_resolution_note',
        'citizen_resolution_image_url',
        'citizen_confirmed_at',
        'due_at',
        'sla_breached',
    ];

    protected function casts(): array
    {
        return [
            'latitude' => 'decimal:7',
            'longitude' => 'decimal:7',
            'ai_score' => 'decimal:2',
            'ai_confidence' => 'decimal:4',
            'resolved_at' => 'datetime',
            'worker_resolved_at' => 'datetime',
            'citizen_resolution_confirmed' => 'boolean',
            'citizen_confirmed_at' => 'datetime',
            'due_at' => 'datetime',
            'sla_breached' => 'boolean',
        ];
    }

    public static function slaHours(string $priority): int
    {
        return match ($priority) {
            'critical' => 24,
            'high'     => 72,
            'medium'   => 168,
            default    => 336,
        };
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
