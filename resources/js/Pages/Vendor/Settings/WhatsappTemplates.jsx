import { useRef, useState } from 'react';
import { router, useForm } from '@inertiajs/react';
import { useStorePath } from '@/lib/storePath';
import TextInput from '@/Components/TextInput';
import Label from '@/Components/Label';
import Button from '@/Components/Button';

// Selects and textareas have no shared component, so they borrow TextInput's
// styling. Tailwind's preflight zeroes border-width, so `border` must be set
// explicitly or the control renders with no visible edge at all.
const CONTROL =
    'w-full rounded-xl border border-gray-300 bg-white px-3.5 py-2.5 text-sm text-gray-900 ' +
    'placeholder-gray-400 shadow-sm hover:border-gray-400 focus:border-primary-500 ' +
    'focus:ring-2 focus:ring-primary-500/30 outline-none transition';

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
        body: 'Hello {{1}}, thank you for shopping with {{2}}. Your invoice for order {{3}} is attached.',
        examples: ['Priya', 'Shivam Fashion', 'ORD-0042'],
        attach_pdf: true,
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
        attach_pdf: false,
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
            attach_pdf: !!starter.attach_pdf,
        });
        setOpen(true);
    }

    const errorRef = useRef(null);
    const [crashed, setCrashed] = useState(null);

    function submit(e) {
        // Called from a button click, not a form submit: this panel is rendered
        // inside the Settings page's own <form>, and a nested form's submit
        // button fires the outer form instead — which silently saved settings
        // and never created the template.
        e?.preventDefault?.();
        e?.stopPropagation?.();
        setCrashed(null);
        post(url('/settings/whatsapp/templates'), {
            preserveScroll: true,
            onSuccess: () => {
                reset();
                setOpen(false);
            },
            onError: () => {
                // An error above the fold is an error nobody reads.
                requestAnimationFrame(() => {
                    errorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                });
            },
            // Fires when the request never came back cleanly — a timeout or a
            // server error rather than a rejection from Meta.
            onException: (error) => setCrashed(String(error?.message || error)),
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
                <div className="space-y-4 rounded-lg border border-gray-200 bg-gray-50 p-4">
                    <div ref={errorRef}>
                        {errors.template && (
                            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                                {errors.template}
                            </div>
                        )}
                        {crashed && (
                            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                                The server did not finish this request: {crashed}.
                                <span className="mt-1 block text-xs">
                                    This usually means it ran out of time or memory. Ask your administrator to run
                                    <code className="mx-1 rounded bg-red-100 px-1">artisan whatsapp:template</code>
                                    which does the same thing without a time limit.
                                </span>
                            </div>
                        )}
                    </div>

                    <div className="grid gap-4 sm:grid-cols-3">
                        <div>
                            <Label>Name</Label>
                            <TextInput
                                value={data.name}
                                onChange={(e) => setData('name', e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_'))}
                                placeholder="order_ready"
                                error={errors.name}
                            />
                            <p className="mt-1 text-xs text-gray-500">Lowercase, no spaces. Customers never see this.</p>
                        </div>
                        <div>
                            <Label>Language</Label>
                            <select
                                value={data.language}
                                onChange={(e) => setData('language', e.target.value)}
                                className={CONTROL}
                            >
                                <option value="en">English</option>
                                <option value="en_GB">English (UK)</option>
                                <option value="hi">Hindi</option>
                                <option value="gu">Gujarati</option>
                                <option value="mr">Marathi</option>
                            </select>
                        </div>
                        <div>
                            <Label>Type</Label>
                            <select
                                value={data.category}
                                onChange={(e) => setData('category', e.target.value)}
                                className={CONTROL}
                            >
                                <option value="UTILITY">About an order (cheaper)</option>
                                <option value="MARKETING">Offer or promotion</option>
                            </select>
                        </div>
                    </div>

                    <div>
                        <Label>Message</Label>
                        <textarea
                            value={data.body}
                            onChange={(e) => setData('body', e.target.value)}
                            rows={4}
                            placeholder="Hello {{1}}, your order {{2}} is ready."
                            className={CONTROL}
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
                            <Label>Example values</Label>
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
                                        className={CONTROL}
                                    />
                                ))}
                            </div>
                        </div>
                    )}

                    <label className="flex items-start gap-2 rounded-md border border-gray-200 bg-white p-3">
                        <input
                            type="checkbox"
                            checked={data.attach_pdf}
                            onChange={(e) => setData('attach_pdf', e.target.checked)}
                            className="mt-0.5 h-4 w-4 rounded border border-gray-300 text-primary-600 focus:ring-2 focus:ring-primary-500/30"
                        />
                        <span className="text-sm text-gray-700">
                            <b>Attach the invoice PDF</b>
                            <span className="mt-0.5 block text-xs text-gray-500">
                                The customer receives the invoice as a file they can save, instead of a link.
                                A sample invoice is sent to Meta so they can review it.
                            </span>
                        </span>
                    </label>

                    <div>
                        <Label>Footer (optional)</Label>
                        <input
                            value={data.footer}
                            onChange={(e) => setData('footer', e.target.value)}
                            maxLength={60}
                            className={CONTROL}
                        />
                    </div>

                    <div className="flex justify-end gap-2">
                        <Button type="button" variant="secondary" onClick={() => { reset(); setOpen(false); }}>
                            Cancel
                        </Button>
                        <Button type="button" loading={processing} onClick={submit}>
                            Send for approval
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}
