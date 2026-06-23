<?php

namespace App\Events;

use App\Models\Conversation;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class ConversationAssigned implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public readonly Conversation $conversation
    ) {}

    public function broadcastOn(): array
    {
        return [new PrivateChannel('admins')];
    }

    public function broadcastAs(): string
    {
        return 'conversation.assigned';
    }

    public function broadcastWith(): array
    {
        return [
            'conversation_id'     => $this->conversation->id,
            'assigned_admin_id'   => $this->conversation->assigned_admin_id,
            'assigned_admin_name' => $this->conversation->assignedAdmin?->name,
        ];
    }
}
