<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class WhatsappMessage extends Model
{
    protected $fillable = [
        'store_id', 'whatsapp_conversation_id', 'order_id', 'user_id', 'wamid',
        'direction', 'type', 'body', 'payload', 'media_id', 'media_path',
        'template_name', 'status', 'error_code', 'error_message',
        'sent_at', 'delivered_at', 'read_at',
    ];

    protected $casts = [
        'payload' => 'array',
        'sent_at' => 'datetime',
        'delivered_at' => 'datetime',
        'read_at' => 'datetime',
    ];

    public function conversation(): BelongsTo
    {
        return $this->belongsTo(WhatsappConversation::class, 'whatsapp_conversation_id');
    }

    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class);
    }

    public function sender(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function isInbound(): bool
    {
        return $this->direction === 'inbound';
    }
}
