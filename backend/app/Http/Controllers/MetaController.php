<?php

namespace App\Http\Controllers;

use App\Models\Issue;

class MetaController extends Controller
{
    public function categories()
    {
        return response()->json([
            'categories' => Issue::CATEGORIES,
            'statuses' => ['pending', 'in_progress', 'resolved', 'rejected'],
            'priorities' => ['low', 'medium', 'high', 'critical'],
        ]);
    }
}
