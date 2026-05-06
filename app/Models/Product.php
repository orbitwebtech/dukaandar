<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Product extends Model
{
    protected $fillable = [
        'store_id', 'name', 'sku', 'barcode', 'type', 'category_id',
        'description', 'cost_price', 'tax_rate', 'selling_price', 'stock_qty',
        'low_stock_threshold', 'images', 'status', 'last_restocked_at',
    ];

    protected $casts = [
        'images' => 'array',
        'cost_price' => 'decimal:2',
        'tax_rate' => 'decimal:2',
        'selling_price' => 'decimal:2',
        'last_restocked_at' => 'datetime',
    ];

    public function store(): BelongsTo
    {
        return $this->belongsTo(Store::class);
    }

    public function category(): BelongsTo
    {
        return $this->belongsTo(Category::class);
    }

    public function variants(): HasMany
    {
        return $this->hasMany(ProductVariant::class);
    }

    public function orderItems(): HasMany
    {
        return $this->hasMany(OrderItem::class);
    }

    public function getStockStatus(): string
    {
        $qty = $this->type === 'variable'
            ? $this->variants->sum('stock_qty')
            : $this->stock_qty;

        if ($qty <= 0) return 'out_of_stock';
        if ($this->low_stock_threshold && $qty <= $this->low_stock_threshold) return 'low_stock';
        return 'in_stock';
    }

    public function getTotalStock(): int
    {
        return $this->type === 'variable'
            ? $this->variants->sum('stock_qty')
            : $this->stock_qty;
    }
}
