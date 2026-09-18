<?php

namespace App\Http\Controllers\Vendor;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\Store;
use App\Services\WhatsApp\InvoiceSender;
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
        $validated = $request->validate([
            'template_name' => 'nullable|string|max:60',
            'language' => 'nullable|string|max:12',
        ]);

        $result = InvoiceSender::send(
            $store,
            $order,
            $request->user(),
            $validated['template_name'] ?? null,
            $validated['language'] ?? null
        );

        return $result['ok']
            ? back()->with('success', $result['message'])
            : back()->withErrors(['whatsapp' => $result['message']]);
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
