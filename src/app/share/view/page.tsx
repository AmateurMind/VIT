'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, AlertTriangle, Clock, ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from 'lucide-react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

const Document = dynamic(() => import('react-pdf').then((mod) => mod.Document), { ssr: false });
const Page = dynamic(() => import('react-pdf').then((mod) => mod.Page), { ssr: false });

export default function SharedViewPage() {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [dataUrl, setDataUrl] = useState<string | null>(null);
    const [expired, setExpired] = useState(false);
    const [timeLeft, setTimeLeft] = useState('');
    const [numPages, setNumPages] = useState<number | null>(null);
    const [pageNumber, setPageNumber] = useState(1);
    const [scale, setScale] = useState(1.0);

    useEffect(() => {
        import('react-pdf').then(({ pdfjs }) => {
            pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
        });

        // Parse Hash
        const hash = window.location.hash.substring(1); // Remove #
        if (!hash) {
            setError("No data found in link.");
            setLoading(false);
            return;
        }

        try {
            // Format: timestamp|dataUrl
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

            // Check expiry
            if (Date.now() > expiry) {
                setExpired(true);
                setLoading(false);
                return;
            }

            // Set Data
            setDataUrl(content);
            setLoading(false);

            // Timer
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
    }, []);

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
            className="min-h-screen bg-black/95 flex flex-col items-center justify-center p-4 select-none"
            onContextMenu={(e) => e.preventDefault()}
        >
            <style jsx global>{`
                @media print {
                    body { display: none !important; }
                }
                /* Hide PDF text layer to prevent selection */
                .react-pdf__Page__textLayer {
                    display: none !important;
                }
                .react-pdf__Page__annotationLayer {
                    display: none !important;
                }
            `}</style>

            <div className="fixed top-20 right-4 bg-background/10 backdrop-blur text-white px-3 py-1 rounded-full text-xs border border-white/10 flex items-center gap-2 z-50">
                <Clock className="w-3 h-3" /> Expires in: {timeLeft}
            </div>

            {dataUrl && (
                <div className="w-full h-full flex flex-col items-center justify-center p-4 relative">
                    {dataUrl.startsWith('data:application/pdf') ? (
                        <div className="relative flex flex-col items-center max-h-screen overflow-auto w-full">
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
                                file={dataUrl}
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
                            src={dataUrl}
                            alt="Shared Content"
                            className="max-w-full max-h-screen object-contain pointer-events-none"
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
