<?php

namespace App\Mail;

use App\Models\Issue;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class AdminInvestigationMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public readonly Issue $issue
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(subject: '⚠️ Report Under Investigation — Action Required');
    }

    public function content(): Content
    {
        return new Content(view: 'emails.admin_investigation');
    }
}
