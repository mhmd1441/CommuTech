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
        'Public Property',
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
        'rejection_reason',
        'resolved_at',
        'worker_resolution_note',
        'worker_resolution_image_url',
        'worker_resolved_at',
        'citizen_resolution_confirmed',
        'citizen_resolution_note',
        'citizen_resolution_image_url',
        'citizen_confirmed_at',
    ];

    protected function casts(): array
    {
        return [
            'latitude' => 'decimal:7',
            'longitude' => 'decimal:7',
            'ai_score' => 'decimal:2',
            'resolved_at' => 'datetime',
            'worker_resolved_at' => 'datetime',
            'citizen_resolution_confirmed' => 'boolean',
            'citizen_confirmed_at' => 'datetime',
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
