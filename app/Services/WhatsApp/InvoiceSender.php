<?php

namespace App\Services\WhatsApp;

use App\Models\Order;
use App\Models\Store;
use App\Models\User;
use Illuminate\Support\Facades\URL;

/**
 * Decides how an order's invoice should reach the customer on WhatsApp.
 *
 * Shared by the button on the order screen and by automatic sending when an
 * order is created, so both behave identically — there is one set of rules
 * about windows, templates and parameters, not two.
 */
class InvoiceSender
{
    /** @return array{ok: bool, message: string} */
    public static function send(
        Store $store,
        Order $order,
        ?User $sender = null,
        ?string $templateName = null,
        ?string $language = null
    ): array {
        if (! $store->whatsappAccount?->isConnected()) {
            return ['ok' => false, 'message' => 'Connect WhatsApp in Settings first.'];
        }

        $order->loadMissing('customer');
        $customer = $order->customer;
        $waId = WhatsappSender::toWaId($customer?->whatsapp);

        if ($waId === '') {
            return ['ok' => false, 'message' => 'This customer has no WhatsApp number.'];
        }

        $invoiceLink = URL::signedRoute('public.invoice', ['order' => $order->id]);
        $shopName = $store->getSetting('shop_name', $store->name);
        $conversation = WhatsappSender::conversationFor($store, $waId, $customer);

        if ($conversation->isWindowOpen()) {
            // The window is open, so the PDF can go straight across with the
            // shop's own message as its caption — no template needed.
            WhatsappSender::queueInvoicePdf(
                $store, $waId, $order, null, 'en', [], $customer, $sender
            );

            $order->update(['invoice_sent' => true]);

            return ['ok' => true, 'message' => 'Invoice PDF queued for sending on WhatsApp.'];
        }

        $template = self::templateFor($store, $templateName ?: $store->getSetting('whatsapp_invoice_template'));

        if (! $template) {
            return [
                'ok' => false,
                'message' => 'This customer has not messaged in 24 hours, so an approved template is needed. Create one in Settings → WhatsApp.',
            ];
        }

        // Meta rejects the send outright if the count does not match the
        // template exactly (#132000), and templates written in WhatsApp Manager
        // declare whatever their author chose. So follow the template.
        $pool = [$customer?->name ?? 'Customer', $order->order_number, $shopName, $invoiceLink];
        $needed = $template->variableCount();

        if ($needed > count($pool)) {
            return [
                'ok' => false,
                'message' => "The template \"{$template->name}\" expects {$needed} values, but an invoice only provides "
                    . count($pool) . '. Simplify the template or choose another in Settings → WhatsApp.',
            ];
        }

        if ($template->hasDocumentHeader()) {
            WhatsappSender::queueInvoicePdf(
                $store, $waId, $order, $template->name, $language ?: $template->language,
                array_slice($pool, 0, $needed), $customer, $sender
            );
        } else {
            // Text-only template: the link matters more to the customer than the
            // shop name, so it takes the third slot.
            WhatsappSender::queueTemplate(
                $store, $waId, $template->name, $language ?: $template->language,
                array_slice([$customer?->name ?? 'Customer', $order->order_number, $invoiceLink, $shopName], 0, $needed),
                $customer, $sender, $order
            );
        }

        $order->update(['invoice_sent' => true]);

        return ['ok' => true, 'message' => 'Invoice queued for sending on WhatsApp.'];
    }

    private static function templateFor(Store $store, ?string $name)
    {
        $chosen = $name
            ? $store->whatsappTemplates()->where('name', $name)->where('status', 'APPROVED')->first()
            : null;

        // Nothing chosen, or the chosen one is gone: fall back to any approved
        // template, preferring one that carries the PDF.
        return $chosen ?: $store->whatsappTemplates()
            ->where('status', 'APPROVED')
            ->get()
            ->sortByDesc(fn ($t) => $t->hasDocumentHeader() ? 1 : 0)
            ->first();
    }
}
