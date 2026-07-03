<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->foreignId('sales_user_id')->nullable()->after('customer_id')
                ->constrained('users')->nullOnDelete();
        });

        // Backfill existing orders to their store's organization owner.
        DB::statement('
            UPDATE orders o
            JOIN stores s ON s.id = o.store_id
            JOIN organizations org ON org.id = s.organization_id
            SET o.sales_user_id = org.owner_user_id
            WHERE o.sales_user_id IS NULL
        ');
    }

    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropForeign(['sales_user_id']);
            $table->dropColumn('sales_user_id');
        });
    }
};
