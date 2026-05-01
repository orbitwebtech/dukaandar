<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ProductVariant extends Model
{
    protected $fillable = [
        'product_id', 'store_id', 'sku', 'attributes',
        'price', 'stock_qty', 'low_stock_threshold', 'is_default',
    ];

    public function store(): BelongsTo
    {
        return $this->belongsTo(Store::class);
    }

    protected $casts = [
        'attributes' => 'array',
        'price' => 'decimal:2',
        'is_default' => 'boolean',
    ];

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    public function getAttributeLabel(): string
    {
        if (!$this->attributes) return '';
        return collect($this->attributes)->map(fn($v, $k) => "$k: $v")->implode(', ');
    }
}
