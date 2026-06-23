<?php

namespace App\Events;

use App\Models\ChatMessage;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class NewChatMessage implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public readonly ChatMessage $message,
        public readonly string $targetRole // 'admin' or 'worker'
    ) {}

    public function broadcastOn(): array
    {
        if ($this->targetRole === 'admin') {
            return [new PrivateChannel('admins')];
        }

        return [new PrivateChannel('user.' . $this->message->conversation->worker_id)];
    }

    public function broadcastAs(): string
    {
        return 'chat.message';
    }

    public function broadcastWith(): array
    {
        return [
            'id'              => $this->message->id,
            'conversation_id' => $this->message->conversation_id,
            'sender_id'       => $this->message->sender_id,
            'sender_name'     => $this->message->sender->name,
            'sender_role'     => $this->message->sender_role,
            'body'            => $this->message->body,
            'issue_id'        => $this->message->issue_id,
            'issue_title'     => $this->message->issue_title,
            'created_at'      => $this->message->created_at,
        ];
    }
}
