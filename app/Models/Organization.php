<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasManyThrough;

class Organization extends Model
{
    protected $fillable = ['name', 'owner_user_id', 'status', 'max_stores', 'billing_cycle', 'trial_ends_at', 'subscription_ends_at'];

    protected $casts = [
        'trial_ends_at' => 'date',
        'subscription_ends_at' => 'date',
        'max_stores' => 'integer',
    ];

    public function owner(): BelongsTo
    {
        return $this->belongsTo(User::class, 'owner_user_id');
    }

    public function users(): HasMany
    {
        return $this->hasMany(User::class);
    }

    public function stores(): HasMany
    {
        return $this->hasMany(Store::class);
    }

    public function invitations(): HasMany
    {
        return $this->hasMany(Invitation::class);
    }

    public function settings(): HasMany
    {
        return $this->hasMany(OrganizationSetting::class);
    }

    public function expenses(): HasMany
    {
        return $this->hasMany(Expense::class);
    }

    public function customers(): HasManyThrough
    {
        return $this->hasManyThrough(Customer::class, Store::class);
    }

    public function products(): HasManyThrough
    {
        return $this->hasManyThrough(Product::class, Store::class);
    }

    public function orders(): HasManyThrough
    {
        return $this->hasManyThrough(Order::class, Store::class);
    }

    public function getSetting(string $key, $default = null)
    {
        $setting = $this->settings()->where('key', $key)->first();
        return $setting ? $setting->value : $default;
    }

    public function setSetting(string $key, $value): void
    {
        $this->settings()->updateOrCreate(['key' => $key], ['value' => $value]);
    }
}
