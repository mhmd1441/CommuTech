<?php

namespace App\Http\Controllers;

use App\Events\NewChatMessage;
use App\Models\ChatMessage;
use App\Models\Conversation;
use App\Models\Issue;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ChatController extends Controller
{
    // GET /api/chat/conversation
    public function getConversation(Request $request): JsonResponse
    {
        $worker = $request->user();

        $conversation = Conversation::firstOrCreate(
            ['worker_id' => $worker->id],
            ['status' => 'open']
        );

        $messages = $conversation->messages()
            ->with('sender:id,name')
            ->orderBy('created_at', 'desc')
            ->limit(50)
            ->get()
            ->reverse()
            ->values();

        // reset worker unread count
        DB::table('conversations')
            ->where('id', $conversation->id)
            ->update(['unread_count_worker' => 0]);

        return response()->json([
            'conversation' => [
                'id'                  => $conversation->id,
                'status'              => $conversation->status,
                'assigned_admin_id'   => $conversation->assigned_admin_id,
                'assigned_admin_name' => $conversation->assignedAdmin?->name,
                'unread_count_worker' => 0,
                'last_message_at'     => $conversation->last_message_at,
            ],
            'messages' => $messages,
        ]);
    }

    // GET /api/chat/conversation/messages?before=message_id
    public function getMessages(Request $request): JsonResponse
    {
        $worker = $request->user();
        $conversation = Conversation::where('worker_id', $worker->id)->firstOrFail();

        $query = $conversation->messages()->with('sender:id,name')->orderBy('created_at', 'desc');

        if ($request->filled('before')) {
            $cursor = ChatMessage::findOrFail($request->before);
            $query->where('created_at', '<', $cursor->created_at);
        }

        $messages = $query->limit(50)->get()->reverse()->values();

        return response()->json(['messages' => $messages]);
    }

    // POST /api/chat/conversation/messages
    public function sendMessage(Request $request): JsonResponse
    {
        $request->validate([
            'body'     => 'required|string|max:2000',
            'issue_id' => 'nullable|integer|exists:issues,id',
        ]);

        $worker = $request->user();

        if (! $worker->hasRole('worker')) {
            return response()->json(['message' => 'Only workers can use this endpoint.'], 403);
        }

        $conversation = Conversation::firstOrCreate(
            ['worker_id' => $worker->id],
            ['status' => 'open']
        );

        $issueTitle = null;
        if ($request->filled('issue_id')) {
            $issueTitle = Issue::find($request->issue_id)?->title;
        }

        $message = ChatMessage::create([
            'conversation_id' => $conversation->id,
            'sender_id'       => $worker->id,
            'sender_role'     => 'worker',
            'body'            => $request->body,
            'issue_id'        => $request->issue_id,
            'issue_title'     => $issueTitle,
        ]);

        $message->load('sender:id,name');

        // atomic increment + update preview
        DB::table('conversations')->where('id', $conversation->id)->update([
            'unread_count_admin'   => DB::raw('unread_count_admin + 1'),
            'last_message_at'      => now(),
            'last_message_preview' => mb_substr($request->body, 0, 100),
        ]);

        broadcast(new NewChatMessage($message, 'admin'));

        return response()->json(['message' => $message], 201);
    }

    // POST /api/chat/conversation/read
    public function markRead(Request $request): JsonResponse
    {
        $worker = $request->user();
        $conversation = Conversation::where('worker_id', $worker->id)->firstOrFail();

        DB::table('conversations')
            ->where('id', $conversation->id)
            ->update(['unread_count_worker' => 0]);

        DB::table('chat_messages')
            ->where('conversation_id', $conversation->id)
            ->whereNull('read_at')
            ->where('sender_role', 'admin')
            ->update(['read_at' => now()]);

        return response()->json(['ok' => true]);
    }
}
