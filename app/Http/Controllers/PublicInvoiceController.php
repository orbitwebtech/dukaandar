<?php

namespace App\Http\Controllers;

use App\Models\Order;
use Illuminate\Http\Request;

class PublicInvoiceController extends Controller
{
    public function show(Request $request, Order $order)
    {
        $order->load('customer', 'items.product', 'items.variant', 'store');
        $settings = collect($order->store->settings)->pluck('value', 'key');

        $pdf = \Barryvdh\DomPDF\Facade\Pdf::loadView('invoices.pdf', [
            'order' => $order,
            'settings' => $settings,
        ])->setPaper('a4');

        return $pdf->stream("Invoice-{$order->order_number}.pdf");
    }
}
