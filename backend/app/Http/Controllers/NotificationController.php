<?php

namespace App\Http\Controllers;

use App\Models\CommuTechNotification;
use Illuminate\Http\Request;

class NotificationController extends Controller
{
    public function index(Request $request)
    {
        $notifications = $request->user()
            ->commuTechNotifications()
            ->with('issue:id,title,status,priority,category,location,image_url')
            ->latest()
            ->paginate(30);

        return response()->json([
            'unread_count' => $request->user()->commuTechNotifications()->whereNull('read_at')->count(),
            'notifications' => $notifications,
        ]);
    }

    public function markRead(Request $request, CommuTechNotification $notification)
    {
        if ($notification->user_id !== $request->user()->id) {
            abort(404);
        }

        $notification->update(['read_at' => now()]);

        return response()->json($notification->fresh());
    }

    public function markAllRead(Request $request)
    {
        $request->user()
            ->commuTechNotifications()
            ->whereNull('read_at')
            ->update(['read_at' => now()]);

        return response()->json(['message' => 'All notifications marked as read.']);
    }
}
