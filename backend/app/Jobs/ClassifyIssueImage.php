<?php

namespace App\Jobs;

use App\Http\Controllers\MlController;
use App\Models\Issue;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class ClassifyIssueImage implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 2;
    public int $timeout = 20;

    public function __construct(private int $issueId, private string $imageUrl) {}

    public function handle(): void
    {
        $issue = Issue::find($this->issueId);
        if (! $issue) {
            return;
        }

        $mlUrl = config('services.ml.url');
        if (empty($mlUrl)) {
            return;
        }

        try {
            $response = Http::timeout(15)->get($this->imageUrl);
            if (! $response->successful()) {
                Log::warning("ClassifyIssueImage: could not fetch image for issue {$this->issueId}");
                return;
            }

            $tmpPath = sys_get_temp_dir() . '/' . uniqid('ml_', true) . '.jpg';
            file_put_contents($tmpPath, $response->body());

            $mlResponse = Http::timeout(15)
                ->attach('image', file_get_contents($tmpPath), 'image.jpg')
                ->post("{$mlUrl}/predict");

            @unlink($tmpPath);

            if ($mlResponse->successful()) {
                $data = $mlResponse->json();
                $issue->forceFill([
                    'ai_category'   => $data['category'] ?? null,
                    'ai_confidence' => $data['confidence'] ?? null,
                ])->save();
            }
        } catch (\Throwable $e) {
            Log::warning("ClassifyIssueImage failed for issue {$this->issueId}: " . $e->getMessage());
        }
    }
}
