<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Purchase extends Model
{
    protected $fillable = [
        'store_id', 'recorded_by', 'supplier',
        'product_name', 'qty', 'cost',
        'gst_percent', 'gst_amount', 'total',
        'purchase_date', 'notes',
    ];

    protected $casts = [
        'qty' => 'integer',
        'cost' => 'decimal:2',
        'gst_percent' => 'decimal:2',
        'gst_amount' => 'decimal:2',
        'total' => 'decimal:2',
        'purchase_date' => 'date',
    ];

    public function store(): BelongsTo
    {
        return $this->belongsTo(Store::class);
    }

    public function recorder(): BelongsTo
    {
        return $this->belongsTo(User::class, 'recorded_by');
    }
}
