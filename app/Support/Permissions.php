<?php

namespace App\Support;

class Permissions
{
    public const RESOURCES = [
        'products', 'categories', 'customers', 'orders',
        'coupons', 'purchases', 'reports', 'settings',
    ];

    public const ACTIONS = ['create', 'read', 'update', 'delete'];

    public const EXTRA = [
        'team.invite',
        'team.update',
        'team.remove',
    ];

    public static function all(): array
    {
        $perms = [];
        foreach (self::RESOURCES as $resource) {
            foreach (self::ACTIONS as $action) {
                $perms[] = "{$resource}.{$action}";
            }
        }
        return array_merge($perms, self::EXTRA);
    }

    public static function defaultsFor(string $role): array
    {
        return match ($role) {
            'owner' => self::all(),
            'manager' => array_merge(
                self::crudFor(['products', 'categories', 'customers', 'orders', 'coupons', 'purchases']),
                ['reports.read', 'settings.read', 'settings.update', 'team.invite']
            ),
            'employee' => [
                'products.read',
                'categories.read',
                'customers.create', 'customers.read', 'customers.update',
                'orders.create', 'orders.read', 'orders.update',
                'purchases.read',
                'reports.read',
            ],
            default => [],
        };
    }

    public static function grouped(): array
    {
        $groups = [];
        foreach (self::RESOURCES as $resource) {
            $groups[$resource] = array_map(fn($a) => "{$resource}.{$a}", self::ACTIONS);
        }
        $groups['team'] = ['team.invite', 'team.update', 'team.remove'];
        return $groups;
    }

    private static function crudFor(array $resources): array
    {
        $perms = [];
        foreach ($resources as $r) {
            foreach (self::ACTIONS as $a) {
                $perms[] = "{$r}.{$a}";
            }
        }
        return $perms;
    }
}
