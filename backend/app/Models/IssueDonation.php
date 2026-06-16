<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class IssueDonation extends Model
{
    use HasFactory;

    public const STATUS_CONFIRMED = 'confirmed';

    public const STATUS_REFUNDED = 'refunded';

    protected $fillable = [
        'issue_id',
        'user_id',
        'amount',
        'status',
        'refunded_at',
    ];

    protected function casts(): array
    {
        return [
            'amount' => 'decimal:2',
            'refunded_at' => 'datetime',
        ];
    }

    public function issue()
    {
        return $this->belongsTo(Issue::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
