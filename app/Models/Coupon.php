<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Coupon extends Model
{
    protected $fillable = [
        'store_id', 'name', 'code', 'discount_type', 'discount_value',
        'min_order_value', 'valid_days', 'auto_send_threshold', 'active',
        'times_issued', 'times_redeemed',
    ];

    protected $casts = [
        'discount_value' => 'decimal:2',
        'min_order_value' => 'decimal:2',
        'auto_send_threshold' => 'decimal:2',
        'active' => 'boolean',
    ];

    public function store(): BelongsTo
    {
        return $this->belongsTo(Store::class);
    }

    public function issuances(): HasMany
    {
        return $this->hasMany(CouponIssuance::class);
    }
}
