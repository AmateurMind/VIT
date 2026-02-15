'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FileCheck, Hash, Calendar, ExternalLink, AlertTriangle, ShieldCheck, Clock } from 'lucide-react';
import { getExplorerUrl } from '@/lib/algorand';
import Link from 'next/link';

interface SharedCertificateData {
    fileName: string;
    hash: string;
    txId: string;
    timestamp: string;
    expires: number;
}

export default function SharedCertificatePage() {
    const params = useParams();
    const [data, setData] = useState<SharedCertificateData | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [expired, setExpired] = useState<boolean>(false);
    const [timeLeft, setTimeLeft] = useState<string>('');

    useEffect(() => {
        if (params.data && typeof params.data === 'string') {
            try {
                // Decode base64
                const decodedJson = atob(params.data);
                const parsedData = JSON.parse(decodedJson);

                // Check expiration
                if (parsedData.expires && Date.now() > parsedData.expires) {
                    setExpired(true);
                    return;
                }

                setData(parsedData);

                // Timer
                const interval = setInterval(() => {
                    if (parsedData.expires) {
                        const remaining = parsedData.expires - Date.now();
                        if (remaining <= 0) {
                            setExpired(true);
                            clearInterval(interval);
                        } else {
                            const minutes = Math.floor(remaining / 60000);
                            const seconds = Math.floor((remaining % 60000) / 1000);
                            setTimeLeft(`${minutes}m ${seconds}s`);
                        }
                    }
                }, 1000);

                return () => clearInterval(interval);

            } catch (e) {
                console.error("Failed to decode certificate data", e);
                setError("Invalid or corrupted link.");
            }
        }
    }, [params.data]);

    if (expired) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background p-4">
                <Card className="max-w-md w-full border-destructive/50 bg-destructive/5">
                    <CardHeader className="text-center">
                        <div className="mx-auto bg-destructive/10 w-16 h-16 rounded-full flex items-center justify-center mb-4">
                            <Clock className="w-8 h-8 text-destructive" />
                        </div>
                        <CardTitle className="text-destructive">Link Expired</CardTitle>
                    </CardHeader>
                    <CardContent className="text-center text-muted-foreground">
                        <p>This shared certificate link is no longer valid.</p>
                        <p className="text-xs mt-2">Links are temporary for security.</p>
                    </CardContent>
                    <CardFooter className="flex justify-center">
                        <Button asChild variant="outline">
                            <Link href="/">Return Home</Link>
                        </Button>
                    </CardFooter>
                </Card>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background p-4">
                <Card className="max-w-md w-full">
                    <CardContent className="pt-8 text-center">
                        <AlertTriangle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
                        <h3 className="text-lg font-bold mb-2">Invalid Link</h3>
                        <p className="text-muted-foreground">{error}</p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (!data) {
        return <div className="min-h-screen bg-background" />;
    }

    return (
        <div
            className="min-h-screen bg-background flex flex-col items-center justify-center p-4 select-none print:hidden"
            onContextMenu={(e) => e.preventDefault()}
        >
            <style jsx global>{`
                @media print {
                    body { display: none !important; }
                }
            `}</style>

            <div className="mb-8 text-center">
                <Badge variant="outline" className="mb-2 border-primary/20 text-primary bg-primary/5 px-3 py-1">
                    <ShieldCheck className="w-3 h-3 mr-1" /> Verified Blockchain Certificate
                </Badge>
                {timeLeft && <p className="text-xs text-muted-foreground mt-2 animate-pulse">Link expires in: {timeLeft}</p>}
            </div>

            <Card className="max-w-2xl w-full border-primary/20 shadow-2xl bg-card/50 backdrop-blur-sm">
                <CardHeader className="border-b border-border/50 text-center pb-8 pt-8">
                    <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                        <FileCheck className="w-10 h-10 text-primary" />
                    </div>
                    <CardTitle className="text-2xl font-display uppercase tracking-wider">{data.fileName}</CardTitle>
                    <p className="text-sm text-muted-foreground mt-2">
                        Authentic Digital Certificate
                    </p>
                </CardHeader>
                <CardContent className="space-y-6 pt-8">
                    <div className="grid gap-4 md:grid-cols-2">
                        <div className="p-4 rounded-lg bg-secondary/50 border border-border/50">
                            <div className="flex items-center gap-2 mb-2 text-muted-foreground">
                                <Calendar className="w-4 h-4" />
                                <span className="text-xs font-bold uppercase tracking-wider">Date Stored</span>
                            </div>
                            <p className="font-mono text-sm">{new Date(data.timestamp).toLocaleString()}</p>
                        </div>
                        <div className="p-4 rounded-lg bg-secondary/50 border border-border/50">
                            <div className="flex items-center gap-2 mb-2 text-muted-foreground">
                                <Hash className="w-4 h-4" />
                                <span className="text-xs font-bold uppercase tracking-wider">Blockchain Hash</span>
                            </div>
                            <p className="font-mono text-xs break-all" title={data.hash}>{data.hash}</p>
                        </div>
                    </div>

                    <div className="p-4 rounded-lg border border-primary/10 bg-primary/5">
                        <div className="flex items-center justify-between">
                            <div>
                                <h4 className="text-sm font-bold text-primary mb-1">Blockchain Record</h4>
                                <p className="text-xs text-muted-foreground">Permanently recorded on Algorand</p>
                            </div>
                            <Button asChild size="sm" variant="outline" className="border-primary/20 hover:bg-primary/10">
                                <a href={getExplorerUrl(data.txId)} target="_blank" rel="noopener noreferrer">
                                    View on Explorer <ExternalLink className="w-3 h-3 ml-2" />
                                </a>
                            </Button>
                        </div>
                    </div>
                </CardContent>

                <CardFooter className="justify-center border-t border-border/50 py-6 bg-muted/20">
                    <p className="text-xs text-muted-foreground text-center max-w-sm">
                        This certificate is securely stored on the Algorand blockchain.
                        This view-only link allows temporary access for verification.
                    </p>
                </CardFooter>
            </Card>

            <div className="mt-8 text-center text-xs text-muted-foreground/50">
                &copy; 2026 Campus Trust System. Secure. Transparent. Immutable.
            </div>
        </div>
    );
}
