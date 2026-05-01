<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('coupons', function (Blueprint $table) {
            $table->id();
            $table->foreignId('store_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->string('code');
            $table->enum('discount_type', ['flat', 'percent']);
            $table->decimal('discount_value', 10, 2);
            $table->decimal('min_order_value', 10, 2)->default(0);
            $table->integer('valid_days')->default(30);
            $table->decimal('auto_send_threshold', 10, 2)->nullable();
            $table->boolean('active')->default(true);
            $table->integer('times_issued')->default(0);
            $table->integer('times_redeemed')->default(0);
            $table->timestamps();

            $table->unique(['store_id', 'code']);
        });

        Schema::create('coupon_issuances', function (Blueprint $table) {
            $table->id();
            $table->foreignId('coupon_id')->constrained()->cascadeOnDelete();
            $table->foreignId('customer_id')->constrained()->cascadeOnDelete();
            $table->foreignId('order_id')->nullable()->constrained()->nullOnDelete();
            $table->timestamp('issued_at');
            $table->timestamp('expires_at');
            $table->timestamp('used_at')->nullable();
            $table->foreignId('used_order_id')->nullable()->constrained('orders')->nullOnDelete();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('coupon_issuances');
        Schema::dropIfExists('coupons');
    }
};
