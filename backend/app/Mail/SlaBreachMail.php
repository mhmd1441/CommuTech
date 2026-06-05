<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class SlaBreachMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public readonly Collection $issues
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(subject: '⏰ SLA Breach Alert — '.$this->issues->count().' Overdue Report(s)');
    }

    public function content(): Content
    {
        return new Content(view: 'emails.sla_breach');
    }
}
