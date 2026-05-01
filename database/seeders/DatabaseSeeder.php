<?php

namespace Database\Seeders;

use App\Models\Category;
use App\Models\Coupon;
use App\Models\Customer;
use App\Models\Invitation;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Organization;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\Store;
use App\Models\StoreUser;
use App\Models\User;
use App\Support\Permissions;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        DB::transaction(function () {
            // Super Admin
            User::create([
                'name' => 'Super Admin',
                'email' => 'admin@dukaandar.in',
                'password' => 'password',
                'system_role' => 'super_admin',
                'organization_id' => null,
                'email_verified_at' => now(),
            ]);

            // Org 1 — Shivam Enterprises (multi-store)
            $org = Organization::create([
                'name' => 'Shivam Enterprises',
                'status' => 'active',
                'billing_cycle' => 'monthly',
                'subscription_ends_at' => now()->addMonth(),
            ]);

            $owner = User::create([
                'organization_id' => $org->id,
                'system_role' => 'member',
                'email_verified_at' => now(),
                'name' => 'Shivam Patel',
                'email' => 'owner@dukaandar.in',
                'phone' => '+919876543210',
                'password' => 'password',
            ]);
            $org->update(['owner_user_id' => $owner->id]);

            $storeA = $this->createStore($org, 'Shivam Fashion - Ahmedabad', 'shivam-fashion-ahmedabad', '+919876543210', 'CG Road, Ahmedabad');
            $storeB = $this->createStore($org, 'Shivam Fashion - Surat', 'shivam-fashion-surat', '+919876500200', 'Ring Road, Surat');

            // Owner pivot rows for both stores
            foreach ([$storeA, $storeB] as $s) {
                StoreUser::create([
                    'store_id' => $s->id,
                    'user_id' => $owner->id,
                    'role' => 'owner',
                    'permissions' => Permissions::defaultsFor('owner'),
                ]);
            }

            $this->seedStoreSettings($storeA, 'Shivam Fashion - Ahmedabad', 'Shivam Patel', '+919876543210');
            $this->seedStoreSettings($storeB, 'Shivam Fashion - Surat', 'Shivam Patel', '+919876500200');

            // Manager for store A only
            $manager = User::create([
                'organization_id' => $org->id,
                'system_role' => 'member',
                'email_verified_at' => now(),
                'name' => 'Priya Sharma',
                'email' => 'manager@dukaandar.in',
                'phone' => '+919876511111',
                'password' => 'password',
            ]);
            StoreUser::create([
                'store_id' => $storeA->id,
                'user_id' => $manager->id,
                'role' => 'manager',
                'permissions' => Permissions::defaultsFor('manager'),
            ]);

            // Employee for both stores
            $employee = User::create([
                'organization_id' => $org->id,
                'system_role' => 'member',
                'email_verified_at' => now(),
                'name' => 'Rohan Mehta',
                'email' => 'employee@dukaandar.in',
                'phone' => '+919876522222',
                'password' => 'password',
            ]);
            foreach ([$storeA, $storeB] as $s) {
                StoreUser::create([
                    'store_id' => $s->id,
                    'user_id' => $employee->id,
                    'role' => 'employee',
                    'permissions' => Permissions::defaultsFor('employee'),
                ]);
            }

            // A pending invitation
            $invite = Invitation::create([
                'organization_id' => $org->id,
                'email' => 'newhire@example.com',
                'role' => 'employee',
                'permissions' => Permissions::defaultsFor('employee'),
                'invited_by' => $owner->id,
                'token' => Invitation::generateToken(),
                'expires_at' => now()->addDays(7),
            ]);
            $invite->stores()->attach([$storeB->id]);

            // Per-store catalog + customers + orders
            $this->seedStoreData($storeA, 'Ahmedabad', startOrderNum: 1);
            $this->seedStoreData($storeB, 'Surat', startOrderNum: 1);

            // A coupon per store
            Coupon::create([
                'store_id' => $storeA->id,
                'name' => 'Welcome Discount',
                'code' => 'WELCOME10',
                'discount_type' => 'percent',
                'discount_value' => 10,
                'min_order_value' => 500,
                'valid_days' => 30,
                'active' => true,
            ]);
            Coupon::create([
                'store_id' => $storeB->id,
                'name' => 'Festive Sale',
                'code' => 'FESTIVE100',
                'discount_type' => 'flat',
                'discount_value' => 100,
                'min_order_value' => 1000,
                'valid_days' => 14,
                'active' => true,
            ]);

            // Org 2 — second org on trial (super admin visibility test)
            $org2 = Organization::create([
                'name' => 'Mehta Boutique',
                'status' => 'trial',
                'trial_ends_at' => now()->addDays(7),
            ]);
            $owner2 = User::create([
                'organization_id' => $org2->id,
                'system_role' => 'member',
                'email_verified_at' => now(),
                'name' => 'Anjali Mehta',
                'email' => 'mehta@dukaandar.in',
                'phone' => '+919876599999',
                'password' => 'password',
            ]);
            $org2->update(['owner_user_id' => $owner2->id]);
            $store2 = $this->createStore($org2, 'Mehta Boutique', 'mehta-boutique', '+919876599999', 'Vadodara');
            StoreUser::create([
                'store_id' => $store2->id,
                'user_id' => $owner2->id,
                'role' => 'owner',
                'permissions' => Permissions::defaultsFor('owner'),
            ]);
            $this->seedStoreSettings($store2, 'Mehta Boutique', 'Anjali Mehta', '+919876599999');
            $this->seedStoreData($store2, 'Vadodara', startOrderNum: 1, scale: 0.5);

            $this->command?->info('');
            $this->command?->info('=== Test Logins ===');
            $this->command?->info('Super Admin:  admin@dukaandar.in / password');
            $this->command?->info('Owner:        owner@dukaandar.in / password   (2 stores)');
            $this->command?->info('Manager:      manager@dukaandar.in / password (Ahmedabad only)');
            $this->command?->info('Employee:     employee@dukaandar.in / password (both stores, restricted)');
            $this->command?->info('Org2 Owner:   mehta@dukaandar.in / password   (trial)');
            $this->command?->info('Pending invite link: /invitations/' . $invite->token);
        });
    }

    private function createStore(Organization $org, string $name, string $slug, string $phone, string $address): Store
    {
        return Store::create([
            'organization_id' => $org->id,
            'name' => $name,
            'slug' => $slug,
            'phone' => $phone,
            'address' => $address,
            'status' => 'active',
        ]);
    }

    private function seedStoreSettings(Store $store, string $shopName, string $owner, string $whatsapp): void
    {
        foreach ([
            'shop_name' => $shopName,
            'owner_name' => $owner,
            'whatsapp_number' => $whatsapp,
            'invoice_prefix' => 'ORD',
            'invoice_footer' => 'Thank you for shopping with us!',
            'whatsapp_template' => "Hello [CustomerName],\n\nThank you for your purchase from [ShopName].\n\nYou can find your Invoice on below Link: [InvoiceLink]",
            'review_text' => "Hi [CustomerName],\n\nYou have recently purchased from [ShopName].\n\nWe value our customers and to improve future services please review us on Google: [ReviewLink]\n\nThanks\n[ShopName]",
            'review_reprompt_interval' => '3',
            'slow_moving_days' => '30',
        ] as $k => $v) {
            $store->setSetting($k, $v);
        }
    }

    private function seedStoreData(Store $store, string $cityHint, int $startOrderNum, float $scale = 1.0): void
    {
        // Categories
        $categories = [];
        foreach (['Kurta', 'Saree', 'Lehenga', 'Dupatta', 'Palazzo', 'Suit Set'] as $cat) {
            $categories[$cat] = Category::create(['store_id' => $store->id, 'name' => $cat]);
        }

        // Simple products
        $products = [];
        $simpleProducts = [
            ['name' => 'Cotton Kurta White', 'category' => 'Kurta', 'price' => 599, 'cost' => 350, 'stock' => 45, 'low' => 10],
            ['name' => 'Silk Dupatta Red', 'category' => 'Dupatta', 'price' => 399, 'cost' => 200, 'stock' => 30, 'low' => 5],
            ['name' => 'Palazzo Pant Black', 'category' => 'Palazzo', 'price' => 499, 'cost' => 280, 'stock' => 25, 'low' => 5],
            ['name' => 'Embroidered Suit Set', 'category' => 'Suit Set', 'price' => 1299, 'cost' => 750, 'stock' => 15, 'low' => 3],
            ['name' => 'Georgette Saree Pink', 'category' => 'Saree', 'price' => 899, 'cost' => 500, 'stock' => 20, 'low' => 5],
            ['name' => 'Rayon Kurti Blue', 'category' => 'Kurta', 'price' => 449, 'cost' => 250, 'stock' => 3, 'low' => 10],
        ];

        foreach ($simpleProducts as $sp) {
            $products[] = Product::create([
                'store_id' => $store->id,
                'name' => $sp['name'],
                'sku' => 'SKU-' . strtoupper(substr(md5($store->id . $sp['name']), 0, 6)),
                'type' => 'simple',
                'category_id' => $categories[$sp['category']]->id,
                'selling_price' => $sp['price'],
                'cost_price' => $sp['cost'],
                'stock_qty' => $sp['stock'],
                'low_stock_threshold' => $sp['low'],
                'status' => 'active',
            ]);
        }

        // Variable product
        $varProduct = Product::create([
            'store_id' => $store->id,
            'name' => 'Designer Lehenga',
            'sku' => 'SKU-LEH-' . strtoupper(substr(md5($store->id), 0, 4)),
            'type' => 'variable',
            'category_id' => $categories['Lehenga']->id,
            'cost_price' => 1500,
            'status' => 'active',
        ]);
        $products[] = $varProduct;

        $isFirst = true;
        foreach (['Red', 'Blue', 'Green'] as $color) {
            foreach (['S', 'M', 'L'] as $size) {
                ProductVariant::create([
                    'product_id' => $varProduct->id,
                    'store_id' => $store->id,
                    'sku' => "LEH-{$store->id}-{$color[0]}-{$size}",
                    'attributes' => ['Color' => $color, 'Size' => $size],
                    'price' => 2499 + ($size === 'L' ? 200 : 0),
                    'stock_qty' => rand(3, 15),
                    'low_stock_threshold' => 3,
                    'is_default' => $isFirst,
                ]);
                $isFirst = false;
            }
        }

        // Customers
        $customers = [];
        $customerSet = [
            ['name' => 'Priya Sharma', 'whatsapp' => '+91987650' . sprintf('%04d', $store->id * 100 + 1), 'city' => $cityHint, 'type' => 'vip'],
            ['name' => 'Meena Patel', 'whatsapp' => '+91987650' . sprintf('%04d', $store->id * 100 + 2), 'city' => $cityHint, 'type' => 'regular'],
            ['name' => 'Kavita Joshi', 'whatsapp' => '+91987650' . sprintf('%04d', $store->id * 100 + 3), 'city' => $cityHint, 'type' => 'regular'],
            ['name' => 'Ritu Shah', 'whatsapp' => '+91987650' . sprintf('%04d', $store->id * 100 + 4), 'city' => $cityHint, 'type' => 'new'],
            ['name' => 'Anjali Desai', 'whatsapp' => '+91987650' . sprintf('%04d', $store->id * 100 + 5), 'city' => $cityHint, 'type' => 'vip'],
            ['name' => 'Neha Modi', 'whatsapp' => '+91987650' . sprintf('%04d', $store->id * 100 + 6), 'city' => $cityHint, 'type' => 'new'],
            ['name' => 'Deepa Trivedi', 'whatsapp' => '+91987650' . sprintf('%04d', $store->id * 100 + 7), 'city' => $cityHint, 'type' => 'regular'],
            ['name' => 'Sneha Bhatt', 'whatsapp' => '+91987650' . sprintf('%04d', $store->id * 100 + 8), 'city' => $cityHint, 'type' => 'new'],
            ['name' => 'Pooja Mehta', 'whatsapp' => '+91987650' . sprintf('%04d', $store->id * 100 + 9), 'city' => $cityHint, 'type' => 'vip'],
            ['name' => 'Divya Chauhan', 'whatsapp' => '+91987650' . sprintf('%04d', $store->id * 100 + 10), 'city' => $cityHint, 'type' => 'new'],
        ];

        foreach ($customerSet as $cd) {
            $customers[] = Customer::create([
                'store_id' => $store->id,
                'name' => $cd['name'],
                'whatsapp' => $cd['whatsapp'],
                'city' => $cd['city'],
                'type' => $cd['type'],
                'size_pref' => ['M', 'L'],
            ]);
        }

        // Orders
        $orderCount = (int) max(8, 30 * $scale);
        $orderNum = $startOrderNum;
        for ($i = 0; $i < $orderCount; $i++) {
            $customer = $customers[array_rand($customers)];
            $product = $products[array_rand($products)];
            $qty = rand(1, 3);
            $variant = null;
            if ($product->type === 'variable') {
                $variant = $product->variants()->inRandomOrder()->first();
                $price = $variant?->price ?? 2499;
            } else {
                $price = $product->selling_price;
            }
            $lineTotal = $qty * $price;

            $order = Order::create([
                'store_id' => $store->id,
                'order_number' => 'ORD-' . str_pad($orderNum++, 4, '0', STR_PAD_LEFT),
                'customer_id' => $customer->id,
                'order_date' => now()->subDays(rand(0, 30)),
                'subtotal' => $lineTotal,
                'total' => $lineTotal,
                'payment_method' => ['cash', 'upi', 'bank_transfer', 'card'][rand(0, 3)],
                'payment_status' => ['paid', 'paid', 'pending'][rand(0, 2)],
                'status' => ['confirmed', 'delivered', 'delivered'][rand(0, 2)],
                'invoice_sent' => (bool) rand(0, 1),
            ]);

            OrderItem::create([
                'order_id' => $order->id,
                'store_id' => $store->id,
                'product_id' => $product->id,
                'variant_id' => $variant?->id,
                'qty' => $qty,
                'unit_price' => $price,
                'line_total' => $lineTotal,
            ]);
        }

        foreach ($customers as $c) {
            $c->updateStats();
        }
    }
}
