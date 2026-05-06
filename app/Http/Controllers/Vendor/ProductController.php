<?php

namespace App\Http\Controllers\Vendor;

use App\Http\Controllers\Controller;
use App\Models\Category;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\Store;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ProductController extends Controller
{
    public function index(Request $request, Store $store)
    {
        $query = $store->products()->with('category', 'variants');

        if ($search = $request->input('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('sku', 'like', "%{$search}%");
            });
        }

        if ($status = $request->input('status')) $query->where('status', $status);
        if ($categoryId = $request->input('category_id')) $query->where('category_id', $categoryId);

        $products = $query->orderBy('created_at', 'desc')
            ->paginate($request->input('per_page', 10))
            ->withQueryString();

        $categories = $store->categories()->orderBy('name')->get();

        return Inertia::render('Vendor/Products/Index', [
            'products' => $products,
            'categories' => $categories,
            'filters' => $request->only(['search', 'status', 'category_id']),
        ]);
    }

    public function create(Store $store)
    {
        $categories = $store->categories()->orderBy('name')->get();
        return Inertia::render('Vendor/Products/Form', ['categories' => $categories]);
    }

    public function store(Request $request, Store $store)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'sku' => 'nullable|string|max:100',
            'barcode' => 'nullable|string|max:100',
            'type' => 'required|in:simple,variable',
            'category_id' => 'nullable|exists:categories,id',
            'description' => 'nullable|string',
            'cost_price' => 'nullable|numeric|min:0',
            'tax_rate' => 'nullable|numeric|min:0|max:100',
            'selling_price' => 'nullable|numeric|min:0',
            'stock_qty' => 'nullable|integer|min:0',
            'low_stock_threshold' => 'nullable|integer|min:0',
            'status' => 'required|in:active,draft',
            'variants' => 'nullable|array',
            'variants.*.attributes' => 'required_with:variants|array',
            'variants.*.price' => 'required_with:variants|numeric|min:0',
            'variants.*.cost_price' => 'nullable|numeric|min:0',
            'variants.*.stock_qty' => 'required_with:variants|integer|min:0',
            'variants.*.sku' => 'nullable|string',
            'variants.*.barcode' => 'nullable|string|max:100',
            'variants.*.low_stock_threshold' => 'nullable|integer|min:0',
            'variants.*.is_default' => 'nullable|boolean',
        ]);

        if (!$validated['sku']) {
            $validated['sku'] = 'SKU-' . strtoupper(substr(md5(uniqid()), 0, 8));
        }

        $hasInitialStock = ($validated['type'] === 'simple' && (int)($validated['stock_qty'] ?? 0) > 0)
            || ($validated['type'] === 'variable' && collect($validated['variants'] ?? [])->sum(fn ($v) => (int)$v['stock_qty']) > 0);

        $product = $store->products()->create([
            'name' => $validated['name'],
            'sku' => $validated['sku'],
            'barcode' => $validated['barcode'] ?: null,
            'type' => $validated['type'],
            'category_id' => $validated['category_id'],
            'description' => $validated['description'] ?? null,
            'cost_price' => $validated['cost_price'] ?? null,
            'tax_rate' => $validated['tax_rate'] ?? 0,
            'selling_price' => $validated['type'] === 'simple' ? ($validated['selling_price'] ?? null) : null,
            'stock_qty' => $validated['type'] === 'simple' ? ($validated['stock_qty'] ?? 0) : 0,
            'low_stock_threshold' => $validated['type'] === 'simple' ? ($validated['low_stock_threshold'] ?? null) : null,
            'status' => $validated['status'],
            'last_restocked_at' => $hasInitialStock ? now() : null,
        ]);

        if ($validated['type'] === 'variable' && !empty($validated['variants'])) {
            foreach ($validated['variants'] as $v) {
                ProductVariant::create([
                    'product_id' => $product->id,
                    'store_id' => $store->id,
                    'sku' => $v['sku'] ?? null,
                    'barcode' => $v['barcode'] ?? null,
                    'attributes' => $this->normalizeAttributes($v['attributes']),
                    'price' => $v['price'],
                    'cost_price' => $v['cost_price'] ?? null,
                    'stock_qty' => $v['stock_qty'],
                    'low_stock_threshold' => $v['low_stock_threshold'] ?? null,
                    'is_default' => $v['is_default'] ?? false,
                ]);
            }
        }

        return redirect()->route('products.index')->with('success', 'Product created successfully.');
    }

    public function show(Store $store, Product $product)
    {
        $product->load('category', 'variants', 'orderItems.order.customer');
        return Inertia::render('Vendor/Products/Show', ['product' => $product]);
    }

    public function edit(Store $store, Product $product)
    {
        $product->load('variants');
        $categories = $store->categories()->orderBy('name')->get();
        return Inertia::render('Vendor/Products/Form', [
            'product' => $product,
            'categories' => $categories,
        ]);
    }

    public function update(Request $request, Store $store, Product $product)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'sku' => 'nullable|string|max:100',
            'barcode' => 'nullable|string|max:100',
            'type' => 'required|in:simple,variable',
            'category_id' => 'nullable|exists:categories,id',
            'description' => 'nullable|string',
            'cost_price' => 'nullable|numeric|min:0',
            'tax_rate' => 'nullable|numeric|min:0|max:100',
            'selling_price' => 'nullable|numeric|min:0',
            'stock_qty' => 'nullable|integer|min:0',
            'low_stock_threshold' => 'nullable|integer|min:0',
            'status' => 'required|in:active,draft',
            'variants' => 'nullable|array',
            'variants.*.id' => 'nullable|integer',
            'variants.*.attributes' => 'required_with:variants|array',
            'variants.*.price' => 'required_with:variants|numeric|min:0',
            'variants.*.cost_price' => 'nullable|numeric|min:0',
            'variants.*.stock_qty' => 'required_with:variants|integer|min:0',
            'variants.*.sku' => 'nullable|string',
            'variants.*.barcode' => 'nullable|string|max:100',
            'variants.*.low_stock_threshold' => 'nullable|integer|min:0',
            'variants.*.is_default' => 'nullable|boolean',
        ]);

        $stockIncreased = false;
        if ($validated['type'] === 'simple') {
            $newQty = (int)($validated['stock_qty'] ?? 0);
            $oldQty = (int)$product->stock_qty;
            $stockIncreased = $newQty > $oldQty;
        }

        $product->update([
            'name' => $validated['name'],
            'sku' => $validated['sku'] ?: $product->sku,
            'barcode' => $validated['barcode'] ?: null,
            'type' => $validated['type'],
            'category_id' => $validated['category_id'],
            'description' => $validated['description'] ?? null,
            'cost_price' => $validated['cost_price'] ?? null,
            'tax_rate' => $validated['tax_rate'] ?? 0,
            'selling_price' => $validated['type'] === 'simple' ? ($validated['selling_price'] ?? null) : null,
            'stock_qty' => $validated['type'] === 'simple' ? ($validated['stock_qty'] ?? 0) : 0,
            'low_stock_threshold' => $validated['type'] === 'simple' ? ($validated['low_stock_threshold'] ?? null) : null,
            'status' => $validated['status'],
        ]);

        if ($validated['type'] === 'variable') {
            $existingIds = collect($validated['variants'] ?? [])->pluck('id')->filter()->toArray();
            $product->variants()->whereNotIn('id', $existingIds)->delete();

            foreach ($validated['variants'] ?? [] as $v) {
                if (!empty($v['id'])) {
                    $existing = ProductVariant::where('id', $v['id'])->where('product_id', $product->id)->first();
                    if ($existing && (int)$v['stock_qty'] > (int)$existing->stock_qty) {
                        $stockIncreased = true;
                    }
                    if ($existing) {
                        $existing->update([
                            'sku' => $v['sku'] ?? null,
                            'barcode' => $v['barcode'] ?? null,
                            'attributes' => $this->normalizeAttributes($v['attributes']),
                            'price' => $v['price'],
                            'cost_price' => $v['cost_price'] ?? null,
                            'stock_qty' => $v['stock_qty'],
                            'low_stock_threshold' => $v['low_stock_threshold'] ?? null,
                            'is_default' => $v['is_default'] ?? false,
                        ]);
                    }
                } else {
                    if ((int)$v['stock_qty'] > 0) $stockIncreased = true;
                    ProductVariant::create([
                        'product_id' => $product->id,
                        'store_id' => $store->id,
                        'sku' => $v['sku'] ?? null,
                        'barcode' => $v['barcode'] ?? null,
                        'attributes' => $this->normalizeAttributes($v['attributes']),
                        'price' => $v['price'],
                        'cost_price' => $v['cost_price'] ?? null,
                        'stock_qty' => $v['stock_qty'],
                        'low_stock_threshold' => $v['low_stock_threshold'] ?? null,
                        'is_default' => $v['is_default'] ?? false,
                    ]);
                }
            }
        } else {
            $product->variants()->delete();
        }

        if ($stockIncreased) {
            $product->update(['last_restocked_at' => now()]);
        }

        return redirect()->route('products.index')->with('success', 'Product updated successfully.');
    }

    public function destroy(Store $store, Product $product)
    {
        $product->delete();
        return redirect()->route('products.index')->with('success', 'Product deleted.');
    }

    public function adjustStock(Request $request, Store $store, Product $product)
    {
        $validated = $request->validate([
            'variant_id' => 'nullable|exists:product_variants,id',
            'adjustment' => 'required|integer',
        ]);

        $isRestock = (int)$validated['adjustment'] > 0;

        if ($validated['variant_id']) {
            $variant = $product->variants()->where('id', $validated['variant_id'])->firstOrFail();
            $variant->stock_qty = max(0, $variant->stock_qty + $validated['adjustment']);
            $variant->save();
            if ($isRestock) {
                $product->last_restocked_at = now();
                $product->save();
            }
        } else {
            $product->stock_qty = max(0, $product->stock_qty + $validated['adjustment']);
            if ($isRestock) {
                $product->last_restocked_at = now();
            }
            $product->save();
        }

        return back()->with('success', 'Stock adjusted.');
    }

    public function showImport(Store $store)
    {
        return Inertia::render('Vendor/Products/Import');
    }

    public function lookup(Request $request, Store $store)
    {
        $code = trim((string) $request->query('code', ''));
        if ($code === '') {
            return response()->json(['found' => false, 'message' => 'Empty code']);
        }

        // 1. Try variant by sku/barcode first (gives us a precise pick)
        $variant = ProductVariant::where('store_id', $store->id)
            ->where(function ($q) use ($code) {
                $q->where('sku', $code)->orWhere('barcode', $code);
            })
            ->with('product:id,name,type,status,selling_price')
            ->first();

        if ($variant && $variant->product && $variant->product->status === 'active') {
            return response()->json([
                'found' => true,
                'product_id' => $variant->product_id,
                'product_name' => $variant->product->name,
                'variant_id' => $variant->id,
                'variant_label' => $variant->getAttributeLabel(),
                'price' => (float) $variant->price,
                'stock' => (int) $variant->stock_qty,
            ]);
        }

        // 2. Try product by sku/barcode
        $product = $store->products()
            ->where(function ($q) use ($code) {
                $q->where('sku', $code)->orWhere('barcode', $code);
            })
            ->where('status', 'active')
            ->first();

        if (!$product) {
            return response()->json(['found' => false, 'message' => "No active product with code {$code}"]);
        }

        if ($product->type === 'variable') {
            return response()->json([
                'found' => false,
                'message' => "{$product->name} is a variable product. Scan a specific variant's barcode instead.",
            ]);
        }

        return response()->json([
            'found' => true,
            'product_id' => $product->id,
            'product_name' => $product->name,
            'variant_id' => null,
            'variant_label' => null,
            'price' => (float) $product->selling_price,
            'stock' => (int) $product->stock_qty,
        ]);
    }

    public function sampleCsv(Store $store): StreamedResponse
    {
        $headers = [
            'type', 'name', 'sku', 'barcode', 'category', 'description',
            'cost_price', 'selling_price', 'stock_qty', 'low_stock_threshold', 'status',
            'variant_attributes', 'variant_sku', 'variant_barcode', 'variant_price', 'variant_stock', 'variant_low_stock_threshold',
        ];

        $rows = [
            ['simple', 'Cotton Kurta White', 'KURTA-001', '8901234567890', 'Kurta', 'Soft cotton kurta', '350', '599', '45', '10', 'active', '', '', '', '', '', ''],
            ['simple', 'Silk Dupatta Red', 'DUP-002', '', 'Dupatta', '', '200', '399', '30', '5', 'active', '', '', '', '', '', ''],
            ['variable', 'Designer Lehenga', 'LEH-001', '', 'Lehenga', 'Embroidered designer lehenga', '1500', '', '', '', 'active', 'Color:Red|Size:M', 'LEH-001-R-M', '8901111000010', '2499', '5', '2'],
            ['variable', 'Designer Lehenga', 'LEH-001', '', 'Lehenga', 'Embroidered designer lehenga', '1500', '', '', '', 'active', 'Color:Red|Size:L', 'LEH-001-R-L', '8901111000011', '2699', '3', '2'],
            ['variable', 'Designer Lehenga', 'LEH-001', '', 'Lehenga', 'Embroidered designer lehenga', '1500', '', '', '', 'active', 'Color:Blue|Size:M', 'LEH-001-B-M', '8901111000012', '2499', '4', '2'],
        ];

        return response()->streamDownload(function () use ($headers, $rows) {
            $h = fopen('php://output', 'w');
            fputcsv($h, $headers);
            foreach ($rows as $r) fputcsv($h, $r);
            fclose($h);
        }, 'products-sample.csv', ['Content-Type' => 'text/csv']);
    }

    public function bulkImport(Request $request, Store $store)
    {
        $request->validate([
            'file' => 'required|file|mimes:csv,txt|max:5120',
        ]);

        $path = $request->file('file')->getRealPath();
        $handle = fopen($path, 'r');
        if (!$handle) {
            return back()->withErrors(['file' => 'Could not read the uploaded file.']);
        }

        $headerRow = fgetcsv($handle);
        if (!$headerRow) {
            fclose($handle);
            return back()->withErrors(['file' => 'CSV is empty.']);
        }
        $header = array_map(fn ($h) => trim((string) $h), $headerRow);

        $required = ['type', 'name', 'sku'];
        foreach ($required as $col) {
            if (!in_array($col, $header, true)) {
                fclose($handle);
                return back()->withErrors(['file' => "Missing required column: {$col}"]);
            }
        }

        // Group rows by SKU (parent identifier)
        $groups = [];
        $rowNum = 1;
        while (($row = fgetcsv($handle)) !== false) {
            $rowNum++;
            if (count($row) === 1 && trim((string) $row[0]) === '') continue; // blank line
            $assoc = [];
            foreach ($header as $i => $col) {
                $assoc[$col] = isset($row[$i]) ? trim((string) $row[$i]) : '';
            }
            $assoc['_row'] = $rowNum;
            $sku = $assoc['sku'];
            if ($sku === '') {
                $groups['__error__' . $rowNum] = ['_error' => "Row {$rowNum}: SKU is empty"];
                continue;
            }
            $groups[$sku][] = $assoc;
        }
        fclose($handle);

        $categoriesCache = [];
        $created = 0;
        $skipped = 0;
        $errors = [];

        DB::transaction(function () use ($store, $groups, &$categoriesCache, &$created, &$skipped, &$errors) {
            foreach ($groups as $sku => $rows) {
                if (isset($rows['_error'])) {
                    $errors[] = $rows['_error'];
                    continue;
                }
                $first = $rows[0];
                $rowNum = $first['_row'];
                $type = strtolower($first['type'] ?? '');

                if (!in_array($type, ['simple', 'variable'], true)) {
                    $errors[] = "Row {$rowNum} (SKU {$sku}): type must be 'simple' or 'variable'";
                    continue;
                }
                if ($first['name'] === '') {
                    $errors[] = "Row {$rowNum} (SKU {$sku}): name is required";
                    continue;
                }

                if ($store->products()->where('sku', $sku)->exists()) {
                    $errors[] = "Row {$rowNum} (SKU {$sku}): a product with this SKU already exists — skipped";
                    $skipped++;
                    continue;
                }

                // Resolve / create category
                $categoryId = null;
                if (!empty($first['category'])) {
                    $catName = $first['category'];
                    $key = strtolower($catName);
                    if (isset($categoriesCache[$key])) {
                        $categoryId = $categoriesCache[$key];
                    } else {
                        $cat = $store->categories()->whereRaw('LOWER(name) = ?', [$key])->first()
                            ?: $store->categories()->create(['name' => $catName]);
                        $categoriesCache[$key] = $cat->id;
                        $categoryId = $cat->id;
                    }
                }

                $status = in_array($first['status'] ?? '', ['active', 'draft'], true) ? $first['status'] : 'active';

                if ($type === 'simple') {
                    $stockQty = (int) ($first['stock_qty'] !== '' ? $first['stock_qty'] : 0);
                    $product = $store->products()->create([
                        'name' => $first['name'],
                        'sku' => $sku,
                        'barcode' => !empty($first['barcode']) ? $first['barcode'] : null,
                        'type' => 'simple',
                        'category_id' => $categoryId,
                        'description' => $first['description'] ?: null,
                        'cost_price' => $first['cost_price'] !== '' ? (float) $first['cost_price'] : null,
                        'selling_price' => $first['selling_price'] !== '' ? (float) $first['selling_price'] : null,
                        'stock_qty' => $stockQty,
                        'low_stock_threshold' => $first['low_stock_threshold'] !== '' ? (int) $first['low_stock_threshold'] : null,
                        'status' => $status,
                        'last_restocked_at' => $stockQty > 0 ? now() : null,
                    ]);
                    $created++;
                    continue;
                }

                // variable
                $product = $store->products()->create([
                    'name' => $first['name'],
                    'sku' => $sku,
                    'barcode' => !empty($first['barcode']) ? $first['barcode'] : null,
                    'type' => 'variable',
                    'category_id' => $categoryId,
                    'description' => $first['description'] ?: null,
                    'cost_price' => $first['cost_price'] !== '' ? (float) $first['cost_price'] : null,
                    'status' => $status,
                ]);

                $totalVariantStock = 0;
                $variantCount = 0;
                foreach ($rows as $i => $r) {
                    if (empty($r['variant_attributes']) || $r['variant_price'] === '' || $r['variant_stock'] === '') {
                        $errors[] = "Row {$r['_row']} (SKU {$sku}): variant row needs variant_attributes, variant_price, variant_stock";
                        continue;
                    }
                    $attrs = $this->parseVariantAttrs($r['variant_attributes']);
                    if (!$attrs) {
                        $errors[] = "Row {$r['_row']} (SKU {$sku}): invalid variant_attributes format (use 'Key:Value|Key:Value')";
                        continue;
                    }
                    $vStock = (int) $r['variant_stock'];
                    ProductVariant::create([
                        'product_id' => $product->id,
                        'store_id' => $store->id,
                        'sku' => $r['variant_sku'] ?: ($sku . '-' . ($i + 1)),
                        'barcode' => !empty($r['variant_barcode']) ? $r['variant_barcode'] : null,
                        'attributes' => $attrs,
                        'price' => (float) $r['variant_price'],
                        'stock_qty' => $vStock,
                        'low_stock_threshold' => $r['variant_low_stock_threshold'] !== '' ? (int) $r['variant_low_stock_threshold'] : null,
                        'is_default' => $i === 0,
                    ]);
                    $totalVariantStock += $vStock;
                    $variantCount++;
                }
                if ($totalVariantStock > 0) {
                    $product->update(['last_restocked_at' => now()]);
                }
                if ($variantCount === 0) {
                    // All variant rows were invalid — roll back this product
                    $product->delete();
                    $errors[] = "SKU {$sku}: no valid variants — product not created";
                    continue;
                }
                $created++;
            }
        });

        return back()->with('success', "Import complete: {$created} created, {$skipped} skipped" . (count($errors) ? ", " . count($errors) . " issues" : ""))
            ->with('importErrors', $errors);
    }

    private function parseVariantAttrs(string $raw): array
    {
        $out = [];
        foreach (explode('|', $raw) as $pair) {
            $parts = explode(':', $pair, 2);
            if (count($parts) !== 2) continue;
            $k = trim($parts[0]);
            $v = trim($parts[1]);
            if ($k === '' || $v === '') continue;
            $out[$k] = $v;
        }
        return $out;
    }

    /**
     * Normalize variant attributes to a flat key→value object.
     * Accepts either format from the form:
     *   - [{key: 'Color', value: 'Red'}, ...] (current Product form UI)
     *   - {Color: 'Red', Size: 'M'} (legacy / seeded)
     */
    private function normalizeAttributes($attrs): array
    {
        if (!is_array($attrs)) return [];

        $isAssoc = array_keys($attrs) !== range(0, count($attrs) - 1);
        if ($isAssoc) {
            return array_filter($attrs, fn ($v, $k) => $k !== '' && $v !== null && $v !== '', ARRAY_FILTER_USE_BOTH);
        }

        $out = [];
        foreach ($attrs as $row) {
            if (!is_array($row)) continue;
            $key = trim((string) ($row['key'] ?? ''));
            $val = $row['value'] ?? '';
            if ($key !== '' && $val !== '') {
                $out[$key] = $val;
            }
        }
        return $out;
    }
}
