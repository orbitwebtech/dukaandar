<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('orders', function (Blueprint $table) {
            $table->id();
            $table->foreignId('store_id')->constrained()->cascadeOnDelete();
            $table->string('order_number');
            $table->foreignId('customer_id')->constrained()->cascadeOnDelete();
            $table->date('order_date');
            $table->decimal('subtotal', 12, 2)->default(0);
            $table->enum('discount_type', ['flat', 'percent'])->nullable();
            $table->decimal('discount_value', 10, 2)->default(0);
            $table->decimal('discount_amount', 12, 2)->default(0);
            $table->decimal('total', 12, 2)->default(0);
            $table->enum('payment_method', ['cash', 'upi', 'bank_transfer', 'card'])->default('cash');
            $table->enum('payment_status', ['paid', 'pending', 'partial'])->default('paid');
            $table->enum('status', ['draft', 'confirmed', 'delivered', 'cancelled'])->default('confirmed');
            $table->text('notes')->nullable();
            $table->boolean('invoice_sent')->default(false);
            $table->string('coupon_code')->nullable();
            $table->timestamps();

            $table->unique(['store_id', 'order_number']);
            $table->index(['store_id', 'status']);
            $table->index(['store_id', 'payment_status']);
            $table->index(['store_id', 'created_at']);
        });

        Schema::create('order_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('order_id')->constrained()->cascadeOnDelete();
            $table->foreignId('store_id')->constrained()->cascadeOnDelete();
            $table->foreignId('product_id')->constrained()->cascadeOnDelete();
            $table->foreignId('variant_id')->nullable()->constrained('product_variants')->nullOnDelete();
            $table->integer('qty')->default(1);
            $table->decimal('unit_price', 10, 2);
            $table->enum('line_discount_type', ['flat', 'percent'])->nullable();
            $table->decimal('line_discount_value', 10, 2)->default(0);
            $table->decimal('line_discount_amount', 10, 2)->default(0);
            $table->decimal('line_total', 12, 2);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('order_items');
        Schema::dropIfExists('orders');
    }
};
