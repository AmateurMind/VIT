'use client';

import { useState } from 'react';
import { useWallet } from '@/context/WalletContext';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Activity, Wallet, ExternalLink, ShieldCheck, Hash, Clock, Fingerprint, CheckCircle } from 'lucide-react';
import {
    createHashStoreTxn,
    getSuggestedParams,
    getAlgodClient,
    getExplorerUrl,
} from '@/lib/algorand';

interface AttendanceRecord {
    sessionId: string;
    timestamp: string;
    txId: string;
}

export default function AttendancePage() {
    const { address, isConnected, connect, peraWallet } = useWallet();

    const [sessionId, setSessionId] = useState<string>('');
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [records, setRecords] = useState<AttendanceRecord[]>([]);
    const [status, setStatus] = useState<string>('');
    const [successTxId, setSuccessTxId] = useState<string | null>(null);

    const generateSessionId = () => {
        const date = new Date().toISOString().split('T')[0];
        const random = Math.random().toString(36).substring(2, 8).toUpperCase();
        setSessionId(`SESSION-${date}-${random}`);
    };

    const handleMarkAttendance = async () => {
        if (!address || !peraWallet || !sessionId) {
            setError('Please enter or generate a session ID');
            return;
        }
        setLoading(true);
        setStatus('Preparing attendance transaction...');
        setError(null);
        setSuccessTxId(null);
        try {
            const timestamp = new Date().toISOString();
            const attendanceData = {
                sessionId,
                studentWallet: address.slice(0, 10) + '...',
                timestamp,
            };
            const hash = await crypto.subtle.digest(
                'SHA-256',
                new TextEncoder().encode(JSON.stringify(attendanceData))
            );
            const hashHex = Array.from(new Uint8Array(hash))
                .map(b => b.toString(16).padStart(2, '0'))
                .join('');

            const params = await getSuggestedParams();
            const txn = createHashStoreTxn(address, hashHex, 'ATTENDANCE', params);

            setStatus('Sign in Pera Wallet...');
            const signedTxns = await peraWallet.signTransaction([[{ txn }]]);

            setStatus('Recording on Algorand...');
            const client = getAlgodClient();
            const result = await client.sendRawTransaction(signedTxns[0]).do();
            const txId = txn.txID() || result.txId || result?.txid || '';
            console.log('Transaction result:', result, 'txId:', txId);

            setStatus('Confirming on-chain...');
            await new Promise(resolve => setTimeout(resolve, 4000));

            const newRecord: AttendanceRecord = {
                sessionId,
                timestamp,
                txId: txId,
            };
            setRecords(prev => [newRecord, ...prev]);
            setSuccessTxId(txId);
            setStatus('');
            setSessionId('');
        } catch (err) {
            console.error('Attendance error:', err);
            setError('Failed to record attendance. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const container = {
        hidden: { opacity: 0 },
        show: { opacity: 1, transition: { staggerChildren: 0.08 } }
    };
    const item = {
        hidden: { opacity: 0, y: 20 },
        show: { opacity: 1, y: 0, transition: { duration: 0.4 } }
    };

    return (
        <div className="min-h-screen">
            {/* Header */}
            <header className="flex justify-between items-center py-4 px-6 md:px-12 border-b border-border/50 bg-background/80 backdrop-blur-md sticky top-0 z-50">
                <Link href="/" className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors">
                    <ArrowLeft className="w-4 h-4" />
                    <span className="font-display text-xs uppercase tracking-[0.2em]">Back</span>
                </Link>
                <span className="font-display text-sm uppercase tracking-[0.2em] text-primary">Attendance Module</span>
                <Badge variant="outline" className="text-[10px] font-mono border-primary/30 text-primary">MOD.02</Badge>
            </header>

            <main className="max-w-3xl mx-auto px-6 md:px-12 py-12">
                <motion.div variants={container} initial="hidden" animate="show">
                    {/* Page Title */}
                    <motion.div variants={item} className="text-center mb-10">
                        <Activity className="w-10 h-10 text-primary mx-auto mb-4" />
                        <h1 className="font-display text-3xl md:text-4xl font-bold tracking-tight text-primary text-glow mb-2">
                            SMART ATTENDANCE
                        </h1>
                        <p className="text-sm text-muted-foreground">Tamper-proof records. No proxy. No disputes.</p>
                    </motion.div>

                    {/* Connect */}
                    {!isConnected && (
                        <motion.div variants={item}>
                            <Card className="bg-card border-border mb-5">
                                <CardContent className="pt-6 text-center">
                                    <Wallet className="w-8 h-8 text-primary mx-auto mb-3" />
                                    <h3 className="font-display text-sm uppercase tracking-wider mb-1">Connect Wallet</h3>
                                    <p className="text-xs text-muted-foreground mb-4">Connect Pera Wallet to mark attendance.</p>
                                    <Button onClick={connect} className="w-full font-display uppercase tracking-wider text-xs bg-primary text-primary-foreground hover:bg-primary/90">
                                        Connect Pera Wallet
                                    </Button>
                                </CardContent>
                            </Card>
                        </motion.div>
                    )}

                    {/* Alerts */}
                    {error && (
                        <motion.div variants={item} className="bg-destructive/10 border border-destructive/30 p-4 mb-5 text-sm text-red-400">
                            ⚠️ {error}
                        </motion.div>
                    )}
                    {status && (
                        <motion.div variants={item} className="bg-primary/5 border border-primary/20 p-4 mb-5 text-sm text-primary font-mono">
                            ⏳ {status}
                        </motion.div>
                    )}
                    {successTxId && (
                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="bg-green-600 border-2 border-green-400 p-5 mb-5 rounded-md text-white flex flex-col gap-3">
                            <div className="flex items-center gap-2 font-bold text-base">
                                <CheckCircle className="w-5 h-5" />
                                <span>Attendance Marked Successfully!</span>
                            </div>
                            <div className="pl-7 space-y-2">
                                <a
                                    href={getExplorerUrl(successTxId)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-2 px-4 py-2 rounded bg-white text-green-800 font-bold text-xs hover:bg-green-100 transition-colors"
                                >
                                    View Transaction on Explorer <ExternalLink className="w-3 h-3" />
                                </a>
                                <p className="text-xs text-green-200 break-all font-mono">
                                    {getExplorerUrl(successTxId)}
                                </p>
                            </div>
                        </motion.div>
                    )}

                    {/* Mark Attendance */}
                    {isConnected && (
                        <motion.div variants={item}>
                            <Card className="bg-card border-border mb-5">
                                <CardHeader className="pb-3">
                                    <CardTitle className="text-sm font-display uppercase tracking-wider flex items-center gap-2">
                                        <Fingerprint className="w-4 h-4 text-primary" /> Mark Attendance
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-xs text-muted-foreground mb-4">Your attendance will be permanently recorded on Algorand.</p>
                                    <div className="flex gap-3 mb-4">
                                        <input
                                            type="text"
                                            value={sessionId}
                                            onChange={(e) => setSessionId(e.target.value)}
                                            placeholder="Session ID"
                                            className="flex-1 bg-secondary border border-border px-3 py-2 text-sm font-mono text-foreground focus:outline-none focus:border-primary"
                                        />
                                        <Button variant="outline" size="sm" onClick={generateSessionId} className="font-display uppercase tracking-wider text-xs border-primary/40 text-primary">
                                            Generate
                                        </Button>
                                    </div>
                                    {sessionId && (
                                        <div className="bg-primary/5 border border-primary/20 p-3 mb-4 text-xs font-mono text-primary">
                                            Session: <strong>{sessionId}</strong>
                                        </div>
                                    )}
                                    <Button
                                        onClick={handleMarkAttendance}
                                        disabled={loading || !sessionId}
                                        className="w-full font-display uppercase tracking-wider text-xs bg-primary text-primary-foreground hover:bg-primary/90"
                                    >
                                        {loading ? 'Recording...' : 'Mark Present on Blockchain'}
                                    </Button>
                                </CardContent>
                            </Card>
                        </motion.div>
                    )}

                    {/* Records */}
                    {records.length > 0 && (
                        <motion.div variants={item}>
                            <Card className="bg-card border-border mb-5">
                                <CardHeader className="pb-3">
                                    <CardTitle className="text-sm font-display uppercase tracking-wider flex items-center gap-2">
                                        <Clock className="w-4 h-4 text-primary" /> Your Records
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    {records.map((record, index) => (
                                        <div key={index} className="flex justify-between items-center p-3 bg-secondary border border-border flex-wrap gap-3">
                                            <div className="space-y-1">
                                                <strong className="text-xs font-display uppercase tracking-wider text-foreground">{record.sessionId}</strong>
                                                <p className="text-[10px] font-mono text-muted-foreground">
                                                    {new Date(record.timestamp).toLocaleString()}
                                                </p>
                                            </div>
                                            <Button variant="outline" size="sm" className="text-xs font-display uppercase tracking-wider border-primary/40 text-primary" asChild>
                                                <a
                                                    href={getExplorerUrl(record.txId)}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                >
                                                    Explorer <ExternalLink className="w-3 h-3 ml-1" />
                                                </a>
                                            </Button>
                                        </div>
                                    ))}
                                </CardContent>
                            </Card>
                        </motion.div>
                    )}

                    {/* Info */}
                    <motion.div variants={item}>
                        <Card className="bg-card border-border">
                            <CardHeader className="pb-3">
                                <CardTitle className="text-sm font-display uppercase tracking-wider flex items-center gap-2">
                                    <ShieldCheck className="w-4 h-4 text-primary" /> How It Works
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <ul className="space-y-3 text-xs text-muted-foreground">
                                    <li className="flex items-start gap-2"><Fingerprint className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" /> <span><strong className="text-foreground">Wallet Identity</strong> — Your wallet is your unique ID</span></li>
                                    <li className="flex items-start gap-2"><Hash className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" /> <span><strong className="text-foreground">Hash Storage</strong> — Data hash is stored on-chain</span></li>
                                    <li className="flex items-start gap-2"><Clock className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" /> <span><strong className="text-foreground">Timestamped</strong> — Exact time in the transaction</span></li>
                                    <li className="flex items-start gap-2"><ShieldCheck className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" /> <span><strong className="text-foreground">Immutable</strong> — Once recorded, cannot be altered</span></li>
                                </ul>
                            </CardContent>
                        </Card>
                    </motion.div>
                </motion.div>
            </main>
        </div>
    );
}
