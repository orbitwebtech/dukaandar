<?php

namespace App\Services;

use App\Models\Order;
use App\Models\Store;
use Barryvdh\DomPDF\Facade\Pdf;

/**
 * Renders the invoice PDF that customers receive.
 *
 * The same Blade view backs the download in the app, the public link and the
 * file attached to a WhatsApp message, so a customer always sees one document.
 */
class InvoicePdf
{
    public static function bytes(Order $order): string
    {
        $order->loadMissing('customer', 'items.product', 'items.variant', 'store');
        $settings = collect($order->store->settings)->pluck('value', 'key');

        return Pdf::loadView('invoices.pdf', [
            'order' => $order,
            'settings' => $settings,
        ])->setPaper('a4')->output();
    }

    public static function filename(Order $order): string
    {
        // Keep it readable in the customer's chat and safe on every filesystem.
        $number = preg_replace('/[^A-Za-z0-9_-]/', '', (string) $order->order_number);

        return "Invoice-{$number}.pdf";
    }

    /**
     * A stand-in invoice used only to get a sample file handle from Meta when a
     * template with a document header is submitted for approval. It never
     * reaches a customer, but reviewers see it, so it carries the shop's name
     * and realistic figures rather than placeholder text.
     */
    public static function sampleBytes(Store $store): string
    {
        // Deliberately not the real invoice view. That renders around 850 KB
        // because dompdf embeds full font files, and uploading it inside a web
        // request is enough to exhaust memory on shared hosting. A reviewer only
        // needs to see a representative document, and this one is ~1 KB.
        $shopName = e($store->getSetting('shop_name', $store->name));

        return Pdf::loadHTML(<<<HTML
            <!-- sans-serif maps to a core PDF font. Naming DejaVu here would
                 make dompdf embed the whole font file and push a one-page
                 sample past 850 KB, which is what broke the upload. -->
            <html><body style="font-family: sans-serif; padding: 40px;">
                <h2 style="margin:0 0 4px">{$shopName}</h2>
                <p style="margin:0 0 24px; color:#555">Tax Invoice &middot; ORD-0001</p>
                <table width="100%" cellpadding="6" style="border-collapse: collapse">
                    <tr style="background:#f2f2f2"><th align="left">Item</th><th align="right">Qty</th><th align="right">Amount</th></tr>
                    <tr><td>Cotton Kurta</td><td align="right">1</td><td align="right">599.00</td></tr>
                    <tr><td>Silk Dupatta</td><td align="right">1</td><td align="right">399.00</td></tr>
                    <tr><td colspan="2" align="right"><b>Total</b></td><td align="right"><b>998.00</b></td></tr>
                </table>
                <p style="margin-top:28px; color:#555">Thank you for shopping with us.</p>
            </body></html>
        HTML)->setPaper('a4')->output();
    }
}
