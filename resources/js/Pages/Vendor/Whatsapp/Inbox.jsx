import { useEffect, useMemo, useRef, useState } from 'react';
import { Head, router, useForm } from '@inertiajs/react';
import VendorLayout from '@/Layouts/VendorLayout';
import { useStorePath } from '@/lib/storePath';

/** "3 hours left" / "48 minutes left" — the number staff actually care about. */
function useTimeLeft(expiresAt) {
    const [now, setNow] = useState(() => Date.now());

    useEffect(() => {
        if (!expiresAt) return;
        const id = setInterval(() => setNow(Date.now()), 30000);
        return () => clearInterval(id);
    }, [expiresAt]);

    return useMemo(() => {
        if (!expiresAt) return null;
        const ms = new Date(expiresAt).getTime() - now;
        if (ms <= 0) return null;
        const minutes = Math.floor(ms / 60000);
        if (minutes < 60) return `${minutes} min left to reply`;
        return `${Math.floor(minutes / 60)} hr left to reply`;
    }, [expiresAt, now]);
}

function StatusTick({ status }) {
    if (status === 'failed') return <span className="text-red-500">failed</span>;
    if (status === 'read') return <span className="text-blue-500">read</span>;
    if (status === 'delivered') return <span>delivered</span>;
    if (status === 'queued') return <span className="italic">sending…</span>;
    return <span>sent</span>;
}

function Bubble({ message }) {
    const outbound = message.direction === 'outbound';
    return (
        <div className={`flex ${outbound ? 'justify-end' : 'justify-start'}`}>
            <div
                className={`max-w-[75%] rounded-2xl px-3.5 py-2 text-sm ${
                    outbound
                        ? 'rounded-br-sm bg-green-600 text-white'
                        : 'rounded-bl-sm border border-gray-200 bg-white text-gray-900'
                }`}
            >
                {message.type === 'template' && (
                    <span className={`mb-1 block text-[10px] uppercase tracking-wide ${outbound ? 'text-green-100' : 'text-gray-400'}`}>
                        Template
                    </span>
                )}
                <p className="whitespace-pre-wrap break-words">{message.body || <em>(no text)</em>}</p>
                <div className={`mt-1 flex items-center gap-1.5 text-[11px] ${outbound ? 'text-green-100' : 'text-gray-400'}`}>
                    <span>{message.at}</span>
                    {outbound && (
                        <>
                            <span>·</span>
                            <StatusTick status={message.status} />
                        </>
                    )}
                </div>
                {message.status === 'failed' && message.error_message && (
                    <p className="mt-1 rounded bg-red-50 px-2 py-1 text-[11px] text-red-700">{message.error_message}</p>
                )}
            </div>
        </div>
    );
}

export default function Inbox({ connected, conversations = [], selected = null, messages = [], templates = [] }) {
    const url = useStorePath();
    const timeLeft = useTimeLeft(selected?.window_expires_at);
    const threadRef = useRef(null);

    const { data, setData, post, processing, reset, errors } = useForm({
        body: '',
        template_name: '',
        language: 'en',
        params: [],
    });

    useEffect(() => {
        threadRef.current?.scrollTo({ top: threadRef.current.scrollHeight });
    }, [messages]);

    // New messages arrive by webhook, so the page has to ask for them.
    useEffect(() => {
        const id = setInterval(() => {
            router.reload({ only: ['conversations', 'messages'], preserveScroll: true });
        }, 20000);
        return () => clearInterval(id);
    }, []);

    function send(e) {
        e.preventDefault();
        if (!selected) return;
        post(url(`/whatsapp/${selected.id}/reply`), {
            preserveScroll: true,
            onSuccess: () => reset('body', 'template_name', 'params'),
        });
    }

    if (!connected) {
        return (
            <VendorLayout title="WhatsApp">
                <Head title="WhatsApp" />
                <div className="rounded-lg border border-dashed border-gray-300 bg-white p-10 text-center">
                    <h2 className="text-lg font-medium text-gray-900">WhatsApp is not connected</h2>
                    <p className="mx-auto mt-2 max-w-md text-sm text-gray-600">
                        Connect your WhatsApp Business number to read and reply to customer messages here.
                    </p>
                    <button
                        type="button"
                        onClick={() => router.visit(url('/settings'))}
                        className="mt-4 rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
                    >
                        Go to Settings
                    </button>
                </div>
            </VendorLayout>
        );
    }

    return (
        <VendorLayout title="WhatsApp">
            <Head title="WhatsApp" />

            <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
                {/* Conversation list */}
                <div className="max-h-[70vh] overflow-y-auto rounded-lg border border-gray-200 bg-white">
                    {conversations.length === 0 && (
                        <p className="p-5 text-sm text-gray-500">
                            No conversations yet. They appear here as soon as a customer messages your number.
                        </p>
                    )}
                    {conversations.map((c) => (
                        <button
                            key={c.id}
                            type="button"
                            onClick={() => router.get(url('/whatsapp'), { conversation: c.id }, { preserveState: false })}
                            className={`flex w-full items-start justify-between gap-2 border-b border-gray-100 px-4 py-3 text-left hover:bg-gray-50 ${
                                selected?.id === c.id ? 'bg-green-50' : ''
                            }`}
                        >
                            <div className="min-w-0">
                                <p className="truncate font-medium text-gray-900">{c.name}</p>
                                <p className="mt-0.5 text-xs text-gray-500">
                                    {c.last_message_at || 'No messages yet'}
                                    {!c.window_open && <span className="ml-1 text-amber-600">· template only</span>}
                                </p>
                            </div>
                            {c.unread_count > 0 && (
                                <span className="mt-0.5 rounded-full bg-green-600 px-2 py-0.5 text-xs font-medium text-white">
                                    {c.unread_count}
                                </span>
                            )}
                        </button>
                    ))}
                </div>

                {/* Thread */}
                <div className="flex max-h-[70vh] flex-col rounded-lg border border-gray-200 bg-gray-50">
                    {!selected && (
                        <div className="flex flex-1 items-center justify-center p-10 text-sm text-gray-500">
                            Choose a conversation to read it.
                        </div>
                    )}

                    {selected && (
                        <>
                            <div className="flex items-center justify-between gap-3 border-b border-gray-200 bg-white px-4 py-3">
                                <div>
                                    <p className="font-medium text-gray-900">{selected.name}</p>
                                    <p className="text-xs text-gray-500">+{selected.wa_id}</p>
                                </div>
                                {selected.customer_id && (
                                    <button
                                        type="button"
                                        onClick={() => router.visit(url(`/customers/${selected.customer_id}`))}
                                        className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
                                    >
                                        View customer
                                    </button>
                                )}
                            </div>

                            <div ref={threadRef} className="flex-1 space-y-2 overflow-y-auto p-4">
                                {messages.map((m) => (
                                    <Bubble key={m.id} message={m} />
                                ))}
                            </div>

                            <div className="border-t border-gray-200 bg-white p-3">
                                {errors.reply && (
                                    <p className="mb-2 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{errors.reply}</p>
                                )}

                                {selected.window_open ? (
                                    <form onSubmit={send} className="flex items-end gap-2">
                                        <div className="flex-1">
                                            <textarea
                                                value={data.body}
                                                onChange={(e) => setData('body', e.target.value)}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter' && !e.shiftKey) {
                                                        e.preventDefault();
                                                        send(e);
                                                    }
                                                }}
                                                rows={2}
                                                placeholder="Write a reply…"
                                                className="w-full resize-none rounded-xl border border-gray-300 bg-white px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 shadow-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-500/30 outline-none transition"
                                            />
                                            {timeLeft && <p className="mt-1 text-xs text-gray-500">{timeLeft}</p>}
                                        </div>
                                        <button
                                            type="submit"
                                            disabled={processing || !data.body.trim()}
                                            className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
                                        >
                                            Send
                                        </button>
                                    </form>
                                ) : (
                                    <div className="space-y-2">
                                        <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-900">
                                            This customer last messaged over 24 hours ago. WhatsApp only allows an
                                            approved template until they reply again.
                                        </p>
                                        {templates.length === 0 ? (
                                            <p className="text-sm text-gray-500">
                                                No approved templates yet. Create one in Settings → WhatsApp.
                                            </p>
                                        ) : (
                                            <form onSubmit={send} className="flex items-end gap-2">
                                                <select
                                                    value={data.template_name}
                                                    onChange={(e) => {
                                                        const t = templates.find((x) => x.name === e.target.value);
                                                        setData({
                                                            ...data,
                                                            template_name: e.target.value,
                                                            language: t?.language || 'en',
                                                        });
                                                    }}
                                                    className="flex-1 rounded-xl border border-gray-300 bg-white px-3.5 py-2.5 text-sm text-gray-900 shadow-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-500/30 outline-none transition"
                                                >
                                                    <option value="">Choose a template…</option>
                                                    {templates.map((t) => (
                                                        <option key={`${t.name}-${t.language}`} value={t.name}>
                                                            {t.name} — {t.body?.slice(0, 50)}
                                                        </option>
                                                    ))}
                                                </select>
                                                <button
                                                    type="submit"
                                                    disabled={processing || !data.template_name}
                                                    className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
                                                >
                                                    Send
                                                </button>
                                            </form>
                                        )}
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </div>
            </div>
        </VendorLayout>
    );
}
