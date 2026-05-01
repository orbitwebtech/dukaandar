<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Customer extends Model
{
    protected $fillable = [
        'store_id', 'name', 'whatsapp', 'city', 'address', 'size_pref',
        'type', 'notes', 'total_orders', 'total_spent',
        'last_order_date', 'review_prompt_counter', 'reviewed_at',
    ];

    protected $casts = [
        'size_pref' => 'array',
        'total_spent' => 'decimal:2',
        'last_order_date' => 'date',
        'reviewed_at' => 'datetime',
    ];

    public function store(): BelongsTo
    {
        return $this->belongsTo(Store::class);
    }

    public function orders(): HasMany
    {
        return $this->hasMany(Order::class);
    }

    public function updateStats(): void
    {
        $this->total_orders = $this->orders()->whereIn('status', ['confirmed', 'delivered'])->count();
        $this->total_spent = $this->orders()->whereIn('status', ['confirmed', 'delivered'])->sum('total');
        $this->last_order_date = $this->orders()->whereIn('status', ['confirmed', 'delivered'])->max('order_date');

        if ($this->total_orders >= 5) {
            $this->type = 'vip';
        } elseif ($this->total_orders >= 2) {
            $this->type = 'regular';
        }

        $this->save();
    }
}
