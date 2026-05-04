import { useEffect, useRef, useState } from 'react';
import Modal from '@/Components/Modal';
import { X, Camera, AlertCircle } from 'lucide-react';

// 'idle' = nothing started yet, 'requesting' = awaiting permission prompt,
// 'denied' = user said no (or no camera available), 'starting' = scanner booting,
// 'scanning' = camera active, 'unsupported' = browser has no camera API
export default function BarcodeScannerModal({ show, onClose, onScan }) {
    const containerRef = useRef(null);
    const scannerRef = useRef(null);
    const [phase, setPhase] = useState('idle');
    const [errorDetail, setErrorDetail] = useState(null);

    const startScanner = async () => {
        setErrorDetail(null);

        if (!navigator.mediaDevices?.getUserMedia) {
            setPhase('unsupported');
            return;
        }

        setPhase('requesting');

        // Step 1: explicitly request camera permission (this is what triggers the browser prompt)
        let stream;
        try {
            stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: { ideal: 'environment' } },
            });
        } catch (err) {
            setPhase('denied');
            setErrorDetail(err?.name === 'NotAllowedError'
                ? null
                : err?.message || 'Could not access camera.');
            return;
        }
        // Release the test stream — html5-qrcode will reopen its own
        stream.getTracks().forEach(t => t.stop());

        setPhase('starting');

        try {
            const { Html5Qrcode } = await import('html5-qrcode');
            if (!containerRef.current) return;
            const scanner = new Html5Qrcode(containerRef.current.id);
            scannerRef.current = scanner;

            await scanner.start(
                { facingMode: 'environment' },
                { fps: 10, qrbox: { width: 280, height: 140 } },
                (decoded) => {
                    if (!decoded) return;
                    onScan(decoded);
                    scanner.stop().then(() => scanner.clear()).catch(() => {});
                    onClose();
                },
                () => { /* per-frame failures are normal — ignore */ }
            );
            setPhase('scanning');
        } catch (err) {
            setPhase('denied');
            setErrorDetail(err?.message || 'Failed to start the camera scanner.');
        }
    };

    useEffect(() => {
        if (show) {
            startScanner();
        }
        return () => {
            const s = scannerRef.current;
            if (s) {
                s.stop().then(() => s.clear()).catch(() => {});
                scannerRef.current = null;
            }
            setPhase('idle');
            setErrorDetail(null);
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [show]);

    return (
        <Modal show={show} onClose={onClose} title="Scan a barcode" maxWidth="md">
            <div className="space-y-3">
                {phase === 'requesting' && (
                    <div className="rounded-lg bg-blue-50 border border-blue-200 px-4 py-3 text-sm text-blue-800 flex items-start gap-2">
                        <Camera className="h-4 w-4 mt-0.5 flex-shrink-0" />
                        <span>Waiting for camera permission… Allow access in the browser prompt to scan.</span>
                    </div>
                )}

                {phase === 'denied' && (
                    <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 space-y-2">
                        <div className="flex items-start gap-2">
                            <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                            <div>
                                <p className="font-medium">Camera access blocked</p>
                                <p className="text-xs mt-1 text-red-600">
                                    {errorDetail || 'You denied camera access. Re-enable it in the browser site settings (the lock icon next to the URL), then try again.'}
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={startScanner}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700"
                        >
                            Try again
                        </button>
                    </div>
                )}

                {phase === 'unsupported' && (
                    <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800">
                        Your browser doesn't expose a camera API (or you're on http instead of https). Use a USB scanner or open the page in Chrome/Safari over HTTPS.
                    </div>
                )}

                {phase === 'scanning' && (
                    <p className="text-xs text-gray-500">Point the camera at a barcode. The scanner closes automatically on a successful read.</p>
                )}

                <div
                    ref={containerRef}
                    id="barcode-scanner-region"
                    className={`w-full h-[260px] bg-black rounded-lg overflow-hidden ${phase !== 'scanning' ? 'opacity-30' : ''}`}
                />

                <div className="flex justify-end">
                    <button onClick={onClose} className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">
                        <X className="h-4 w-4" /> Cancel
                    </button>
                </div>
            </div>
        </Modal>
    );
}
