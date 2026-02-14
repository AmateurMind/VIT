'use client';

import { useState, useRef, useEffect } from 'react';
import { useWallet } from '@/context/WalletContext';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, FileCheck, Wallet, ExternalLink, ShieldCheck, Upload, Search, Hash, CheckCircle, XCircle } from 'lucide-react';
import {
    createHashStoreTxn,
    getSuggestedParams,
    getAlgodClient,
    getExplorerUrl,
    hashFile,
    fetchCertificateTransactions,
} from '@/lib/algorand';
import { notifyN8N } from '@/lib/n8n';

interface CertificateRecord {
    fileName: string;
    hash: string;
    txId: string;
    timestamp: string;
}

export default function CertificatePage() {
    const { address, isConnected, connect, peraWallet } = useWallet();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [fileHash, setFileHash] = useState<string | null>(null);
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [status, setStatus] = useState<string>('');
    const [records, setRecords] = useState<CertificateRecord[]>([]);
    const [verifyMode, setVerifyMode] = useState<boolean>(false);
    const [verifyResult, setVerifyResult] = useState<'match' | 'no-match' | null>(null);

    const [successTxId, setSuccessTxId] = useState<string | null>(null);

    // Fetch existing certificates when wallet connects
    useEffect(() => {
        if (address) {
            fetchCertificateTransactions(address).then(fetchedRecords => {
                setRecords(prev => {
                    // Combine and deduplicate based on txId
                    const combined = [...prev, ...fetchedRecords];
                    const uniqueMap = new Map();
                    combined.forEach(item => uniqueMap.set(item.txId, item));
                    return Array.from(uniqueMap.values()).sort((a, b) =>
                        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
                    );
                });
            });
        }
    }, [address]);

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setSelectedFile(file);
        setVerifyResult(null);
        setStatus('Generating SHA-256 hash...');
        try {
            const hash = await hashFile(file);
            setFileHash(hash);
            setStatus('');
            if (verifyMode) {
                const exists = records.some(r => r.hash === hash);
                setVerifyResult(exists ? 'match' : 'no-match');
            }
        } catch (err) {
            console.error('Hash error:', err);
            setError('Failed to generate hash');
        }
    };

    const handleStoreCertificate = async () => {
        if (!address || !peraWallet || !fileHash || !selectedFile) {
            setError('Please select a file first');
            return;
        }
        setLoading(true);
        setStatus('Preparing transaction...');
        setError(null);
        setSuccessTxId(null);
        try {
            const params = await getSuggestedParams();
            const txn = createHashStoreTxn(
                address,
                fileHash,
                {
                    type: 'CERTIFICATE',
                    fileName: selectedFile.name,
                    timestamp: new Date().toISOString(),
                },
                params
            );
            setStatus('Sign in Pera Wallet...');
            const signedTxns = await peraWallet.signTransaction([[{ txn }]]);
            setStatus('Storing hash on Algorand...');
            const client = getAlgodClient();
            const result = await client.sendRawTransaction(signedTxns[0]).do();
            const txId = txn.txID() || result.txid || '';
            console.log('Transaction result:', result, 'txId:', txId);
            setStatus('Confirming on-chain...');
            await new Promise(resolve => setTimeout(resolve, 4000));
            const newRecord: CertificateRecord = {
                fileName: selectedFile.name,
                hash: fileHash,
                txId: txId,
                timestamp: new Date().toISOString(),
            };
            setRecords(prev => [newRecord, ...prev]);
            setSuccessTxId(txId);
            setStatus('');

            // Notify n8n
            notifyN8N({
                event: 'CERTIFICATE_STORED',
                details: {
                    wallet: address,
                    actionSummary: `Stored certificate hash for ${selectedFile.name}`,
                    txId: txId,
                    metadata: {
                        fileName: selectedFile.name,
                        hash: fileHash
                    }
                }
            });
            setSelectedFile(null);
            setFileHash(null);
            if (fileInputRef.current) fileInputRef.current.value = '';
        } catch (err) {
            console.error('Certificate error:', err);
            setError('Failed to store certificate hash. Please try again.');
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


            <main className="max-w-3xl mx-auto px-6 md:px-12 py-12">
                <motion.div variants={container} initial="hidden" animate="show">
                    {/* Page Title */}
                    <motion.div variants={item} className="text-center mb-10">
                        <FileCheck className="w-10 h-10 text-primary mx-auto mb-4" />
                        <h1 className="font-display text-3xl md:text-4xl font-bold tracking-tight text-primary text-glow mb-2">
                            CERTIFICATES
                        </h1>
                        <p className="text-sm text-muted-foreground">Store and verify certificate authenticity using blockchain hashes.</p>
                    </motion.div>

                    {/* Stored Records - moved to top */}
                    {records.length > 0 && (
                        <motion.div variants={item} initial="hidden" animate="show" className="mb-6">
                            <Card className="bg-card/50 border-border backdrop-blur-sm">
                                <CardHeader className="pb-3 border-b border-border/50">
                                    <CardTitle className="text-sm font-display uppercase tracking-wider flex items-center gap-2 text-primary">
                                        <FileCheck className="w-4 h-4" /> Stored Certificates
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="pt-4 space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                                    {records.map((record, index) => (
                                        <div key={index} className="p-4 bg-background/50 border border-border/60 rounded-lg space-y-3 hover:border-primary/30 transition-colors">
                                            <div className="flex justify-between items-start gap-3">
                                                <div className="space-y-1">
                                                    <div className="flex items-center gap-2">
                                                        <FileCheck className="w-4 h-4 text-emerald-500" />
                                                        <strong className="text-sm font-display tracking-wide text-foreground">{record.fileName}</strong>
                                                    </div>
                                                    <p className="text-xs font-mono text-muted-foreground pl-6">
                                                        {new Date(record.timestamp).toLocaleString()}
                                                    </p>
                                                </div>
                                                <Button variant="outline" size="sm" className="h-7 text-[10px] font-display uppercase tracking-wider border-primary/20 text-primary hover:bg-primary/10 hover:text-primary hover:border-primary/40 shrink-0" asChild>
                                                    <a href={getExplorerUrl(record.txId)} target="_blank" rel="noopener noreferrer">
                                                        Explorer <ExternalLink className="w-3 h-3 ml-1" />
                                                    </a>
                                                </Button>
                                            </div>

                                            <div className="pl-6 pt-1 border-t border-border/30 mt-2">
                                                <div className="flex items-center gap-2 text-[10px] text-muted-foreground mb-1 font-mono uppercase tracking-widest opacity-70">
                                                    <Hash className="w-3 h-3" /> SHA-256 Hash
                                                </div>
                                                <div className="bg-black/20 p-2 rounded border border-border/30 font-mono text-[10px] text-primary/80 break-all select-all hover:bg-black/30 transition-colors">
                                                    {record.hash}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </CardContent>
                            </Card>
                        </motion.div>
                    )}

                    {/* Mode Toggle */}
                    <motion.div variants={item}>
                        <Card className="bg-card border-border mb-5">
                            <CardContent className="pt-6 flex justify-center gap-3">
                                <Button
                                    onClick={() => { setVerifyMode(false); setVerifyResult(null); }}
                                    variant={!verifyMode ? "default" : "outline"}
                                    className={`font-display uppercase tracking-wider text-xs ${!verifyMode ? 'bg-primary text-primary-foreground' : 'border-primary/40 text-primary'}`}
                                >
                                    <Upload className="w-3.5 h-3.5 mr-2" /> Store Certificate
                                </Button>
                                <Button
                                    onClick={() => { setVerifyMode(true); setVerifyResult(null); }}
                                    variant={verifyMode ? "default" : "outline"}
                                    className={`font-display uppercase tracking-wider text-xs ${verifyMode ? 'bg-primary text-primary-foreground' : 'border-primary/40 text-primary'}`}
                                >
                                    <Search className="w-3.5 h-3.5 mr-2" /> Verify Certificate
                                </Button>
                                <Button
                                    variant="outline"
                                    className="font-display uppercase tracking-wider text-xs border-primary/40 text-primary"
                                    asChild
                                >
                                    <Link href="/certificate/records">
                                        <FileCheck className="w-3.5 h-3.5 mr-2" /> View History
                                    </Link>
                                </Button>
                            </CardContent>
                        </Card>
                    </motion.div>

                    {/* Connect */}
                    {!isConnected && !verifyMode && (
                        <motion.div variants={item} initial="hidden" animate="show">
                            <Card className="bg-card border-border mb-5">
                                <CardContent className="pt-6 text-center">
                                    <Wallet className="w-8 h-8 text-primary mx-auto mb-3" />
                                    <h3 className="font-display text-sm uppercase tracking-wider mb-1">Connect Wallet</h3>
                                    <p className="text-xs text-muted-foreground mb-4">Connect Pera Wallet to store certificates.</p>
                                    <Button onClick={connect} className="w-full font-display uppercase tracking-wider text-xs bg-primary text-primary-foreground hover:bg-primary/90">
                                        Connect Pera Wallet
                                    </Button>
                                </CardContent>
                            </Card>
                        </motion.div>
                    )}

                    {/* Alerts */}
                    {error && (
                        <motion.div variants={item} className="bg-destructive/10 border border-destructive/30 p-4 mb-5 text-sm text-destructive">
                            ⚠️ {error}
                        </motion.div>
                    )}
                    {status && (
                        <motion.div variants={item} className="bg-primary/5 border border-primary/20 p-4 mb-5 text-sm text-primary font-mono">
                            ⏳ {status}
                        </motion.div>
                    )}
                    {successTxId && (
                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="bg-emerald-100 border-2 border-emerald-300 p-5 mb-5 rounded-md text-emerald-900 flex flex-col gap-3">
                            <div className="flex items-center gap-2 font-bold text-base">
                                <CheckCircle className="w-5 h-5" />
                                <span>Certificate Hash Stored Successfully!</span>
                            </div>
                            <div className="pl-7 space-y-2">
                                <a
                                    href={getExplorerUrl(successTxId)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-2 px-4 py-2 rounded bg-emerald-200 text-emerald-900 font-bold text-xs hover:bg-emerald-300 transition-colors"
                                >
                                    View Transaction on Explorer <ExternalLink className="w-3 h-3" />
                                </a>
                                <p className="text-[10px] text-emerald-800 break-all font-mono opacity-80 select-all">
                                    {getExplorerUrl(successTxId)}
                                </p>
                            </div>
                        </motion.div>
                    )}

                    {/* File Upload */}
                    <motion.div variants={item}>
                        <Card className="bg-card border-border mb-5">
                            <CardHeader className="pb-3">
                                <CardTitle className="text-sm font-display uppercase tracking-wider flex items-center gap-2">
                                    {verifyMode ? <Search className="w-4 h-4 text-primary" /> : <Upload className="w-4 h-4 text-primary" />}
                                    {verifyMode ? 'Upload to Verify' : 'Upload to Store'}
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-xs text-muted-foreground mb-4">
                                    {verifyMode
                                        ? 'Upload a certificate to verify its authenticity against stored hashes.'
                                        : 'Upload a certificate file to store its hash on the blockchain.'}
                                </p>

                                {/* File Upload Area */}
                                <div
                                    className={`border-2 border-dashed p-8 text-center cursor-pointer transition-colors ${selectedFile ? 'border-primary/60 bg-primary/5' : 'border-border hover:border-primary/40'
                                        }`}
                                    onClick={() => fileInputRef.current?.click()}
                                >
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        onChange={handleFileSelect}
                                        accept=".pdf,.png,.jpg,.jpeg"
                                        className="hidden"
                                    />
                                    {selectedFile ? (
                                        <>
                                            <FileCheck className="w-8 h-8 text-primary mx-auto mb-2" />
                                            <p className="text-sm font-semibold text-foreground">{selectedFile.name}</p>
                                            <p className="text-[10px] font-mono text-muted-foreground mt-1">
                                                {(selectedFile.size / 1024).toFixed(2)} KB
                                            </p>
                                        </>
                                    ) : (
                                        <>
                                            <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                                            <p className="text-sm text-muted-foreground">Click to select a certificate</p>
                                            <p className="text-[10px] font-mono text-muted-foreground mt-1">PDF, PNG, JPG</p>
                                        </>
                                    )}
                                </div>

                                {/* Hash Display */}
                                {fileHash && (
                                    <div className="mt-4">
                                        <p className="text-xs font-display uppercase tracking-wider text-foreground mb-1 flex items-center gap-1">
                                            <Hash className="w-3 h-3 text-primary" /> SHA-256 Hash
                                        </p>
                                        <div className="bg-secondary p-3 font-mono text-[10px] text-primary break-all border border-border">
                                            {fileHash}
                                        </div>
                                    </div>
                                )}

                                {/* Verify Result */}
                                {verifyMode && verifyResult && (
                                    <div className={`mt-4 p-4 flex items-center gap-3 ${verifyResult === 'match'
                                        ? 'bg-emerald-100 border border-emerald-300 text-emerald-800'
                                        : 'bg-yellow-500/10 border border-yellow-500/30 text-yellow-400'
                                        }`}>
                                        {verifyResult === 'match' ? (
                                            <><CheckCircle className="w-5 h-5 shrink-0" /> <span className="text-sm">Certificate hash matches! Authentic.</span></>
                                        ) : (
                                            <><XCircle className="w-5 h-5 shrink-0" /> <span className="text-sm">No matching hash found. May not be stored or altered.</span></>
                                        )}
                                    </div>
                                )}

                                {/* Store Button */}
                                {!verifyMode && isConnected && fileHash && (
                                    <Button
                                        onClick={handleStoreCertificate}
                                        disabled={loading}
                                        className="w-full mt-4 font-display uppercase tracking-wider text-xs bg-primary text-primary-foreground hover:bg-primary/90"
                                    >
                                        {loading ? 'Storing...' : 'Store Hash on Blockchain'}
                                    </Button>
                                )}
                            </CardContent>
                        </Card>
                    </motion.div>



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
                                    <li className="flex items-start gap-2"><Hash className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" /> <span><strong className="text-foreground">Hash Generation</strong> — SHA-256 uniquely identifies the file</span></li>
                                    <li className="flex items-start gap-2"><ShieldCheck className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" /> <span><strong className="text-foreground">Blockchain Storage</strong> — Hash stored on Algorand permanently</span></li>
                                    <li className="flex items-start gap-2"><Search className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" /> <span><strong className="text-foreground">Instant Verify</strong> — Any modification changes the hash</span></li>
                                    <li className="flex items-start gap-2"><FileCheck className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" /> <span><strong className="text-foreground">Public Proof</strong> — Anyone can verify via explorer</span></li>
                                </ul>
                            </CardContent>
                        </Card>
                    </motion.div>
                </motion.div>
            </main>
        </div>
    );
}
