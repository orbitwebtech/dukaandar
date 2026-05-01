import { useRef, useState } from 'react';
import { Head, Link, router, usePage } from '@inertiajs/react';
import VendorLayout from '@/Layouts/VendorLayout';
import { useStorePath } from '@/lib/storePath';
import Card, { CardHeader } from '@/Components/Card';
import Button from '@/Components/Button';
import { ArrowLeft, Download, Upload, FileText, AlertCircle, CheckCircle } from 'lucide-react';

export default function ProductsImport() {
    const url = useStorePath();
    const { flash } = usePage().props;
    const inputRef = useRef(null);
    const [file, setFile] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState(null);

    const importErrors = flash?.importErrors || [];
    const successMsg = flash?.success;

    function submit(e) {
        e.preventDefault();
        if (!file) return;
        setError(null);
        setUploading(true);
        router.post(url('/products/import'), { file }, {
            forceFormData: true,
            preserveScroll: true,
            onSuccess: () => {
                setFile(null);
                if (inputRef.current) inputRef.current.value = '';
            },
            onError: (errs) => {
                setError(errs.file || 'Import failed.');
            },
            onFinish: () => setUploading(false),
        });
    }

    return (
        <VendorLayout title="Import Products">
            <Head title="Import Products" />

            <div className="max-w-3xl space-y-5">
                <Link href={url('/products')} className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition">
                    <ArrowLeft className="h-4 w-4" /> Back to Products
                </Link>

                <Card>
                    <CardHeader
                        title="Bulk Import Products"
                        subtitle="Upload a CSV with simple and variable products. Download the sample below to see the expected format."
                    />

                    <div className="space-y-4">
                        {/* Sample download */}
                        <div className="rounded-lg border border-blue-200 bg-blue-50/40 p-4 flex items-center justify-between gap-3">
                            <div className="flex items-start gap-3">
                                <FileText className="h-5 w-5 text-blue-600 mt-0.5" />
                                <div>
                                    <p className="text-sm font-semibold text-gray-900">Sample CSV</p>
                                    <p className="text-xs text-gray-600 mt-0.5">Includes 2 simple products + 1 variable product with 3 variants. Open in Excel or Sheets, replace with your data, and upload.</p>
                                </div>
                            </div>
                            <a
                                href={url('/products/sample-csv')}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-blue-300 bg-white px-3 py-2 text-sm font-medium text-blue-700 hover:bg-blue-50 transition whitespace-nowrap"
                            >
                                <Download className="h-4 w-4" /> Download Sample
                            </a>
                        </div>

                        {/* Upload form */}
                        <form onSubmit={submit} className="space-y-3">
                            <input
                                ref={inputRef}
                                type="file"
                                accept=".csv,text/csv"
                                className="hidden"
                                onChange={(e) => setFile(e.target.files?.[0] || null)}
                            />
                            <div className="flex items-center gap-3">
                                <Button type="button" variant="outline" onClick={() => inputRef.current?.click()}>
                                    <Upload className="h-4 w-4" /> Choose CSV file
                                </Button>
                                {file && <span className="text-sm text-gray-700 truncate">{file.name}</span>}
                                <Button type="submit" loading={uploading} disabled={!file}>
                                    Import
                                </Button>
                            </div>
                            {error && <p className="text-sm text-red-600">{error}</p>}
                        </form>

                        {/* Result */}
                        {successMsg && (
                            <div className="rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm text-emerald-800 flex items-start gap-2">
                                <CheckCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                                <span>{successMsg}</span>
                            </div>
                        )}
                        {importErrors.length > 0 && (
                            <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3">
                                <p className="text-sm font-semibold text-amber-900 mb-2 flex items-center gap-2">
                                    <AlertCircle className="h-4 w-4" /> Issues during import ({importErrors.length})
                                </p>
                                <ul className="space-y-1 text-xs text-amber-900">
                                    {importErrors.map((err, i) => (
                                        <li key={i}>• {err}</li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                </Card>

                {/* Format reference */}
                <Card>
                    <CardHeader title="CSV Format Reference" />
                    <div className="text-sm text-gray-700 space-y-3">
                        <div>
                            <p className="font-semibold mb-1">Required columns:</p>
                            <p className="text-xs text-gray-600"><code className="bg-gray-100 px-1 rounded">type</code> · <code className="bg-gray-100 px-1 rounded">name</code> · <code className="bg-gray-100 px-1 rounded">sku</code></p>
                        </div>
                        <div>
                            <p className="font-semibold mb-1">Optional columns:</p>
                            <p className="text-xs text-gray-600">
                                <code className="bg-gray-100 px-1 rounded">category</code> (auto-created) ·{' '}
                                <code className="bg-gray-100 px-1 rounded">description</code> ·{' '}
                                <code className="bg-gray-100 px-1 rounded">cost_price</code> ·{' '}
                                <code className="bg-gray-100 px-1 rounded">selling_price</code> (simple only) ·{' '}
                                <code className="bg-gray-100 px-1 rounded">stock_qty</code> (simple only) ·{' '}
                                <code className="bg-gray-100 px-1 rounded">low_stock_threshold</code> ·{' '}
                                <code className="bg-gray-100 px-1 rounded">status</code> (active/draft, default active)
                            </p>
                        </div>
                        <div>
                            <p className="font-semibold mb-1">Variant columns (for type=variable):</p>
                            <p className="text-xs text-gray-600">
                                <code className="bg-gray-100 px-1 rounded">variant_attributes</code> e.g. <code className="bg-gray-100 px-1 rounded">Color:Red|Size:M</code> ·{' '}
                                <code className="bg-gray-100 px-1 rounded">variant_sku</code> ·{' '}
                                <code className="bg-gray-100 px-1 rounded">variant_price</code> ·{' '}
                                <code className="bg-gray-100 px-1 rounded">variant_stock</code> ·{' '}
                                <code className="bg-gray-100 px-1 rounded">variant_low_stock_threshold</code>
                            </p>
                        </div>
                        <div className="rounded-lg bg-gray-50 border border-gray-200 p-3">
                            <p className="text-xs font-semibold text-gray-700 mb-1">How variable products work:</p>
                            <p className="text-xs text-gray-600">
                                Add <strong>one row per variant</strong>, all sharing the same <code className="bg-white px-1 rounded">sku</code>, <code className="bg-white px-1 rounded">name</code>, and <code className="bg-white px-1 rounded">category</code>. Each row's <code className="bg-white px-1 rounded">variant_attributes</code> defines that variant's attributes (Color, Size, etc.).
                            </p>
                        </div>
                        <div className="rounded-lg bg-gray-50 border border-gray-200 p-3">
                            <p className="text-xs font-semibold text-gray-700 mb-1">Duplicate SKUs:</p>
                            <p className="text-xs text-gray-600">
                                If a product with the same SKU already exists in this store, the import will skip it (and report it in the issues list). Delete or rename the existing product if you want to re-import.
                            </p>
                        </div>
                    </div>
                </Card>
            </div>
        </VendorLayout>
    );
}
