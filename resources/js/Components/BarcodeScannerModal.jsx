import { useEffect, useRef, useState } from 'react';
import Modal from '@/Components/Modal';
import { X, Camera, AlertCircle } from 'lucide-react';

// 'idle' = nothing started, 'requesting' = awaiting permission prompt,
// 'denied' = user said no / no camera, 'starting' = booting reader,
// 'scanning' = camera active, 'unsupported' = no camera API
export default function BarcodeScannerModal({ show, onClose, onScan }) {
    const videoRef = useRef(null);
    const readerRef = useRef(null);
    const detectorIntervalRef = useRef(null);
    const streamRef = useRef(null);
    // Once a code is decoded (or the modal closes), this ref blocks any
    // in-flight ZXing callbacks / BarcodeDetector polls from firing again.
    const dispatchedRef = useRef(false);
    const [phase, setPhase] = useState('idle');
    const [errorDetail, setErrorDetail] = useState(null);

    const stopAll = () => {
        dispatchedRef.current = true;
        if (readerRef.current) {
            try { readerRef.current.reset(); } catch {}
            readerRef.current = null;
        }
        if (detectorIntervalRef.current) {
            clearInterval(detectorIntervalRef.current);
            detectorIntervalRef.current = null;
        }
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(t => t.stop());
            streamRef.current = null;
        }
    };

    const handleDecoded = (text) => {
        if (!text) return;
        if (dispatchedRef.current) return; // already fired for this modal session
        dispatchedRef.current = true;
        stopAll();
        onScan(text);
        onClose();
    };

    const startScanner = async () => {
        setErrorDetail(null);
        stopAll();
        // Re-arm for this fresh session AFTER stopAll (which sets dispatchedRef=true).
        dispatchedRef.current = false;

        if (!navigator.mediaDevices?.getUserMedia) {
            setPhase('unsupported');
            return;
        }

        setPhase('requesting');

        // Request camera (triggers permission prompt if needed)
        let stream;
        try {
            stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: { ideal: 'environment' },
                    width: { ideal: 1280 },
                    height: { ideal: 720 },
                },
            });
        } catch (err) {
            setPhase('denied');
            setErrorDetail(err?.name === 'NotAllowedError'
                ? null
                : err?.message || 'Could not access camera.');
            return;
        }
        streamRef.current = stream;

        // Attach the stream to <video>
        if (!videoRef.current) {
            stream.getTracks().forEach(t => t.stop());
            return;
        }
        videoRef.current.srcObject = stream;
        try { await videoRef.current.play(); } catch {}

        setPhase('starting');

        // Path A: native BarcodeDetector (mobile Chrome, fast + accurate)
        if ('BarcodeDetector' in window) {
            try {
                const formats = ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39', 'code_93', 'codabar', 'itf', 'qr_code', 'data_matrix'];
                const supported = await window.BarcodeDetector.getSupportedFormats?.() || formats;
                const detector = new window.BarcodeDetector({ formats: formats.filter(f => supported.includes(f)) });

                setPhase('scanning');
                detectorIntervalRef.current = setInterval(async () => {
                    if (dispatchedRef.current) return;
                    if (!videoRef.current || videoRef.current.readyState < 2) return;
                    try {
                        const codes = await detector.detect(videoRef.current);
                        if (dispatchedRef.current) return; // closed while detect() was in flight
                        if (codes && codes.length > 0 && codes[0].rawValue) {
                            handleDecoded(codes[0].rawValue);
                        }
                    } catch { /* per-frame errors are normal */ }
                }, 150);
                return;
            } catch {
                // fall through to ZXing
            }
        }

        // Path B: @zxing/browser fallback (universal)
        try {
            const { BrowserMultiFormatReader } = await import('@zxing/browser');
            const { DecodeHintType, BarcodeFormat } = await import('@zxing/library');

            const hints = new Map();
            hints.set(DecodeHintType.POSSIBLE_FORMATS, [
                BarcodeFormat.EAN_13, BarcodeFormat.EAN_8,
                BarcodeFormat.UPC_A, BarcodeFormat.UPC_E,
                BarcodeFormat.CODE_128, BarcodeFormat.CODE_39, BarcodeFormat.CODE_93,
                BarcodeFormat.CODABAR, BarcodeFormat.ITF,
                BarcodeFormat.QR_CODE, BarcodeFormat.DATA_MATRIX,
            ]);
            hints.set(DecodeHintType.TRY_HARDER, true);

            const reader = new BrowserMultiFormatReader(hints, { delayBetweenScanAttempts: 120 });
            readerRef.current = reader;

            await reader.decodeFromVideoElement(videoRef.current, (result, err, controls) => {
                if (result) {
                    handleDecoded(result.getText());
                }
            });
            setPhase('scanning');
        } catch (err) {
            setPhase('denied');
            setErrorDetail(err?.message || 'Failed to start the camera scanner.');
        }
    };

    useEffect(() => {
        if (!show) return;

        // The Modal's Transition mounts children AFTER this effect first fires,
        // so videoRef.current may not be ready yet on a re-open. Poll until it is.
        let cancelled = false;
        let rafId = null;
        let attempts = 0;
        const MAX_ATTEMPTS = 60; // ≈1 second at 60fps

        const tryStart = () => {
            if (cancelled) return;
            if (videoRef.current) {
                startScanner();
                return;
            }
            attempts++;
            if (attempts >= MAX_ATTEMPTS) {
                setPhase('denied');
                setErrorDetail('Camera UI failed to mount in time. Try closing and reopening.');
                return;
            }
            rafId = requestAnimationFrame(tryStart);
        };
        rafId = requestAnimationFrame(tryStart);

        return () => {
            cancelled = true;
            if (rafId) cancelAnimationFrame(rafId);
            stopAll();
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
                        <span>Waiting for camera permission… Allow access in the browser prompt.</span>
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
                        Your browser doesn't expose a camera API (or you're on http instead of https). Use a USB scanner or open the page over HTTPS.
                    </div>
                )}

                {phase === 'scanning' && (
                    <p className="text-xs text-gray-500">
                        Hold the barcode 10-20cm from the camera, fill the frame, good light. The scanner closes automatically on a successful read.
                    </p>
                )}

                {phase === 'starting' && (
                    <p className="text-xs text-gray-500">Starting camera…</p>
                )}

                <div className="relative w-full bg-black rounded-lg overflow-hidden min-h-[280px] sm:min-h-[320px]" style={{ aspectRatio: '4/3' }}>
                    <video
                        ref={videoRef}
                        playsInline
                        muted
                        className="absolute inset-0 w-full h-full object-cover"
                    />
                    {phase === 'scanning' && (
                        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                            <div className="border-2 border-emerald-400/80 rounded-lg" style={{ width: '85%', height: '40%' }} />
                        </div>
                    )}
                </div>

                <div className="flex justify-end">
                    <button onClick={onClose} className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">
                        <X className="h-4 w-4" /> Cancel
                    </button>
                </div>
            </div>
        </Modal>
    );
}
