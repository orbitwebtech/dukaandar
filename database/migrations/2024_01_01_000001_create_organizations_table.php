<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('organizations', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->unsignedBigInteger('owner_user_id')->nullable();
            $table->enum('plan', ['starter', 'growth', 'pro'])->default('starter');
            $table->enum('status', ['active', 'trial', 'suspended'])->default('trial');
            $table->date('trial_ends_at')->nullable();
            $table->timestamps();

            $table->index('owner_user_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('organizations');
    }
};
