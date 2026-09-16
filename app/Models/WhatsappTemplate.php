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
