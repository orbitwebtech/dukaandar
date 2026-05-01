<?php

namespace App\Models;

use App\Support\Permissions;
use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;

class User extends Authenticatable implements MustVerifyEmail
{
    use Notifiable;

    protected $fillable = ['organization_id', 'system_role', 'name', 'phone', 'email', 'password', 'email_verified_at'];

    protected $hidden = ['password', 'remember_token'];

    protected function casts(): array
    {
        return [
            'password' => 'hashed',
            'email_verified_at' => 'datetime',
        ];
    }

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }

    public function ownedOrganizations(): HasMany
    {
        return $this->hasMany(Organization::class, 'owner_user_id');
    }

    public function stores(): BelongsToMany
    {
        return $this->belongsToMany(Store::class)
            ->using(StoreUser::class)
            ->withPivot(['id', 'role', 'permissions'])
            ->withTimestamps();
    }

    public function isSuperAdmin(): bool
    {
        return $this->system_role === 'super_admin';
    }

    public function isOwnerOf(Organization|Store $target): bool
    {
        $orgId = $target instanceof Organization ? $target->id : $target->organization_id;
        return $this->organization_id === $orgId
            && Organization::where('id', $orgId)->where('owner_user_id', $this->id)->exists();
    }

    public function membershipFor(Store $store): ?StoreUser
    {
        return StoreUser::where('store_id', $store->id)
            ->where('user_id', $this->id)
            ->first();
    }

    public function roleIn(Store $store): ?string
    {
        return $this->membershipFor($store)?->role;
    }

    public function canAccessStore(Store $store): bool
    {
        if ($this->isSuperAdmin()) return true;
        if ($this->isOwnerOf($store)) return true;
        return $this->membershipFor($store) !== null;
    }

    public function hasPermission(Store $store, string $permission): bool
    {
        if ($this->isSuperAdmin()) return true;
        if ($this->isOwnerOf($store)) return true;

        $membership = $this->membershipFor($store);
        if (!$membership) return false;

        $perms = $membership->permissions ?? Permissions::defaultsFor($membership->role);
        return in_array($permission, $perms, true);
    }
}
