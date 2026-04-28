<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class CommuTechNotification extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'issue_id',
        'type',
        'title',
        'body',
        'read_at',
    ];

    protected function casts(): array
    {
        return [
            'read_at' => 'datetime',
        ];
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function issue()
    {
        return $this->belongsTo(Issue::class);
    }
}
