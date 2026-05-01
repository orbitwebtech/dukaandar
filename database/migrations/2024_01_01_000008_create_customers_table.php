<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('customers', function (Blueprint $table) {
            $table->id();
            $table->foreignId('store_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->string('whatsapp');
            $table->string('city')->nullable();
            $table->json('size_pref')->nullable();
            $table->enum('type', ['new', 'regular', 'vip'])->default('new');
            $table->text('notes')->nullable();
            $table->integer('total_orders')->default(0);
            $table->decimal('total_spent', 12, 2)->default(0);
            $table->date('last_order_date')->nullable();
            $table->integer('review_prompt_counter')->default(0);
            $table->timestamps();

            $table->unique(['store_id', 'whatsapp']);
            $table->index(['store_id', 'type']);
            $table->index(['store_id', 'city']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('customers');
    }
};
