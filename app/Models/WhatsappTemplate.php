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

    public function isApproved(): bool
    {
        return $this->status === 'APPROVED';
    }
}
