<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Invoice {{ $order->order_number }}</title>
    <style>
        body { font-family: 'DejaVu Sans', sans-serif; font-size: 14px; color: #333; margin: 0; padding: 40px; }
        .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px; border-bottom: 3px solid #4338ca; padding-bottom: 20px; }
        .header-left { display: flex; align-items: flex-start; gap: 16px; }
        .shop-logo { max-height: 70px; max-width: 120px; object-fit: contain; }
        .shop-name { font-size: 24px; font-weight: bold; color: #4338ca; }
        .shop-info { font-size: 12px; color: #666; margin-top: 4px; }
        .invoice-title { font-size: 28px; font-weight: bold; color: #4338ca; text-align: right; }
        .invoice-meta { text-align: right; font-size: 12px; color: #666; margin-top: 4px; }
        .customer-section { margin-bottom: 30px; }
        .section-title { font-size: 12px; font-weight: bold; color: #999; text-transform: uppercase; margin-bottom: 8px; }
        .customer-name { font-size: 16px; font-weight: bold; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
        th { background: #f8f9fa; padding: 10px 12px; text-align: left; font-size: 12px; text-transform: uppercase; color: #666; border-bottom: 2px solid #e9ecef; }
        td { padding: 10px 12px; border-bottom: 1px solid #f0f0f0; }
        .totals { width: 300px; margin-left: auto; }
        .totals td { padding: 6px 12px; }
        .totals .total-row { font-size: 18px; font-weight: bold; border-top: 2px solid #333; }
        .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; text-align: center; font-size: 12px; color: #999; }
        .text-right { text-align: right; }
    </style>
</head>
<body>
    @php
        $logoData = null;
        if (!empty($settings['logo'])) {
            $logoPath = storage_path('app/public/' . ltrim(str_replace('/storage/', '', $settings['logo']), '/'));
            if (is_file($logoPath)) {
                $mime = function_exists('mime_content_type') ? mime_content_type($logoPath) : 'image/png';
                $logoData = 'data:' . $mime . ';base64,' . base64_encode(file_get_contents($logoPath));
            }
        }
    @endphp

    <div class="header">
        <div class="header-left">
            @if($logoData)
                <img src="{{ $logoData }}" alt="Logo" class="shop-logo">
            @endif
            <div>
                <div class="shop-name">{{ $settings['shop_name'] ?? 'Shop' }}</div>
                <div class="shop-info">
                    @if($settings['address'] ?? false){{ $settings['address'] }}<br>@endif
                    @if($settings['city'] ?? false){{ $settings['city'] }}<br>@endif
                    @if($settings['whatsapp_number'] ?? false)WhatsApp: {{ $settings['whatsapp_number'] }}<br>@endif
                    @if($settings['gst_number'] ?? false)GST: {{ $settings['gst_number'] }}@endif
                </div>
            </div>
        </div>
        <div>
            <div class="invoice-title">INVOICE</div>
            <div class="invoice-meta">
                #{{ $order->order_number }}<br>
                Date: {{ $order->order_date->format('d M Y') }}
            </div>
        </div>
    </div>

    <div class="customer-section">
        <div class="section-title">Bill To</div>
        <div class="customer-name">{{ $order->customer->name }}</div>
        <div style="color: #666;">{{ $order->customer->whatsapp }}</div>
        @if($order->customer->city)<div style="color: #666;">{{ $order->customer->city }}</div>@endif
    </div>

    <table>
        <thead>
            <tr>
                <th>#</th>
                <th>Product</th>
                <th class="text-right">Qty</th>
                <th class="text-right">Price</th>
                <th class="text-right">Discount</th>
                <th class="text-right">Total</th>
            </tr>
        </thead>
        <tbody>
            @foreach($order->items as $i => $item)
            <tr>
                <td>{{ $i + 1 }}</td>
                <td>
                    {{ $item->product->name }}
                    @if($item->variant)
                        <br><small style="color: #999;">{{ collect($item->variant->attributes)->map(fn($v, $k) => "$k: $v")->implode(', ') }}</small>
                    @endif
                </td>
                <td class="text-right">{{ $item->qty }}</td>
                <td class="text-right">₹{{ number_format($item->unit_price, 2) }}</td>
                <td class="text-right">
                    @if($item->line_discount_amount > 0)
                        -₹{{ number_format($item->line_discount_amount, 2) }}
                    @else
                        -
                    @endif
                </td>
                <td class="text-right">₹{{ number_format($item->line_total, 2) }}</td>
            </tr>
            @endforeach
        </tbody>
    </table>

    <table class="totals">
        <tr>
            <td>Subtotal</td>
            <td class="text-right">₹{{ number_format($order->subtotal, 2) }}</td>
        </tr>
        @if($order->discount_amount > 0)
        <tr>
            <td>Discount</td>
            <td class="text-right">-₹{{ number_format($order->discount_amount, 2) }}</td>
        </tr>
        @endif
        @if($order->tax_total > 0)
        <tr>
            <td>GST {{ $order->prices_include_tax ? '(included)' : '' }}</td>
            <td class="text-right">{{ $order->prices_include_tax ? '' : '+' }}₹{{ number_format($order->tax_total, 2) }}</td>
        </tr>
        @endif
        <tr class="total-row">
            <td>Total</td>
            <td class="text-right">₹{{ number_format($order->total, 2) }}</td>
        </tr>
        <tr>
            <td>Payment</td>
            <td class="text-right" style="text-transform: uppercase;">{{ $order->payment_method }}</td>
        </tr>
    </table>

    <div class="footer">
        {{ $settings['invoice_footer'] ?? 'Thank you for shopping with us!' }}
    </div>
</body>
</html>
