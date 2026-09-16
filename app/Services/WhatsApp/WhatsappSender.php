<?php

namespace App\Services\WhatsApp;

use App\Jobs\SendWhatsappMessage;
use App\Models\Customer;
use App\Models\Order;
use App\Models\Store;
use App\Models\User;
use App\Models\WhatsappConversation;
use App\Models\WhatsappMessage;
use App\Services\InvoicePdf;

/**
 * Creates the outbound message row, then hands the actual Graph call to a
 * queued job. Nothing in a web request ever waits on Meta.
 */
class WhatsappSender
{
    /** Customers are stored as +919876543210; WhatsApp wants 919876543210. */
    public static function toWaId(?string $whatsapp): string
    {
        return ltrim(preg_replace('/\D/', '', (string) $whatsapp), '0');
    }

    public static function conversationFor(Store $store, string $waId, ?Customer $customer = null): WhatsappConversation
    {
        $conversation = WhatsappConversation::firstOrCreate(
            ['store_id' => $store->id, 'wa_id' => $waId],
            ['customer_id' => $customer?->id, 'profile_name' => $customer?->name]
        );

        if ($customer && ! $conversation->customer_id) {
            $conversation->update(['customer_id' => $customer->id]);
        }

        return $conversation;
    }

    /**
     * Free-form reply. Only deliverable inside the 24-hour window — the caller
     * is expected to have checked, but we record the attempt either way so a
     * failure is visible in the thread rather than silent.
     */
    public static function queueText(
        Store $store,
        string $waId,
        string $body,
        ?Customer $customer = null,
        ?User $sender = null,
        ?Order $order = null
    ): WhatsappMessage {
        $conversation = self::conversationFor($store, $waId, $customer);

        $message = WhatsappMessage::create([
            'store_id' => $store->id,
            'whatsapp_conversation_id' => $conversation->id,
            'order_id' => $order?->id,
            'user_id' => $sender?->id,
            'direction' => 'outbound',
            'type' => 'text',
            'body' => $body,
            'status' => 'queued',
        ]);

        SendWhatsappMessage::dispatch($message->id);

        return $message;
    }

    /** An approved template. Deliverable at any time. */
    public static function queueTemplate(
        Store $store,
        string $waId,
        string $templateName,
        string $language,
        array $params = [],
        ?Customer $customer = null,
        ?User $sender = null,
        ?Order $order = null
    ): WhatsappMessage {
        $conversation = self::conversationFor($store, $waId, $customer);

        $message = WhatsappMessage::create([
            'store_id' => $store->id,
            'whatsapp_conversation_id' => $conversation->id,
            'order_id' => $order?->id,
            'user_id' => $sender?->id,
            'direction' => 'outbound',
            'type' => 'template',
            'template_name' => $templateName,
            // Store the filled-in text so the thread reads like a conversation
            // rather than a row of variable placeholders.
            'body' => self::previewOf($store, $templateName, $language, $params),
            'payload' => ['language' => $language, 'params' => array_values($params)],
            'status' => 'queued',
        ]);

        SendWhatsappMessage::dispatch($message->id);

        return $message;
    }

    /**
     * Send the invoice PDF itself.
     *
     * Inside the 24-hour window the file can go as a plain document. Outside it,
     * Meta only accepts an approved template, and the file rides along in that
     * template's document header.
     */
    public static function queueInvoicePdf(
        Store $store,
        string $waId,
        Order $order,
        ?string $templateName = null,
        string $language = 'en',
        array $params = [],
        ?Customer $customer = null,
        ?User $sender = null
    ): WhatsappMessage {
        $conversation = self::conversationFor($store, $waId, $customer);
        $filename = InvoicePdf::filename($order);

        $message = WhatsappMessage::create([
            'store_id' => $store->id,
            'whatsapp_conversation_id' => $conversation->id,
            'order_id' => $order->id,
            'user_id' => $sender?->id,
            'direction' => 'outbound',
            'type' => 'document',
            'template_name' => $templateName,
            'body' => $templateName
                ? self::previewOf($store, $templateName, $language, $params)
                : "Invoice {$order->order_number}",
            'payload' => [
                'language' => $language,
                'params' => array_values($params),
                'filename' => $filename,
                // The job renders and uploads the PDF; holding bytes in the
                // queue payload would bloat every row.
                'attach_invoice_for_order' => $order->id,
            ],
            'status' => 'queued',
        ]);

        SendWhatsappMessage::dispatch($message->id);

        return $message;
    }

    private static function previewOf(Store $store, string $name, string $language, array $params): string
    {
        $template = $store->whatsappTemplates()
            ->where('name', $name)
            ->where('language', $language)
            ->first();

        $body = $template?->body ?? $name;

        foreach (array_values($params) as $i => $value) {
            $body = str_replace('{{' . ($i + 1) . '}}', (string) $value, $body);
        }

        return $body;
    }
}
