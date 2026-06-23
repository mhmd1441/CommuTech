<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Conversation;
use Illuminate\Http\Request;

class ChatPageController extends Controller
{
    public function index(Request $request)
    {
        $filter = $request->get('filter', 'all');
        $admin  = $request->user();

        $query = Conversation::with('worker:id,name,profile_picture_url')
            ->withCount(['messages as unread' => fn ($q) =>
                $q->whereNull('read_at')->where('sender_role', 'worker')
            ])
            ->orderBy('last_message_at', 'desc');

        match ($filter) {
            'mine'       => $query->where('assigned_admin_id', $admin->id)->where('status', 'open'),
            'unassigned' => $query->whereNull('assigned_admin_id')->where('status', 'open'),
            'archived'   => $query->where('status', 'archived'),
            default      => $query->where('status', 'open'),
        };

        $conversations = $query->get();

        return view('admin.chat.index', compact('conversations', 'filter'));
    }

    public function show(Request $request, Conversation $conversation)
    {
        $admin    = $request->user();
        $messages = $conversation->messages()
            ->with('sender:id,name')
            ->orderBy('created_at', 'asc')
            ->get();

        $conversation->load('worker:id,name,profile_picture_url', 'assignedAdmin:id,name');

        // mark as read
        \Illuminate\Support\Facades\DB::table('conversations')
            ->where('id', $conversation->id)
            ->update(['unread_count_admin' => 0]);

        \Illuminate\Support\Facades\DB::table('chat_messages')
            ->where('conversation_id', $conversation->id)
            ->whereNull('read_at')
            ->where('sender_role', 'worker')
            ->update(['read_at' => now()]);

        $canReply = $conversation->assigned_admin_id === null
            || $conversation->assigned_admin_id === $admin->id;

        return view('admin.chat.show', compact('conversation', 'messages', 'canReply', 'admin'));
    }
}
