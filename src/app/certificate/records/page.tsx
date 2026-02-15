'use client';

import { useState, useEffect } from 'react';
import { useWallet } from '@/context/WalletContext';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, FileCheck, ExternalLink, Hash, Wallet, Loader2 } from 'lucide-react';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    fetchCertificateTransactions,
    getExplorerUrl,
} from '@/lib/algorand';

interface CertificateRecord {
    fileName: string;
    hash: string;
    txId: string;
    timestamp: string;
}

export default function CertificateRecordsPage() {
    const { address, isConnected, connect } = useWallet();
    const [records, setRecords] = useState<CertificateRecord[]>([]);
    const [loading, setLoading] = useState<boolean>(true);

    useEffect(() => {
        let mounted = true;

        if (address) {
            setLoading(true);
            fetchCertificateTransactions(address).then(fetchedRecords => {
                if (!mounted) return;

                const combined = [...fetchedRecords];
                const uniqueMap = new Map();
                combined.forEach(item => uniqueMap.set(item.txId, item));
                const sorted = Array.from(uniqueMap.values()).sort((a, b) =>
                    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
                );
                setRecords(sorted);
                setLoading(false);
            });
        } else {
            setLoading(false);
        }

        return () => { mounted = false; };
    }, [address]);

    const container = {
        hidden: { opacity: 0 },
        show: { opacity: 1, transition: { staggerChildren: 0.1 } }
    };

    const item = {
        hidden: { opacity: 0, y: 20 },
        show: { opacity: 1, y: 0, transition: { duration: 0.4 } }
    };

    return (
        <div className="min-h-screen bg-background text-foreground">


            <main className="max-w-6xl mx-auto px-6 md:px-12 py-12">
                <motion.div variants={container} initial="hidden" animate="show">
                    <motion.div variants={item} className="mb-8">
                        <h1 className="font-display text-3xl font-bold tracking-tight text-foreground mb-2">
                            Stored Certificates
                        </h1>
                        <p className="text-muted-foreground">
                            A complete history of certificates securely stored on the Algorand blockchain.
                        </p>
                    </motion.div>

                    {!isConnected ? (
                        <motion.div variants={item} initial="hidden" animate="show">
                            <Card className="bg-card border-border mb-5 max-w-md mx-auto">
                                <CardContent className="pt-8 text-center pb-8">
                                    <div className="bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <Wallet className="w-8 h-8 text-primary" />
                                    </div>
                                    <h3 className="font-display text-lg font-bold mb-2">Connect Wallet</h3>
                                    <p className="text-sm text-muted-foreground mb-6">Please connect your Pera Wallet to view your certificate history.</p>
                                    <Button onClick={connect} size="lg" className="w-full font-display uppercase tracking-wider text-xs font-bold">
                                        Connect Pera Wallet
                                    </Button>
                                </CardContent>
                            </Card>
                        </motion.div>
                    ) : (
                        <motion.div variants={item} initial="hidden" animate="show">
                            <Card className="border-border bg-card shadow-sm overflow-hidden">
                                {loading ? (
                                    <div className="flex flex-col items-center justify-center py-20 space-y-4">
                                        <Loader2 className="w-8 h-8 text-primary animate-spin" />
                                        <p className="text-sm font-mono text-muted-foreground animate-pulse">Fetching records from blockchain...</p>
                                    </div>
                                ) : records.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-20 text-center px-4">
                                        <div className="bg-muted/50 w-20 h-20 rounded-full flex items-center justify-center mb-4">
                                            <FileCheck className="w-10 h-10 text-muted-foreground/40" />
                                        </div>
                                        <h3 className="font-display text-lg font-bold text-foreground mb-2">No Records Found</h3>
                                        <p className="text-sm text-muted-foreground max-w-xs mx-auto mb-6">
                                            You haven't stored any certificates on this account yet.
                                        </p>
                                        <Button variant="outline" asChild>
                                            <Link href="/certificate">Store Your First Certificate</Link>
                                        </Button>
                                    </div>
                                ) : (
                                    <div className="rounded-md border">
                                        <Table>
                                            <TableHeader className="bg-muted/50">
                                                <TableRow>
                                                    <TableHead className="w-[300px] font-bold text-foreground">File Name</TableHead>
                                                    <TableHead className="font-bold text-foreground">Date Stored</TableHead>
                                                    <TableHead className="font-bold text-foreground">SHA-256 Hash</TableHead>
                                                    <TableHead className="text-right font-bold text-foreground">Actions</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {records.map((record) => (
                                                    <TableRow key={record.txId} className="group hover:bg-muted/30">
                                                        <TableCell className="font-medium text-foreground">
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center shrink-0">
                                                                    <FileCheck className="w-4 h-4 text-primary" />
                                                                </div>
                                                                <span className="font-semibold">{record.fileName}</span>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="text-muted-foreground font-mono text-xs">
                                                            {new Date(record.timestamp).toLocaleString()}
                                                        </TableCell>
                                                        <TableCell className="font-mono text-xs text-muted-foreground max-w-[200px]">
                                                            <div className="flex items-center gap-2 bg-muted/30 px-2 py-1 rounded border border-border/50 group-hover:border-primary/20 transition-colors cursor-help" title={record.hash}>
                                                                <Hash className="w-3 h-3 text-primary/70" />
                                                                <span className="truncate select-all">{record.hash}</span>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="text-right">
                                                            <Button variant="ghost" size="sm" className="h-8 text-xs font-display uppercase tracking-wider text-primary hover:text-primary hover:bg-primary/10" asChild>
                                                                <a href={getExplorerUrl(record.txId)} target="_blank" rel="noopener noreferrer">
                                                                    Explorer <ExternalLink className="w-3 h-3 ml-1" />
                                                                </a>
                                                            </Button>
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </div>
                                )}
                            </Card>
                        </motion.div>
                    )}
                </motion.div>
            </main>
        </div>
    );
}
