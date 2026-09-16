import { useEffect, useRef, useState } from 'react';
import { router } from '@inertiajs/react';
import { useStorePath } from '@/lib/storePath';

const APP_ID = import.meta.env.VITE_META_APP_ID;
const CONFIG_ID = import.meta.env.VITE_META_CONFIG_ID;
const GRAPH_VERSION = import.meta.env.VITE_META_GRAPH_VERSION || 'v26.0';

const FB_ORIGIN = /^https:\/\/(www|web)\.facebook\.com$/;

/**
 * Loads Meta's JS SDK once, on demand. Nothing is fetched until the shop
 * owner actually opens this tab.
 */
function loadFacebookSdk() {
    if (window.FB) return Promise.resolve(window.FB);
    if (window.__fbSdkPromise) return window.__fbSdkPromise;

    window.__fbSdkPromise = new Promise((resolve, reject) => {
        window.fbAsyncInit = () => {
            window.FB.init({ appId: APP_ID, cookie: true, xfbml: false, version: GRAPH_VERSION });
            resolve(window.FB);
        };
        const script = document.createElement('script');
        script.src = 'https://connect.facebook.net/en_US/sdk.js';
        script.async = true;
        script.defer = true;
        script.crossOrigin = 'anonymous';
        script.onerror = () => reject(new Error('Could not load Facebook. Check your connection and try again.'));
        document.body.appendChild(script);
    });

    return window.__fbSdkPromise;
}

function StatusPill({ status }) {
    const styles = {
        connected: 'bg-green-100 text-green-800 border-green-200',
        pending: 'bg-amber-100 text-amber-800 border-amber-200',
        disconnected: 'bg-red-100 text-red-800 border-red-200',
    };
    const labels = {
        connected: 'Connected',
        pending: 'Finishing setup',
        disconnected: 'Disconnected',
    };
    return (
        <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${styles[status] || styles.pending}`}>
            {labels[status] || status}
        </span>
    );
}

export default function ConnectWhatsapp({ account = null }) {
    const url = useStorePath();
    const session = useRef(null);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState(null);

    // Meta posts the WABA and phone number ids here; the login callback
    // delivers the code separately. Both halves are needed.
    useEffect(() => {
        const onMessage = (event) => {
            if (!FB_ORIGIN.test(event.origin)) return;
            try {
                const data = JSON.parse(event.data);
                if (data.type !== 'WA_EMBEDDED_SIGNUP') return;
                if (data.event === 'FINISH') session.current = data.data;
                if (data.event === 'CANCEL') {
                    setBusy(false);
                    setError('Setup was closed before it finished. Nothing was saved.');
                }
                if (data.event === 'ERROR') {
                    setBusy(false);
                    setError(data.data?.error_message || 'Meta reported an error during setup.');
                }
            } catch {
                /* not a message we sent */
            }
        };
        window.addEventListener('message', onMessage);
        return () => window.removeEventListener('message', onMessage);
    }, []);

    async function connect() {
        setError(null);

        if (!APP_ID || !CONFIG_ID) {
            setError('WhatsApp is not configured on this server yet. Ask your administrator to add the Meta keys.');
            return;
        }

        setBusy(true);
        session.current = null;

        let FB;
        try {
            FB = await loadFacebookSdk();
        } catch (e) {
            setBusy(false);
            setError(e.message);
            return;
        }

        FB.login(
            (response) => {
                const code = response?.authResponse?.code;
                if (!code || !session.current) {
                    setBusy(false);
                    setError('Setup did not complete. Please try again.');
                    return;
                }
                router.post(
                    url('/settings/whatsapp/connect'),
                    {
                        code,
                        waba_id: session.current.waba_id,
                        phone_number_id: session.current.phone_number_id,
                    },
                    {
                        preserveScroll: true,
                        onFinish: () => setBusy(false),
                    }
                );
            },
            {
                config_id: CONFIG_ID,
                response_type: 'code',
                override_default_response_type: true,
                extras: { setup: {}, sessionInfoVersion: '3' },
            }
        );
    }

    if (account) {
        return (
            <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-gray-200 bg-white p-4">
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="font-medium text-gray-900">
                                {account.display_phone_number || 'WhatsApp number'}
                            </span>
                            <StatusPill status={account.status} />
                        </div>
                        {account.verified_name && (
                            <p className="mt-0.5 text-sm text-gray-500">Shown to customers as {account.verified_name}</p>
                        )}
                    </div>
                    <button
                        type="button"
                        onClick={() => {
                            if (confirm('Disconnect WhatsApp? Customers will no longer be able to message this store through Dukaandar.')) {
                                router.delete(url('/settings/whatsapp'), { preserveScroll: true });
                            }
                        }}
                        className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
                    >
                        Disconnect
                    </button>
                </div>

                <dl className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
                    <div>
                        <dt className="text-gray-500">Quality</dt>
                        <dd className="mt-0.5 font-medium text-gray-900">{account.quality_rating || '—'}</dd>
                    </div>
                    <div>
                        <dt className="text-gray-500">Messaging tier</dt>
                        <dd className="mt-0.5 font-medium text-gray-900">{account.messaging_tier || '—'}</dd>
                    </div>
                    <div>
                        <dt className="text-gray-500">Connected</dt>
                        <dd className="mt-0.5 font-medium text-gray-900">{account.connected_at || '—'}</dd>
                    </div>
                    <div>
                        <dt className="text-gray-500">Last message received</dt>
                        <dd className="mt-0.5 font-medium text-gray-900">{account.last_webhook_at || 'None yet'}</dd>
                    </div>
                </dl>

                {account.status !== 'connected' && (
                    <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
                        <p className="text-sm text-amber-900">
                            The number is linked but not registered for sending yet.
                            {account.last_error ? ` Meta said: ${account.last_error}` : ''}
                        </p>
                        <button
                            type="button"
                            onClick={() => router.post(url('/settings/whatsapp/retry'), {}, { preserveScroll: true })}
                            className="mt-3 rounded-md bg-amber-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-amber-700"
                        >
                            Retry registration
                        </button>
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="rounded-lg border border-gray-200 bg-white p-5">
                <h3 className="font-medium text-gray-900">Connect your WhatsApp number</h3>
                <p className="mt-1 text-sm text-gray-600">
                    Send invoices and reply to customers here, instead of switching to your phone.
                    You keep using WhatsApp on your phone as normal.
                </p>
                <ul className="mt-3 space-y-1 text-sm text-gray-600">
                    <li>• Use the number your customers already message you on</li>
                    <li>• It must be on the WhatsApp Business app, not personal WhatsApp</li>
                    <li>• Keep that phone with you — Meta sends a code to confirm</li>
                </ul>
                <button
                    type="button"
                    onClick={connect}
                    disabled={busy}
                    className="mt-4 rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
                >
                    {busy ? 'Opening Meta…' : 'Connect WhatsApp'}
                </button>
            </div>

            {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</div>
            )}
        </div>
    );
}
