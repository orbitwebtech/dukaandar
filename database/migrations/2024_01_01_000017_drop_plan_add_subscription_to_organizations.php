<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('organizations', function (Blueprint $table) {
            $table->dropColumn('plan');
            $table->enum('billing_cycle', ['monthly', 'yearly'])->nullable()->after('status');
            $table->date('subscription_ends_at')->nullable()->after('billing_cycle');
        });
    }

    public function down(): void
    {
        Schema::table('organizations', function (Blueprint $table) {
            $table->dropColumn(['billing_cycle', 'subscription_ends_at']);
            $table->enum('plan', ['starter', 'growth', 'pro'])->default('starter')->after('owner_user_id');
        });
    }
};
