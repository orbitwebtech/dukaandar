<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // One connected WhatsApp Business number per store.
        Schema::create('whatsapp_accounts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('store_id')->constrained()->cascadeOnDelete();
            $table->string('waba_id');
            $table->string('phone_number_id');
            $table->string('display_phone_number')->nullable();
            $table->string('verified_name')->nullable();
            $table->text('access_token');       // encrypted cast
            $table->text('two_step_pin')->nullable(); // encrypted cast
            $table->string('status')->default('pending'); // pending|connected|disconnected
            $table->string('quality_rating')->nullable();
            $table->string('messaging_tier')->nullable();
            $table->string('last_error')->nullable();
            $table->timestamp('last_webhook_at')->nullable();
            $table->timestamp('connected_at')->nullable();
            $table->timestamps();

            $table->unique('store_id');
            $table->unique('phone_number_id');
        });

        // Mirror of each store's Meta-approved templates. Meta owns `status`.
        Schema::create('whatsapp_templates', function (Blueprint $table) {
            $table->id();
            $table->foreignId('store_id')->constrained()->cascadeOnDelete();
            $table->string('meta_id')->nullable();
            $table->string('name');
            $table->string('language', 12)->default('en');
            $table->string('category')->default('UTILITY');
            $table->string('status')->default('PENDING');
            $table->text('body')->nullable();
            $table->json('components')->nullable();
            $table->string('rejected_reason')->nullable();
            $table->timestamps();

            $table->unique(['store_id', 'name', 'language']);
        });

        // One thread per customer number per store.
        Schema::create('whatsapp_conversations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('store_id')->constrained()->cascadeOnDelete();
            $table->foreignId('customer_id')->nullable()->constrained()->nullOnDelete();
            $table->string('wa_id');            // digits only, no leading +
            $table->string('profile_name')->nullable();
            $table->timestamp('last_inbound_at')->nullable();  // drives the 24-hour window
            $table->timestamp('last_message_at')->nullable();
            $table->unsignedInteger('unread_count')->default(0);
            $table->timestamps();

            $table->unique(['store_id', 'wa_id']);
            $table->index(['store_id', 'last_message_at']);
        });

        Schema::create('whatsapp_messages', function (Blueprint $table) {
            $table->id();
            $table->foreignId('store_id')->constrained()->cascadeOnDelete();
            $table->foreignId('whatsapp_conversation_id')->constrained()->cascadeOnDelete();
            $table->foreignId('order_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete(); // staff who sent it
            $table->string('wamid')->nullable();
            $table->string('direction', 10);        // inbound|outbound
            $table->string('type', 32)->default('text');
            $table->text('body')->nullable();
            $table->json('payload')->nullable();
            $table->string('media_id')->nullable();
            $table->string('media_path')->nullable();
            $table->string('template_name')->nullable();
            $table->string('status', 20)->default('accepted'); // accepted|sent|delivered|read|failed
            $table->string('error_code')->nullable();
            $table->string('error_message')->nullable();
            $table->timestamp('sent_at')->nullable();
            $table->timestamp('delivered_at')->nullable();
            $table->timestamp('read_at')->nullable();
            $table->timestamps();

            // The entire defence against Meta's at-least-once webhook delivery.
            $table->unique('wamid');
            $table->index(['whatsapp_conversation_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('whatsapp_messages');
        Schema::dropIfExists('whatsapp_conversations');
        Schema::dropIfExists('whatsapp_templates');
        Schema::dropIfExists('whatsapp_accounts');
    }
};
