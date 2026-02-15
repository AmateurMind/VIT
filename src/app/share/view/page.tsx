'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, AlertTriangle, Clock, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, ShieldAlert } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

const Document = dynamic(() => import('react-pdf').then((mod) => mod.Document), { ssr: false });
const Page = dynamic(() => import('react-pdf').then((mod) => mod.Page), { ssr: false });

export default function SharedViewPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        }>
            <SharedViewContent />
        </Suspense>
    );
}

function SharedViewContent() {
    const searchParams = useSearchParams();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [imageUrl, setImageUrl] = useState<string | null>(null);
    const [expired, setExpired] = useState(false);
    const [timeLeft, setTimeLeft] = useState('');
    const [isPdf, setIsPdf] = useState(false);
    const [numPages, setNumPages] = useState<number | null>(null);
    const [pageNumber, setPageNumber] = useState(1);
    const [scale, setScale] = useState(1.0);
    const [isBlurred, setIsBlurred] = useState(false);
    const [screenshotAttempt, setScreenshotAttempt] = useState(false);

    // Block keyboard shortcuts for screenshots
    const handleKeyDown = useCallback((e: KeyboardEvent) => {
        // PrintScreen
        if (e.key === 'PrintScreen') {
            e.preventDefault();
            setScreenshotAttempt(true);
            setTimeout(() => setScreenshotAttempt(false), 2000);
            // Overwrite clipboard with empty content
            navigator.clipboard?.writeText('Screenshots are disabled for this content.').catch(() => {});
            return;
        }
        // Ctrl+P (print), Ctrl+S (save), Ctrl+Shift+I (devtools), Ctrl+Shift+S (screenshot in some browsers)
        if (e.ctrlKey && (e.key === 'p' || e.key === 'P' || e.key === 's' || e.key === 'S')) {
            e.preventDefault();
            setScreenshotAttempt(true);
            setTimeout(() => setScreenshotAttempt(false), 2000);
            return;
        }
        if (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'i' || e.key === 'S' || e.key === 's')) {
            e.preventDefault();
            return;
        }
        // F12 (devtools)
        if (e.key === 'F12') {
            e.preventDefault();
            return;
        }
        // Meta+Shift+3/4/5 (Mac screenshots)
        if (e.metaKey && e.shiftKey && ['3', '4', '5'].includes(e.key)) {
            e.preventDefault();
            setScreenshotAttempt(true);
            setTimeout(() => setScreenshotAttempt(false), 2000);
            return;
        }
    }, []);

    // Blur content when page loses focus (catches many screenshot tools)
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.hidden) {
                setIsBlurred(true);
            } else {
                // Small delay before unblurring to catch quick screenshot attempts
                setTimeout(() => setIsBlurred(false), 300);
            }
        };

        const handleBlur = () => setIsBlurred(true);
        const handleFocus = () => setTimeout(() => setIsBlurred(false), 300);

        document.addEventListener('visibilitychange', handleVisibilityChange);
        window.addEventListener('blur', handleBlur);
        window.addEventListener('focus', handleFocus);
        document.addEventListener('keydown', handleKeyDown, { capture: true });

        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            window.removeEventListener('blur', handleBlur);
            window.removeEventListener('focus', handleFocus);
            document.removeEventListener('keydown', handleKeyDown, { capture: true });
        };
    }, [handleKeyDown]);

    useEffect(() => {
        import('react-pdf').then(({ pdfjs }) => {
            pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
        });

        // Read from query param
        const data = searchParams.get('d');

        // Also support legacy hash-based links
        const hash = window.location.hash.substring(1);

        if (data) {
            // New format: base64 encoded JSON { url, expires }
            try {
                const decoded = JSON.parse(atob(data));
                const { url, expires } = decoded;

                if (Date.now() > expires) {
                    setExpired(true);
                    setLoading(false);
                    return;
                }

                setImageUrl(url);
                setIsPdf(url.endsWith('.pdf') || url.includes('/raw/'));
                setLoading(false);

                // Timer
                const updateTimer = () => {
                    const remaining = expires - Date.now();
                    if (remaining <= 0) {
                        setExpired(true);
                    } else {
                        const minutes = Math.floor(remaining / 60000);
                        const seconds = Math.floor((remaining % 60000) / 1000);
                        setTimeLeft(`${minutes}m ${seconds}s`);
                    }
                };

                updateTimer();
                const interval = setInterval(updateTimer, 1000);
                return () => clearInterval(interval);
            } catch (e) {
                console.error(e);
                setError("Invalid or corrupted link.");
                setLoading(false);
            }
        } else if (hash) {
            // Legacy format: timestamp|dataUrl
            try {
                const separatorIndex = hash.indexOf('|');
                if (separatorIndex === -1) {
                    setError("Invalid link format.");
                    setLoading(false);
                    return;
                }

                const expiryStr = hash.substring(0, separatorIndex);
                const content = hash.substring(separatorIndex + 1);
                const expiry = parseInt(expiryStr, 10);

                if (isNaN(expiry)) {
                    setError("Invalid expiration date.");
                    setLoading(false);
                    return;
                }

                if (Date.now() > expiry) {
                    setExpired(true);
                    setLoading(false);
                    return;
                }

                setImageUrl(content);
                setIsPdf(content.startsWith('data:application/pdf'));
                setLoading(false);

                const updateTimer = () => {
                    const remaining = expiry - Date.now();
                    if (remaining <= 0) {
                        setExpired(true);
                    } else {
                        const minutes = Math.floor(remaining / 60000);
                        const seconds = Math.floor((remaining % 60000) / 1000);
                        setTimeLeft(`${minutes}m ${seconds}s`);
                    }
                };

                updateTimer();
                const interval = setInterval(updateTimer, 1000);
                return () => clearInterval(interval);
            } catch (e) {
                console.error(e);
                setError("Failed to parse link data.");
                setLoading(false);
            }
        } else {
            setError("No data found in link.");
            setLoading(false);
        }
    }, [searchParams]);

    function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
        setNumPages(numPages);
        setPageNumber(1);
    }

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    if (expired) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background p-4">
                <Card className="max-w-md w-full border-destructive/50 bg-destructive/5 p-8 text-center">
                    <div className="mx-auto bg-destructive/10 w-16 h-16 rounded-full flex items-center justify-center mb-4">
                        <Clock className="w-8 h-8 text-destructive" />
                    </div>
                    <h2 className="text-xl font-bold text-destructive mb-2">Link Expired</h2>
                    <p className="text-muted-foreground mb-6">This shared file is no longer available.</p>
                    <Button asChild variant="outline">
                        <Link href="/">Return Home</Link>
                    </Button>
                </Card>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background p-4">
                <Card className="max-w-md w-full p-8 text-center border-yellow-500/50 bg-yellow-500/5">
                    <AlertTriangle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
                    <h2 className="text-xl font-bold mb-2">Link Error</h2>
                    <p className="text-muted-foreground">{error}</p>
                </Card>
            </div>
        );
    }

    return (
        <div
            className="min-h-screen bg-black/95 flex flex-col items-center pt-24 pb-16 px-4 select-none"
            onContextMenu={(e) => e.preventDefault()}
            onDragStart={(e) => e.preventDefault()}
        >
            <style jsx global>{`
                @media print {
                    html, body, #__next { display: none !important; visibility: hidden !important; }
                }
                .react-pdf__Page__textLayer {
                    display: none !important;
                }
                .react-pdf__Page__annotationLayer {
                    display: none !important;
                }
                /* Prevent image dragging/saving */
                .protected-content img {
                    -webkit-user-drag: none;
                    user-drag: none;
                    -webkit-touch-callout: none;
                }
                /* Blur transition */
                .content-blur {
                    filter: blur(30px) brightness(0.3);
                    transition: filter 0.15s ease;
                }
                .content-visible {
                    filter: none;
                    transition: filter 0.3s ease;
                }
                /* Watermark overlay */
                .watermark-overlay {
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    pointer-events: none;
                    z-index: 30;
                    background-image: repeating-linear-gradient(
                        -45deg,
                        transparent,
                        transparent 100px,
                        rgba(255,255,255,0.015) 100px,
                        rgba(255,255,255,0.015) 101px
                    );
                    overflow: hidden;
                }
                .watermark-text {
                    position: absolute;
                    color: rgba(255, 255, 255, 0.04);
                    font-size: 16px;
                    font-weight: bold;
                    white-space: nowrap;
                    transform: rotate(-35deg);
                    user-select: none;
                    pointer-events: none;
                    letter-spacing: 4px;
                }
            `}</style>

            {/* Screenshot attempt warning */}
            {screenshotAttempt && (
                <div className="fixed inset-0 z-[100] bg-black flex items-center justify-center">
                    <div className="text-center">
                        <ShieldAlert className="w-16 h-16 text-red-500 mx-auto mb-4" />
                        <p className="text-red-400 text-lg font-bold">Screenshots are disabled</p>
                        <p className="text-white/50 text-sm mt-2">This content is protected</p>
                        <Button
                            className="mt-6 bg-black text-white border border-white hover:bg-black/80"
                            onClick={() => setScreenshotAttempt(false)}
                        >
                            Go Back
                        </Button>
                    </div>
                </div>
            )}

            {/* Watermark overlay */}
            <div className="watermark-overlay">
                {Array.from({ length: 20 }).map((_, i) => (
                    <span
                        key={i}
                        className="watermark-text"
                        style={{
                            top: `${(i * 150) % 1000}px`,
                            left: `${(i * 200) % 1400 - 200}px`,
                        }}
                    >
                        PROTECTED CONTENT — VIEW ONLY
                    </span>
                ))}
            </div>

            <div className="fixed top-20 right-4 bg-background/10 backdrop-blur text-white px-3 py-1 rounded-full text-xs border border-white/10 flex items-center gap-2 z-50">
                <Clock className="w-3 h-3" /> Expires in: {timeLeft}
            </div>

            {imageUrl && (
                <div className={`w-full flex flex-col items-center justify-center relative protected-content ${isBlurred ? 'content-blur' : 'content-visible'}`}>
                    {isPdf ? (
                        <div className="relative flex flex-col items-center max-h-[calc(100vh-10rem)] overflow-auto w-full">
                            <div className="mb-4 flex items-center gap-4 bg-background/20 backdrop-blur p-2 rounded-lg border border-white/10 sticky top-0 z-40">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => setPageNumber(p => Math.max(1, p - 1))}
                                    disabled={pageNumber <= 1}
                                    className="text-white hover:bg-white/10"
                                >
                                    <ChevronLeft className="w-4 h-4" />
                                </Button>
                                <span className="text-white text-sm font-mono">
                                    {pageNumber} / {numPages || '--'}
                                </span>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => setPageNumber(p => Math.min(numPages || 1, p + 1))}
                                    disabled={pageNumber >= (numPages || 1)}
                                    className="text-white hover:bg-white/10"
                                >
                                    <ChevronRight className="w-4 h-4" />
                                </Button>
                                <div className="w-px h-4 bg-white/20 mx-2" />
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => setScale(s => Math.max(0.5, s - 0.1))}
                                    className="text-white hover:bg-white/10"
                                >
                                    <ZoomOut className="w-4 h-4" />
                                </Button>
                                <span className="text-white text-xs w-12 text-center">{Math.round(scale * 100)}%</span>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => setScale(s => Math.min(2.0, s + 0.1))}
                                    className="text-white hover:bg-white/10"
                                >
                                    <ZoomIn className="w-4 h-4" />
                                </Button>
                            </div>

                            <Document
                                file={imageUrl}
                                onLoadSuccess={onDocumentLoadSuccess}
                                loading={
                                    <div className="flex items-center gap-2 text-white">
                                        <Loader2 className="w-4 h-4 animate-spin" /> Loading PDF...
                                    </div>
                                }
                                error={
                                    <div className="text-destructive bg-destructive/10 p-4 rounded text-center">
                                        Failed to load PDF.
                                    </div>
                                }
                                className="shadow-2xl"
                            >
                                <Page
                                    pageNumber={pageNumber}
                                    scale={scale}
                                    renderTextLayer={false}
                                    renderAnnotationLayer={false}
                                    className="rounded shadow-2xl overflow-hidden"
                                />
                            </Document>
                        </div>
                    ) : (
                        <img
                            src={imageUrl}
                            alt="Shared Content"
                            className="max-w-full w-auto h-auto object-contain pointer-events-none"
                            draggable={false}
                            onDragStart={(e) => e.preventDefault()}
                        />
                    )}
                </div>
            )}

            <p className="fixed bottom-4 text-white/30 text-xs z-50 bg-black/50 px-2 py-1 rounded">
                View-only mode. Content expires automatically.
            </p>
        </div>
    );
}
