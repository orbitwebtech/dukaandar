<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class OrganizationSetting extends Model
{
    protected $fillable = ['organization_id', 'key', 'value'];

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }
}
