<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class OrderItem extends Model
{
    protected $fillable = [
        'order_id', 'store_id', 'product_id', 'variant_id',
        'qty', 'unit_price', 'line_discount_type', 'line_discount_value',
        'line_discount_amount', 'line_total',
    ];

    public function store(): BelongsTo
    {
        return $this->belongsTo(Store::class);
    }

    protected $casts = [
        'unit_price' => 'decimal:2',
        'line_discount_value' => 'decimal:2',
        'line_discount_amount' => 'decimal:2',
        'line_total' => 'decimal:2',
    ];

    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class);
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    public function variant(): BelongsTo
    {
        return $this->belongsTo(ProductVariant::class, 'variant_id');
    }
}
