<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Order extends Model
{
    protected $fillable = [
        'store_id', 'order_number', 'customer_id', 'order_date',
        'subtotal', 'discount_type', 'discount_value', 'discount_amount',
        'tax_total', 'prices_include_tax',
        'total', 'payment_method', 'payment_status', 'status',
        'notes', 'invoice_sent', 'coupon_code',
    ];

    protected $casts = [
        'order_date' => 'date',
        'subtotal' => 'decimal:2',
        'discount_value' => 'decimal:2',
        'discount_amount' => 'decimal:2',
        'tax_total' => 'decimal:2',
        'prices_include_tax' => 'boolean',
        'total' => 'decimal:2',
        'invoice_sent' => 'boolean',
    ];

    public function store(): BelongsTo
    {
        return $this->belongsTo(Store::class);
    }

    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class);
    }

    public function items(): HasMany
    {
        return $this->hasMany(OrderItem::class);
    }

    public static function generateOrderNumber(int $storeId): string
    {
        $prefix = 'ORD';
        $lastOrder = static::where('store_id', $storeId)->orderBy('id', 'desc')->first();
        $nextNum = $lastOrder ? (intval(substr($lastOrder->order_number, 4)) + 1) : 1;
        return $prefix . '-' . str_pad($nextNum, 4, '0', STR_PAD_LEFT);
    }
}
