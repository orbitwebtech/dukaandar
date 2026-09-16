<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class WhatsappConversation extends Model
{
    protected $fillable = [
        'store_id', 'customer_id', 'wa_id', 'profile_name',
        'last_inbound_at', 'last_message_at', 'unread_count',
    ];

    protected $casts = [
        'last_inbound_at' => 'datetime',
        'last_message_at' => 'datetime',
    ];

    public function store(): BelongsTo
    {
        return $this->belongsTo(Store::class);
    }

    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class);
    }

    public function messages(): HasMany
    {
        return $this->hasMany(WhatsappMessage::class);
    }

    /**
     * Meta only allows free-form replies for 24 hours after the customer's
     * last message. Outside that window it is approved templates only.
     */
    public function isWindowOpen(): bool
    {
        return $this->last_inbound_at !== null
            && $this->last_inbound_at->gt(now()->subDay());
    }

    public function windowExpiresAt(): ?\Illuminate\Support\Carbon
    {
        return $this->last_inbound_at?->copy()->addDay();
    }
}
