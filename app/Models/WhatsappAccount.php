<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class WhatsappAccount extends Model
{
    protected $fillable = [
        'store_id', 'waba_id', 'phone_number_id', 'display_phone_number', 'verified_name',
        'access_token', 'two_step_pin', 'status', 'quality_rating', 'messaging_tier',
        'last_error', 'last_webhook_at', 'connected_at',
    ];

    protected $casts = [
        'access_token' => 'encrypted',
        'two_step_pin' => 'encrypted',
        'last_webhook_at' => 'datetime',
        'connected_at' => 'datetime',
    ];

    // Never let a token reach a JSON response by accident.
    protected $hidden = ['access_token', 'two_step_pin'];

    public function store(): BelongsTo
    {
        return $this->belongsTo(Store::class);
    }

    public function isConnected(): bool
    {
        return $this->status === 'connected';
    }
}
