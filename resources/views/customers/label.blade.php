<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Delivery Label · {{ $customer->name }}</title>
    <style>
        body {
            font-family: 'Helvetica Neue', Arial, sans-serif;
            color: #111;
            margin: 0;
            padding: 24px;
            background: #f5f5f5;
        }
        .label {
            max-width: 480px;
            margin: 0 auto;
            border: 2px dashed #444;
            padding: 28px 32px;
            background: #fff;
            border-radius: 8px;
        }
        .from {
            font-size: 11px;
            color: #888;
            text-transform: uppercase;
            letter-spacing: 0.08em;
            margin-bottom: 4px;
        }
        .from strong {
            color: #444;
            font-weight: 600;
        }
        .divider { border: 0; border-top: 1px solid #ccc; margin: 16px 0; }
        .deliver-to {
            font-size: 11px;
            color: #888;
            text-transform: uppercase;
            letter-spacing: 0.08em;
            margin-bottom: 8px;
        }
        .name {
            font-size: 30px;
            font-weight: 800;
            line-height: 1.15;
            margin: 0 0 12px;
            color: #000;
        }
        .address {
            font-size: 15px;
            line-height: 1.55;
            white-space: pre-wrap;
            margin: 0 0 6px;
        }
        .city {
            font-size: 14px;
            color: #444;
            margin: 0 0 12px;
        }
        .phone {
            font-size: 16px;
            font-weight: 600;
            color: #000;
            margin: 0;
        }
        .phone-label {
            font-size: 10px;
            color: #888;
            text-transform: uppercase;
            letter-spacing: 0.08em;
            margin-bottom: 2px;
        }
        .actions {
            text-align: center;
            margin-top: 18px;
        }
        .actions button {
            padding: 8px 18px;
            font-size: 13px;
            border: 1px solid #444;
            background: #fff;
            border-radius: 5px;
            cursor: pointer;
        }
        @media print {
            body { background: #fff; padding: 0; }
            .label { border: none; max-width: 100%; padding: 0; box-shadow: none; }
            .actions { display: none; }
        }
    </style>
</head>
<body>
    <div class="label">
        <div class="deliver-to">Deliver To</div>
        <p class="name">{{ $customer->name }}</p>
        @if($customer->address)
            <p class="address">{{ $customer->address }}</p>
        @endif
        @if($customer->city)
            <p class="city">{{ $customer->city }}</p>
        @endif

        <div style="margin-top: 14px;">
            <div class="phone-label">Phone</div>
            <p class="phone">{{ $customer->whatsapp }}</p>
        </div>
    </div>

    <div class="actions">
        <button onclick="window.print()">Print Label</button>
        <button onclick="window.close()">Close</button>
    </div>

    <script>
        // Auto-trigger print dialog on load
        window.addEventListener('load', () => setTimeout(() => window.print(), 250));
    </script>
</body>
</html>
