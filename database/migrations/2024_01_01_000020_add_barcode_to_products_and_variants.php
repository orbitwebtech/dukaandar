<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->string('barcode')->nullable()->after('sku');
            $table->index(['store_id', 'barcode']);
        });
        Schema::table('product_variants', function (Blueprint $table) {
            $table->string('barcode')->nullable()->after('sku');
            $table->index(['store_id', 'barcode']);
        });
    }

    public function down(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->dropIndex(['store_id', 'barcode']);
            $table->dropColumn('barcode');
        });
        Schema::table('product_variants', function (Blueprint $table) {
            $table->dropIndex(['store_id', 'barcode']);
            $table->dropColumn('barcode');
        });
    }
};
