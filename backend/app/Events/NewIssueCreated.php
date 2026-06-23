<?php

namespace App\Events;

use App\Models\Issue;
use Illuminate\Broadcasting\Channel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;

class NewIssueCreated implements ShouldBroadcastNow
{
    use Dispatchable;

    public function __construct(public Issue $issue) {}

    public function broadcastOn(): array
    {
        return [new Channel('issues')];
    }

    public function broadcastAs(): string
    {
        return 'issue.created';
    }

    public function broadcastWith(): array
    {
        return [
            'id'              => $this->issue->id,
            'title'           => $this->issue->title,
            'description'     => $this->issue->description,
            'category'        => $this->issue->category,
            'priority'        => $this->issue->priority,
            'status'          => $this->issue->status,
            'latitude'        => $this->issue->latitude,
            'longitude'       => $this->issue->longitude,
            'location'        => $this->issue->location,
            'municipality_en' => $this->issue->municipality_en,
            'created_at'      => $this->issue->created_at,
            'image_url'       => $this->issue->image_url,
            'user_id'         => $this->issue->user_id,
            'upvotes_count'   => 0,
        ];
    }
}
