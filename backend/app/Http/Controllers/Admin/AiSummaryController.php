<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Issue;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;

class AiSummaryController extends Controller
{
    public function __invoke(Request $request)
    {
        if ($request->boolean('refresh')) {
            Cache::forget('admin_ai_briefing');
        }

        $cached = Cache::get('admin_ai_briefing');
        if ($cached) {
            return response()->json(['briefing' => $cached, 'cached' => true]);
        }

        $apiKey = config('services.gemini.key');
        if (! $apiKey) {
            return response()->json(['briefing' => null, 'error' => 'not_configured']);
        }

        $briefing = $this->generate($apiKey);

        if ($briefing) {
            Cache::put('admin_ai_briefing', $briefing, now()->addHour());
        }

        return response()->json(['briefing' => $briefing]);
    }

    private function generate(string $apiKey): ?string
    {
        $from = now()->subDays(7);

        $total      = Issue::where('created_at', '>=', $from)->count();
        $resolved   = Issue::where('created_at', '>=', $from)->where('status', 'resolved')->count();
        $pending    = Issue::where('created_at', '>=', $from)->where('status', 'pending')->count();
        $inProgress = Issue::where('created_at', '>=', $from)->where('status', 'in_progress')->count();
        $breached   = Issue::where('created_at', '>=', $from)->where('sla_breached', true)->count();
        $rate       = $total > 0 ? round(($resolved / $total) * 100) : 0;

        $byCategory = Issue::where('created_at', '>=', $from)
            ->select('category', DB::raw('count(*) as total'))
            ->groupBy('category')
            ->orderByDesc('total')
            ->limit(5)
            ->get()
            ->map(fn ($r) => "{$r->category}: {$r->total}")
            ->join(', ');

        $byMunicipality = Issue::where('created_at', '>=', $from)
            ->whereNotNull('municipality_en')
            ->select('municipality_en', DB::raw('count(*) as total'))
            ->groupBy('municipality_en')
            ->orderByDesc('total')
            ->limit(5)
            ->get()
            ->map(fn ($r) => "{$r->municipality_en}: {$r->total}")
            ->join(', ') ?: 'No location data yet';

        $byPriority = Issue::where('created_at', '>=', $from)
            ->select('priority', DB::raw('count(*) as total'))
            ->groupBy('priority')
            ->orderByDesc('total')
            ->get()
            ->map(fn ($r) => "{$r->priority}: {$r->total}")
            ->join(', ');

        $prompt = <<<PROMPT
You are an AI assistant for CommuTech, a Lebanese civic issue reporting platform used by municipalities.
Write a concise admin briefing based on the data below from the past 7 days.

Data:
- Total new reports: {$total}
- Status: {$pending} pending, {$inProgress} in progress, {$resolved} resolved
- Resolution rate: {$rate}%
- SLA breaches: {$breached}
- Top categories: {$byCategory}
- Top municipalities: {$byMunicipality}
- Priority breakdown: {$byPriority}

Write exactly 3 bullet points summarizing the week, then one line starting with "Key Insight:" and one line starting with "Recommendation:".
Use the bullet character "•".
Each bullet must be a complete sentence and the full briefing must finish with a final recommendation line.
Do not stop mid-sentence; if you reach the limit, continue until complete.
Plain text only, no markdown.
PROMPT;

        $model = config('services.gemini.model', 'gemini-2.0-flash');
        $endpoint = "https://generativelanguage.googleapis.com/v1beta/models/{$model}:generateContent";

        $maxAttempts = 4;
        $baseDelay = 1; // seconds

        for ($attempt = 1; $attempt <= $maxAttempts; $attempt++) {
            try {
                $response = Http::timeout(20)
                    ->withHeaders([
                        'x-goog-api-key' => $apiKey,
                        'Content-Type'   => 'application/json',
                    ])
                    ->post($endpoint, [
                        'contents' => [
                            ['parts' => [['text' => $prompt]]],
                        ],
                        'generationConfig' => [
                            'temperature'     => 0.0,
                            'topP'            => 0.8,
                            'maxOutputTokens' => 1200,
                        ],
                    ]);

                if ($response->successful()) {
                    return trim(data_get($response->json(), 'candidates.0.content.parts.0.text'));
                }

                $status = $response->status();
                \Log::warning("Gemini API error (model={$model} attempt={$attempt}): status={$status} body=".$response->body());

                // If model not found, no point retrying
                if ($status === 404) {
                    break;
                }

                // Respect Retry-After header when present
                $retryAfter = $response->header('Retry-After');
                if ($retryAfter) {
                    sleep((int) $retryAfter);
                } elseif ($status === 429 || ($status >= 500 && $status < 600)) {
                    // Exponential backoff with jitter
                    $wait = $baseDelay * (2 ** ($attempt - 1)) + rand(0, 1000) / 1000;
                    usleep((int) ($wait * 1e6));
                } else {
                    // Non-retriable client error
                    break;
                }
            } catch (\Throwable $e) {
                \Log::warning("Gemini briefing failed (attempt={$attempt}): " . $e->getMessage());
                if ($attempt < $maxAttempts) {
                    $wait = $baseDelay * (2 ** ($attempt - 1)) + rand(0, 1000) / 1000;
                    usleep((int) ($wait * 1e6));
                    continue;
                }
            }
        }

        return null;
    }
}
