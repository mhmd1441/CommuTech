<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class MlController extends Controller
{
    public function predict(Request $request)
    {
        $request->validate([
            'image' => ['required', 'image', 'mimes:jpg,jpeg,png,webp', 'max:8192'],
        ]);

        $file = $request->file('image');

        $result = $this->callFlask($file);

        if ($result === null) {
            return response()->json([
                'needs_confirmation' => true,
                'category'           => null,
                'confidence'         => null,
                'error'              => 'ml_unavailable',
            ], 200);
        }

        return response()->json($result, 200);
    }

    public static function callFlask(\Illuminate\Http\UploadedFile $file): ?array
    {
        $url = config('services.ml.url');

        if (empty($url)) {
            return null;
        }

        try {
            $response = Http::timeout(10)
                ->attach('image', file_get_contents($file->getRealPath()), $file->getClientOriginalName())
                ->post("{$url}/predict");

            if ($response->successful()) {
                return $response->json();
            }

            Log::warning('ML service returned error: ' . $response->status() . ' ' . $response->body());
        } catch (\Illuminate\Http\Client\ConnectionException $e) {
            Log::warning('ML service unreachable: ' . $e->getMessage());
        } catch (\Throwable $e) {
            Log::warning('ML service unexpected error: ' . $e->getMessage());
        }

        return null;
    }
}
