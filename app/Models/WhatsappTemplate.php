<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class WhatsappTemplate extends Model
{
    protected $fillable = [
        'store_id', 'meta_id', 'name', 'language', 'category',
        'status', 'body', 'components', 'rejected_reason',
    ];

    protected $casts = ['components' => 'array'];

    public function store(): BelongsTo
    {
        return $this->belongsTo(Store::class);
    }

    /** How many {{n}} blanks the body declares — the count Meta expects. */
    public function variableCount(): int
    {
        // The body column can be empty for a template created in WhatsApp
        // Manager and never refreshed, so fall back to the components Meta
        // returned. Guessing zero here means sending no parameters at all,
        // which Meta rejects just as firmly as sending too many.
        $text = (string) ($this->body ?: $this->bodyFromComponents());

        preg_match_all('/\{\{\s*(\d+)\s*\}\}/', $text, $m);

        return $m[1] ? max(array_map('intval', $m[1])) : 0;
    }

    public function bodyFromComponents(): ?string
    {
        foreach ($this->components ?? [] as $component) {
            if (strtoupper($component['type'] ?? '') === 'BODY') {
                return $component['text'] ?? null;
            }
        }

        return null;
    }

    /**
     * A URL button carrying a variable, if the template has one.
     *
     * Meta counts such a button as its own required parameter, and the
     * value it wants is only the part of the link after the fixed prefix.
     */
    public function urlButton(): ?array
    {
        foreach ($this->components ?? [] as $component) {
            if (strtoupper($component['type'] ?? '') !== 'BUTTONS') {
                continue;
            }

            foreach ($component['buttons'] ?? [] as $i => $button) {
                $url = (string) ($button['url'] ?? '');

                if (strtoupper($button['type'] ?? '') === 'URL' && str_contains($url, '{{')) {
                    return ['index' => $i, 'url' => $url];
                }
            }
        }

        return null;
    }

    /** The header format Meta expects, if any: DOCUMENT, IMAGE, TEXT… */
    public function headerFormat(): ?string
    {
        foreach ($this->components ?? [] as $component) {
            if (strtoupper($component['type'] ?? '') === 'HEADER') {
                return strtoupper($component['format'] ?? 'TEXT');
            }
        }

        return null;
    }

    /** Does this template expect a PDF attached to its header? */
    public function hasDocumentHeader(): bool
    {
        foreach ($this->components ?? [] as $component) {
            if (($component['type'] ?? '') === 'HEADER' && ($component['format'] ?? '') === 'DOCUMENT') {
                return true;
            }
        }

        return false;
    }

    public function isApproved(): bool
    {
        return $this->status === 'APPROVED';
    }
}
