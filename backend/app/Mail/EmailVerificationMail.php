<?php

namespace App\Mail;

use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;

class EmailVerificationMail extends Mailable
{
    public function __construct(
        public readonly string $otp,
        public readonly string $userName,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(subject: 'Verify Your CommuTech Email');
    }

    public function content(): Content
    {
        return new Content(view: 'emails.verify');
    }
}
