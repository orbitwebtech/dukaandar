<?php

namespace App\Http\Controllers\Vendor;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\Store;
use App\Services\WhatsApp\WhatsappSender;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\URL;

class WhatsappMessageController extends Controller
{
    /**
     * Send an order's invoice over WhatsApp from inside Dukaandar.
     *
     * Outside the 24-hour window this needs an approved template; inside it a
     * plain message is fine. We pick automatically so staff never have to think
     * about Meta's rules.
     */
    public function sendInvoice(Request $request, Store $store, Order $order)
    {
        $account = $store->whatsappAccount;

        if (! $account?->isConnected()) {
            return back()->withErrors(['whatsapp' => 'Connect WhatsApp in Settings first.']);
        }

        $order->loadMissing('customer');
        $customer = $order->customer;
        $waId = WhatsappSender::toWaId($customer?->whatsapp);

        if ($waId === '') {
            return back()->withErrors(['whatsapp' => 'This customer has no WhatsApp number.']);
        }

        $validated = $request->validate([
            'template_name' => 'nullable|string|max:60',
            'language' => 'nullable|string|max:12',
        ]);

        $invoiceLink = URL::signedRoute('public.invoice', ['order' => $order->id]);
        $shopName = $store->getSetting('shop_name', $store->name);

        $conversation = WhatsappSender::conversationFor($store, $waId, $customer);
        $templateName = $validated['template_name'] ?? $store->getSetting('whatsapp_invoice_template');

        $template = $templateName
            ? $store->whatsappTemplates()
                ->where('name', $templateName)
                ->where('status', 'APPROVED')
                ->first()
            : null;

        // Nothing chosen, or the chosen one is gone: fall back to any approved
        // template, preferring one that carries the PDF. A shop with exactly one
        // approved invoice template should not have to configure anything.
        if (! $template) {
            $template = $store->whatsappTemplates()
                ->where('status', 'APPROVED')
                ->get()
                ->sortByDesc(fn ($t) => $t->hasDocumentHeader() ? 1 : 0)
                ->first();
        }

        $caption = $this->fillTemplate(
            (string) $store->getSetting('whatsapp_template'),
            $customer?->name,
            $shopName,
            $invoiceLink
        );

        if ($conversation->isWindowOpen()) {
            // The window is open, so the PDF can go straight across with the
            // message as its caption — no template needed.
            WhatsappSender::queueInvoicePdf(
                $store, $waId, $order, null, 'en', [], $customer, $request->user()
            );

            $order->update(['invoice_sent' => true]);

            return back()->with('success', 'Invoice PDF queued for sending on WhatsApp.');
        }

        if (! $template) {
            return back()->withErrors([
                'whatsapp' => 'This customer has not messaged in 24 hours, so an approved template is needed. Create one in Settings → WhatsApp.',
            ]);
        }

        $params = [$customer?->name ?? 'Customer', $order->order_number, $shopName];

        if ($template->hasDocumentHeader()) {
            // The template carries a PDF header, so attach the real invoice.
            WhatsappSender::queueInvoicePdf(
                $store, $waId, $order, $template->name, $template->language,
                $params, $customer, $request->user()
            );
        } else {
            // Text-only template: the customer gets the invoice as a link.
            WhatsappSender::queueTemplate(
                $store, $waId, $template->name, $template->language,
                [$customer?->name ?? 'Customer', $order->order_number, $invoiceLink],
                $customer, $request->user(), $order
            );
        }

        $order->update(['invoice_sent' => true]);

        return back()->with('success', 'Invoice queued for sending on WhatsApp.');
    }

    /** Replaces the [Placeholder] tokens the store already configures in Settings. */
    private function fillTemplate(string $template, ?string $customerName, ?string $shopName, string $invoiceLink): string
    {
        if (trim($template) === '') {
            $template = "Hello [CustomerName],\n\nThank you for your purchase from [ShopName].\n\nYour invoice: [InvoiceLink]";
        }

        return str_replace(
            ['[CustomerName]', '[ShopName]', '[InvoiceLink]'],
            [$customerName ?? 'Customer', $shopName ?? '', $invoiceLink],
            $template
        );
    }
}
