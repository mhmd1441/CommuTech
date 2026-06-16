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
        'under_review',
        'awaiting_funding',
        'in_progress',
        'resolved',
        'under_investigation',
        'rejected',
    ];

    public const FUNDING_STATUSES = [
        'none',
        'requested',
        'open',
        'funded',
        'expired',
    ];

    public const FUNDING_TYPES = [
        'municipal',
        'community',
        'mixed',
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
        'municipality_en',
        'municipality_ar',
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
            'funding_goal' => 'decimal:2',
            'estimated_cost' => 'decimal:2',
            'funding_raised' => 'decimal:2',
            'funding_deadline' => 'datetime',
            'municipality_contribution' => 'decimal:2',
            'funding_approved_at' => 'datetime',
            'funding_funded_at' => 'datetime',
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

    public function upvotes()
    {
        return $this->hasMany(IssueUpvote::class);
    }

    public function donations()
    {
        return $this->hasMany(IssueDonation::class);
    }

    public function confirmedDonations()
    {
        return $this->donations()->where('status', IssueDonation::STATUS_CONFIRMED);
    }

    public function notifications()
    {
        return $this->hasMany(CommuTechNotification::class);
    }

    public function expireFundingIfNeeded(): bool
    {
        if (
            $this->funding_status !== 'open' ||
            ! $this->funding_deadline ||
            $this->funding_deadline->isFuture()
        ) {
            return false;
        }

        $now = now();

        $this->forceFill([
            'funding_status' => 'expired',
        ])->save();

        $this->donations()
            ->where('status', IssueDonation::STATUS_CONFIRMED)
            ->update([
                'status' => IssueDonation::STATUS_REFUNDED,
                'refunded_at' => $now,
                'updated_at' => $now,
            ]);

        return true;
    }

    public function markFundingAsFundedIfGoalReached(): bool
    {
        if (
            $this->funding_status !== 'open' ||
            (float) $this->funding_goal <= 0 ||
            (float) $this->funding_raised < (float) $this->funding_goal
        ) {
            return false;
        }

        $this->forceFill([
            'funding_status' => 'funded',
            'status' => 'pending',
            'funding_funded_at' => now(),
        ])->save();

        return true;
    }

    public function remainingFundingAmount(): float
    {
        return max(0, (float) $this->funding_goal - (float) $this->funding_raised);
    }
}
