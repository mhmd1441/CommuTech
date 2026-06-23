<?php

namespace App\Http\Controllers\Admin;

use App\Events\ConversationAssigned;
use App\Events\NewChatMessage;
use App\Http\Controllers\Controller;
use App\Models\ChatMessage;
use App\Models\Conversation;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AdminChatController extends Controller
{
    // GET /api/admin/chat/conversations
    public function index(Request $request): JsonResponse
    {
        $admin = $request->user();

        $query = Conversation::with('worker:id,name')
            ->withCount(['messages as unread_count' => function ($q) {
                $q->whereNull('read_at')->where('sender_role', 'worker');
            }])
            ->orderBy('last_message_at', 'desc');

        match ($request->filter) {
            'mine'       => $query->where('assigned_admin_id', $admin->id)->where('status', 'open'),
            'unassigned' => $query->whereNull('assigned_admin_id')->where('status', 'open'),
            'archived'   => $query->where('status', 'archived'),
            default      => $query->where('status', 'open'),
        };

        return response()->json(['conversations' => $query->get()]);
    }

    // GET /api/admin/chat/conversations/{id}
    public function show(Request $request, Conversation $conversation): JsonResponse
    {
        $messages = $conversation->messages()
            ->with('sender:id,name')
            ->orderBy('created_at', 'desc')
            ->limit(50)
            ->get()
            ->reverse()
            ->values();

        // reset admin unread count
        DB::table('conversations')
            ->where('id', $conversation->id)
            ->update(['unread_count_admin' => 0]);

        DB::table('chat_messages')
            ->where('conversation_id', $conversation->id)
            ->whereNull('read_at')
            ->where('sender_role', 'worker')
            ->update(['read_at' => now()]);

        return response()->json([
            'conversation' => $conversation->load('worker:id,name', 'assignedAdmin:id,name'),
            'messages'     => $messages,
        ]);
    }

    // GET /api/admin/chat/conversations/{id}/messages?before=message_id
    public function getMessages(Request $request, Conversation $conversation): JsonResponse
    {
        $query = $conversation->messages()->with('sender:id,name')->orderBy('created_at', 'desc');

        if ($request->filled('before')) {
            $cursor = ChatMessage::findOrFail($request->before);
            $query->where('created_at', '<', $cursor->created_at);
        }

        $messages = $query->limit(50)->get()->reverse()->values();

        return response()->json(['messages' => $messages]);
    }

    // POST /api/admin/chat/conversations/{id}/messages
    public function sendMessage(Request $request, Conversation $conversation): JsonResponse
    {
        $request->validate([
            'body'     => 'required|string|max:2000',
            'issue_id' => 'nullable|integer|exists:issues,id',
        ]);

        $admin = $request->user();

        // guard: only assigned admin can reply (or unassigned)
        if (
            $conversation->assigned_admin_id !== null &&
            $conversation->assigned_admin_id !== $admin->id
        ) {
            return response()->json([
                'message' => 'This conversation is assigned to ' . $conversation->assignedAdmin?->name . '.',
            ], 403);
        }

        // auto-assign on first reply — atomic conditional update
        if ($conversation->assigned_admin_id === null) {
            $affected = DB::table('conversations')
                ->where('id', $conversation->id)
                ->whereNull('assigned_admin_id')
                ->update(['assigned_admin_id' => $admin->id]);

            if ($affected === 0) {
                // another admin just won the race
                $conversation->refresh();
                return response()->json([
                    'message' => 'This conversation was just taken by ' . $conversation->assignedAdmin?->name . '.',
                ], 409);
            }

            $conversation->refresh();
            broadcast(new ConversationAssigned($conversation));
        }

        $issueTitle = null;
        if ($request->filled('issue_id')) {
            $issueTitle = \App\Models\Issue::find($request->issue_id)?->title;
        }

        $message = ChatMessage::create([
            'conversation_id' => $conversation->id,
            'sender_id'       => $admin->id,
            'sender_role'     => 'admin',
            'body'            => $request->body,
            'issue_id'        => $request->issue_id,
            'issue_title'     => $issueTitle,
        ]);

        $message->load('sender:id,name');

        DB::table('conversations')->where('id', $conversation->id)->update([
            'unread_count_worker'  => DB::raw('unread_count_worker + 1'),
            'last_message_at'      => now(),
            'last_message_preview' => mb_substr($request->body, 0, 100),
        ]);

        broadcast(new NewChatMessage($message, 'worker'));

        return response()->json(['message' => $message], 201);
    }

    // POST /api/admin/chat/conversations/{id}/assign
    public function takeOver(Request $request, Conversation $conversation): JsonResponse
    {
        $admin = $request->user();

        DB::table('conversations')
            ->where('id', $conversation->id)
            ->update(['assigned_admin_id' => $admin->id]);

        $conversation->refresh();
        broadcast(new ConversationAssigned($conversation));

        return response()->json(['ok' => true, 'assigned_to' => $admin->name]);
    }

    // PATCH /api/admin/chat/conversations/{id}/archive
    public function archive(Conversation $conversation): JsonResponse
    {
        $conversation->update(['status' => 'archived']);

        return response()->json(['ok' => true]);
    }

    // PATCH /api/admin/chat/conversations/{id}/unarchive
    public function unarchive(Conversation $conversation): JsonResponse
    {
        $conversation->update(['status' => 'open']);

        return response()->json(['ok' => true]);
    }
}
