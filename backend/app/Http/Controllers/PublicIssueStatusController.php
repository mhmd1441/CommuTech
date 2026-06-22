<?php

namespace App\Http\Controllers;

use App\Models\Issue;
use Illuminate\Support\Facades\Http;

class PublicIssueStatusController extends Controller
{
    // Windows-only paths — this machine's PHP/GD runtime. Will need updating
    // if this app is ever deployed to a non-Windows server.
    private const FONT_REGULAR = 'C:/Windows/Fonts/segoeui.ttf';
    private const FONT_BOLD = 'C:/Windows/Fonts/segoeuib.ttf';

    private const STATUS_LABELS = [
        'in_progress' => 'In Progress',
        'resolved' => 'Resolved',
        'under_investigation' => 'Resolved — under review',
    ];

    private const STATUS_TONES = [
        'in_progress' => 'info',
        'resolved' => 'success',
        'under_investigation' => 'warning',
    ];

    public function show(string $id)
    {
        try {
            $issue = $this->findPubliclyVisibleIssue($id);

            if (! $issue) {
                return response()->view('public.issue-not-found', [], 404);
            }

            return response()->view('public.issue-status', [
                'category' => $issue->category,
                'imageUrl' => $issue->image_url,
                'statusLabel' => self::STATUS_LABELS[$issue->status] ?? 'In Progress',
                'statusTone' => self::STATUS_TONES[$issue->status] ?? 'info',
                'dueAt' => $issue->due_at,
                'isOverdue' => $issue->status === 'in_progress' && $issue->due_at && $issue->due_at->isPast(),
                'municipality' => $issue->municipality_en,
            ]);
        } catch (\Throwable $e) {
            \Log::warning('Public issue status page failed: '.$e->getMessage());

            return response()->view('public.issue-not-found', [], 404);
        }
    }

    public function sticker(string $id)
    {
        try {
            $issue = $this->findPubliclyVisibleIssue($id);

            if (! $issue) {
                return response()->view('public.issue-not-found', [], 404);
            }

            $publicUrl = rtrim(config('services.public_status.base_url'), '/').'/issue/'.$issue->id.'/status';
            $qrUrl = 'https://api.qrserver.com/v1/create-qr-code/?size=400x400&data='.urlencode($publicUrl);

            return response()->view('public.issue-sticker', [
                'qrUrl' => $qrUrl,
            ]);
        } catch (\Throwable $e) {
            \Log::warning('Public issue sticker page failed: '.$e->getMessage());

            return response()->view('public.issue-not-found', [], 404);
        }
    }

    public function stickerImage(string $id)
    {
        try {
            $issue = $this->findPubliclyVisibleIssue($id);

            if (! $issue) {
                abort(404);
            }

            if (! extension_loaded('gd') || ! file_exists(self::FONT_REGULAR) || ! file_exists(self::FONT_BOLD)) {
                abort(404);
            }

            $publicUrl = rtrim(config('services.public_status.base_url'), '/').'/issue/'.$issue->id.'/status';
            $qrApiUrl = 'https://api.qrserver.com/v1/create-qr-code/?size=400x400&data='.urlencode($publicUrl);

            $qrResponse = Http::timeout(10)->get($qrApiUrl);

            if (! $qrResponse->successful()) {
                abort(404);
            }

            $qrImage = @imagecreatefromstring($qrResponse->body());

            if (! $qrImage) {
                abort(404);
            }

            $qrSize = imagesx($qrImage);
            $padding = 24;
            $textAreaHeight = 100;
            $canvasWidth = $qrSize + ($padding * 2);
            $canvasHeight = $qrSize + $padding + $textAreaHeight;

            $canvas = imagecreatetruecolor($canvasWidth, $canvasHeight);
            $white = imagecolorallocate($canvas, 255, 255, 255);
            imagefill($canvas, 0, 0, $white);
            imagecopy($canvas, $qrImage, $padding, $padding, 0, 0, $qrSize, $qrSize);
            imagedestroy($qrImage);

            $dark = imagecolorallocate($canvas, 15, 23, 42);
            $muted = imagecolorallocate($canvas, 100, 116, 139);

            $this->drawCenteredText($canvas, self::FONT_BOLD, 19, $dark, $canvasWidth, $qrSize + $padding + 34, 'CommuTech');
            $this->drawCenteredText($canvas, self::FONT_REGULAR, 12, $muted, $canvasWidth, $qrSize + $padding + 58, 'Civic Issue Reporting · Hotline 1244');

            ob_start();
            imagepng($canvas);
            $pngData = ob_get_clean();
            imagedestroy($canvas);

            return response($pngData, 200)->header('Content-Type', 'image/png');
        } catch (\Throwable $e) {
            \Log::warning('Sticker image generation failed: '.$e->getMessage());
            abort(404);
        }
    }

    private function drawCenteredText($canvas, string $fontPath, int $size, int $color, int $canvasWidth, int $y, string $text): void
    {
        $bbox = imagettfbbox($size, 0, $fontPath, $text);
        $textWidth = $bbox[2] - $bbox[0];
        $x = (int) (($canvasWidth - $textWidth) / 2);

        imagettftext($canvas, $size, 0, $x, $y, $color, $fontPath, $text);
    }

    private function findPubliclyVisibleIssue(string $id): ?Issue
    {
        if (! ctype_digit($id)) {
            return null;
        }

        $issue = Issue::select(['id', 'category', 'image_url', 'status', 'due_at', 'municipality_en'])
            ->find((int) $id);

        if (! $issue || ! $issue->isPubliclyVisible()) {
            return null;
        }

        return $issue;
    }
}
