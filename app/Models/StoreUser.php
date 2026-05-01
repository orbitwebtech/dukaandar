<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\Pivot;

class StoreUser extends Pivot
{
    protected $table = 'store_user';

    public $incrementing = true;

    protected $fillable = ['store_id', 'user_id', 'role', 'permissions'];

    protected $casts = [
        'permissions' => 'array',
    ];
}
