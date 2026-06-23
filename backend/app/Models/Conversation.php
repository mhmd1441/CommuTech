<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Conversation extends Model
{
    protected $fillable = [
        'worker_id',
        'assigned_admin_id',
        'status',
        'unread_count_admin',
        'unread_count_worker',
        'last_message_at',
        'last_message_preview',
    ];

    protected $casts = [
        'last_message_at' => 'datetime',
    ];

    public function worker(): BelongsTo
    {
        return $this->belongsTo(User::class, 'worker_id');
    }

    public function assignedAdmin(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_admin_id');
    }

    public function messages(): HasMany
    {
        return $this->hasMany(ChatMessage::class);
    }
}
