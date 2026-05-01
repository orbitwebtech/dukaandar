<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('subscription_payments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained()->cascadeOnDelete();
            $table->foreignId('recorded_by')->constrained('users')->cascadeOnDelete();
            $table->enum('cycle', ['monthly', 'yearly']);
            $table->decimal('amount', 12, 2);
            $table->date('paid_at');
            $table->date('period_start');
            $table->date('period_end');
            $table->timestamps();

            $table->index(['organization_id', 'paid_at']);
            $table->index('paid_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('subscription_payments');
    }
};
