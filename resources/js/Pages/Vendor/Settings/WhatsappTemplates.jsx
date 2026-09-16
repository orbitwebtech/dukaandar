import { useState } from 'react';
import { router, useForm } from '@inertiajs/react';
import { useStorePath } from '@/lib/storePath';

const STATUS_STYLES = {
    APPROVED: 'bg-green-100 text-green-800 border-green-200',
    PENDING: 'bg-amber-100 text-amber-800 border-amber-200',
    REJECTED: 'bg-red-100 text-red-800 border-red-200',
    PAUSED: 'bg-gray-100 text-gray-700 border-gray-200',
};

const STARTERS = [
    {
        label: 'Invoice',
        name: 'invoice_ready',
        body: 'Hello {{1}}, thank you for shopping with {{2}}. Your invoice for order {{3}} is here: {{4}}',
        examples: ['Priya', 'Shivam Fashion', 'ORD-0042', 'https://example.com/i/42'],
        footer: 'Reply here if you have any questions.',
    },
    {
        label: 'Review request',
        name: 'review_request',
        body: 'Hi {{1}}, we hope you liked your purchase from {{2}}. Would you leave us a review? {{3}}',
        examples: ['Priya', 'Shivam Fashion', 'https://example.com/review'],
        footer: 'Thank you for your support.',
    },
];

function countPlaceholders(body) {
    const found = [...String(body || '').matchAll(/\{\{\s*(\d+)\s*\}\}/g)].map((m) => Number(m[1]));
    return found.length ? Math.max(...found) : 0;
}

export default function WhatsappTemplates({ templates = [], connected = false }) {
    const url = useStorePath();
    const [open, setOpen] = useState(false);

    const { data, setData, post, processing, errors, reset } = useForm({
        name: '',
        language: 'en',
        category: 'UTILITY',
        body: '',
        footer: '',
        examples: [],
    });

    const placeholders = countPlaceholders(data.body);

    function applyStarter(starter) {
        setData({
            name: starter.name,
            language: 'en',
            category: 'UTILITY',
            body: starter.body,
            footer: starter.footer,
            examples: starter.examples,
        });
        setOpen(true);
    }

    function submit(e) {
        e.preventDefault();
        post(url('/settings/whatsapp/templates'), {
            preserveScroll: true,
            onSuccess: () => {
                reset();
                setOpen(false);
            },
        });
    }

    if (!connected) {
        return (
            <p className="text-sm text-gray-500">
                Connect WhatsApp above to create the messages you send to customers.
            </p>
        );
    }

    return (
        <div className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h3 className="font-medium text-gray-900">Message templates</h3>
                    <p className="mt-0.5 text-sm text-gray-600">
                        Meta must approve any message sent more than 24 hours after a customer last wrote to you.
                    </p>
                </div>
                <div className="flex gap-2">
                    <button
                        type="button"
                        onClick={() => router.post(url('/settings/whatsapp/templates/sync'), {}, { preserveScroll: true })}
                        className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
                    >
                        Refresh from Meta
                    </button>
                    <button
                        type="button"
                        onClick={() => setOpen((v) => !v)}
                        className="rounded-md bg-green-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-700"
                    >
                        {open ? 'Cancel' : 'New template'}
                    </button>
                </div>
            </div>

            {templates.length === 0 && !open && (
                <div className="rounded-lg border border-dashed border-gray-300 p-5 text-center">
                    <p className="text-sm text-gray-600">No templates yet. Start from a ready-made one:</p>
                    <div className="mt-3 flex flex-wrap justify-center gap-2">
                        {STARTERS.map((s) => (
                            <button
                                key={s.name}
                                type="button"
                                onClick={() => applyStarter(s)}
                                className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
                            >
                                {s.label}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {templates.length > 0 && (
                <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                        <thead>
                            <tr className="border-b border-gray-200 text-left text-xs uppercase tracking-wide text-gray-500">
                                <th className="py-2 pr-4">Name</th>
                                <th className="py-2 pr-4">Message</th>
                                <th className="py-2 pr-4">Category</th>
                                <th className="py-2">Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {templates.map((t) => (
                                <tr key={`${t.name}-${t.language}`} className="border-b border-gray-100 align-top">
                                    <td className="py-2.5 pr-4 font-medium text-gray-900">
                                        {t.name}
                                        <span className="ml-1 text-xs font-normal text-gray-400">{t.language}</span>
                                    </td>
                                    <td className="max-w-sm py-2.5 pr-4 text-gray-600">
                                        {t.body}
                                        {t.status === 'REJECTED' && t.rejected_reason && (
                                            <span className="mt-1 block text-xs text-red-600">
                                                Rejected: {t.rejected_reason}
                                            </span>
                                        )}
                                    </td>
                                    <td className="py-2.5 pr-4 text-gray-600">{t.category}</td>
                                    <td className="py-2.5">
                                        <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[t.status] || STATUS_STYLES.PAUSED}`}>
                                            {t.status}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {open && (
                <form onSubmit={submit} className="space-y-4 rounded-lg border border-gray-200 bg-gray-50 p-4">
                    {errors.template && (
                        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                            {errors.template}
                        </div>
                    )}

                    <div className="grid gap-4 sm:grid-cols-3">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Name</label>
                            <input
                                value={data.name}
                                onChange={(e) => setData('name', e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_'))}
                                placeholder="order_ready"
                                className="mt-1 w-full rounded-md border-gray-300 text-sm shadow-sm"
                            />
                            <p className="mt-1 text-xs text-gray-500">Lowercase, no spaces. Customers never see this.</p>
                            {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Language</label>
                            <select
                                value={data.language}
                                onChange={(e) => setData('language', e.target.value)}
                                className="mt-1 w-full rounded-md border-gray-300 text-sm shadow-sm"
                            >
                                <option value="en">English</option>
                                <option value="en_GB">English (UK)</option>
                                <option value="hi">Hindi</option>
                                <option value="gu">Gujarati</option>
                                <option value="mr">Marathi</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Type</label>
                            <select
                                value={data.category}
                                onChange={(e) => setData('category', e.target.value)}
                                className="mt-1 w-full rounded-md border-gray-300 text-sm shadow-sm"
                            >
                                <option value="UTILITY">About an order (cheaper)</option>
                                <option value="MARKETING">Offer or promotion</option>
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700">Message</label>
                        <textarea
                            value={data.body}
                            onChange={(e) => setData('body', e.target.value)}
                            rows={4}
                            placeholder="Hello {{1}}, your order {{2}} is ready."
                            className="mt-1 w-full rounded-md border-gray-300 text-sm shadow-sm"
                        />
                        <p className="mt-1 text-xs text-gray-500">
                            Use <code className="rounded bg-gray-200 px-1">{'{{1}}'}</code>,{' '}
                            <code className="rounded bg-gray-200 px-1">{'{{2}}'}</code> where the customer name, order
                            number or link should go.
                        </p>
                        {errors.body && <p className="mt-1 text-sm text-red-600">{errors.body}</p>}
                    </div>

                    {placeholders > 0 && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700">
                                Example values
                            </label>
                            <p className="mb-2 text-xs text-gray-500">
                                Meta rejects templates it cannot see filled in. Give a realistic value for each blank.
                            </p>
                            <div className="grid gap-2 sm:grid-cols-2">
                                {Array.from({ length: placeholders }).map((_, i) => (
                                    <input
                                        key={i}
                                        value={data.examples[i] || ''}
                                        onChange={(e) => {
                                            const next = [...data.examples];
                                            next[i] = e.target.value;
                                            setData('examples', next);
                                        }}
                                        placeholder={`Value for {{${i + 1}}}`}
                                        className="rounded-md border-gray-300 text-sm shadow-sm"
                                    />
                                ))}
                            </div>
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-gray-700">Footer (optional)</label>
                        <input
                            value={data.footer}
                            onChange={(e) => setData('footer', e.target.value)}
                            maxLength={60}
                            className="mt-1 w-full rounded-md border-gray-300 text-sm shadow-sm"
                        />
                    </div>

                    <div className="flex justify-end gap-2">
                        <button
                            type="button"
                            onClick={() => { reset(); setOpen(false); }}
                            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={processing}
                            className="rounded-md bg-green-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
                        >
                            {processing ? 'Sending…' : 'Send for approval'}
                        </button>
                    </div>
                </form>
            )}
        </div>
    );
}
