'use client';

import { useState, useRef, useEffect } from 'react';
import { useWallet } from '@/context/WalletContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileCheck, Wallet, ExternalLink, ShieldCheck, Upload, Search, Hash, CheckCircle, XCircle, History, Clock } from 'lucide-react';
import {
    createHashStoreTxn,
    getSuggestedParams,
    getAlgodClient,
    getExplorerUrl,
    hashFile,
    fetchCertificateTransactions,
    normalizeSignedTxnBytes,
} from '@/lib/algorand';
import { notifyCertificateStored } from '@/lib/n8n';

interface CertificateRecord {
    fileName: string;
    hash: string;
    txId: string;
    timestamp: string;
}

type Tab = 'store' | 'verify' | 'history';

export default function CertificatePage() {
    const { address, isConnected, connect, peraWallet } = useWallet();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [activeTab, setActiveTab] = useState<Tab>('store');
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [fileHash, setFileHash] = useState<string | null>(null);
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [status, setStatus] = useState<string>('');
    const [records, setRecords] = useState<CertificateRecord[]>([]);
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
            if (activeTab === 'verify') {
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
            const result = await client.sendRawTransaction(normalizeSignedTxnBytes(signedTxns[0])).do();
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
            // Notify n8n
            notifyCertificateStored({
                fileName: selectedFile.name,
                hash: fileHash,
                explorerUrl: getExplorerUrl(txId)
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
            <main className="max-w-4xl mx-auto px-6 md:px-12 py-12 pb-24 md:pb-12">
                <motion.div variants={container} initial="hidden" animate="show">
                    {/* Page Title */}
                    <motion.div variants={item} className="text-center mb-10">
                        <FileCheck className="w-12 h-12 text-primary mx-auto mb-4" />
                        <h1 className="font-display text-4xl font-bold tracking-tight text-primary text-glow mb-2">
                            CERTIFICATES
                        </h1>
                        <p className="text-muted-foreground">Store, verify, and track your certificates on the blockchain.</p>
                    </motion.div>

                    {/* Navigation Tabs (Desktop) */}
                    <motion.div variants={item} className="flex justify-center mb-8 hidden md:flex">
                        <div className="bg-card/50 backdrop-blur-sm p-1 rounded-xl border border-border inline-flex">
                            {(['store', 'verify', 'history'] as const).map((tab) => (
                                <button
                                    key={tab}
                                    onClick={() => {
                                        setActiveTab(tab);
                                        setVerifyResult(null);
                                        setError(null);
                                        setStatus('');
                                        setSelectedFile(null);
                                        setFileHash(null);
                                        if (fileInputRef.current) fileInputRef.current.value = '';
                                    }}
                                    className={`px-6 py-2.5 rounded-lg text-sm font-display font-medium uppercase tracking-wider transition-all duration-300 ${activeTab === tab
                                        ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20'
                                        : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
                                        }`}
                                >
                                    {tab === 'store' && <div className="flex items-center gap-2"><Upload className="w-4 h-4" /> Store</div>}
                                    {tab === 'verify' && <div className="flex items-center gap-2"><Search className="w-4 h-4" /> Verify</div>}
                                    {tab === 'history' && <div className="flex items-center gap-2"><History className="w-4 h-4" /> History</div>}
                                </button>
                            ))}
                        </div>
                    </motion.div>

                    {/* Content Area */}
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={activeTab}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.3 }}
                        >
                            {/* STORE Tab */}
                            {activeTab === 'store' && (
                                <div className="max-w-xl mx-auto">
                                    <Card className="bg-card border-border mb-5">
                                        <CardHeader className="pb-3 border-b border-border/50">
                                            <CardTitle className="text-sm font-display uppercase tracking-wider flex items-center gap-2">
                                                <Upload className="w-4 h-4 text-primary" /> Store Certificate
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent className="pt-6">
                                            {!isConnected ? (
                                                <div className="text-center py-6">
                                                    <Wallet className="w-10 h-10 text-muted-foreground mx-auto mb-4" />
                                                    <p className="text-sm text-muted-foreground mb-4">Connect your wallet to store certificates.</p>
                                                    <Button onClick={connect} className="font-display uppercase tracking-wider text-xs">
                                                        Connect Pera Wallet
                                                    </Button>
                                                </div>
                                            ) : (
                                                <>
                                                    <p className="text-xs text-muted-foreground mb-4">
                                                        Upload a certificate to permanently store its hash on the blockchain.
                                                    </p>
                                                    <div
                                                        className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all duration-300 ${selectedFile
                                                            ? 'border-primary/60 bg-primary/5'
                                                            : 'border-border hover:border-primary/40 hover:bg-white/5'
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
                                                                <FileCheck className="w-10 h-10 text-primary mx-auto mb-3" />
                                                                <p className="text-sm font-semibold text-foreground">{selectedFile.name}</p>
                                                                <p className="text-[10px] font-mono text-muted-foreground mt-1">
                                                                    {(selectedFile.size / 1024).toFixed(2)} KB
                                                                </p>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <Upload className="w-10 h-10 text-muted-foreground/60 mx-auto mb-3" />
                                                                <p className="text-sm text-muted-foreground">Click to select file</p>
                                                                <p className="text-[10px] font-mono text-muted-foreground mt-1">PDF, PNG, JPG</p>
                                                            </>
                                                        )}
                                                    </div>

                                                    {/* Hash Display */}
                                                    {fileHash && (
                                                        <div className="mt-4">
                                                            <div className="bg-background/50 rounded-lg p-3 border border-border/50">
                                                                <p className="text-[10px] font-display uppercase tracking-wider text-muted-foreground mb-1 flex items-center gap-1">
                                                                    <Hash className="w-3 h-3" /> DNA (SHA-256)
                                                                </p>
                                                                <div className="font-mono text-[10px] text-primary break-all select-all">
                                                                    {fileHash}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Store Button */}
                                                    {fileHash && (
                                                        <Button
                                                            onClick={handleStoreCertificate}
                                                            disabled={loading}
                                                            className="w-full mt-6 font-display uppercase tracking-wider text-xs bg-primary text-primary-foreground hover:bg-primary/90 h-10"
                                                        >
                                                            {loading ? (
                                                                <span className="flex items-center gap-2">
                                                                    <span className="animate-spin">⏳</span> Processing...
                                                                </span>
                                                            ) : 'Store Hash on Blockchain'}
                                                        </Button>
                                                    )}

                                                    {/* Status Messages */}
                                                    {status && (
                                                        <div className="mt-4 text-center">
                                                            <p className="text-xs font-mono text-primary animate-pulse">{status}</p>
                                                        </div>
                                                    )}
                                                    {error && (
                                                        <div className="mt-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-xs text-destructive text-center">
                                                            {error}
                                                        </div>
                                                    )}
                                                    {successTxId && (
                                                        <div className="mt-4 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-lg flex flex-col gap-2">
                                                            <div className="flex items-center gap-2 text-emerald-500 font-bold text-sm">
                                                                <CheckCircle className="w-4 h-4" /> Stored Successfully
                                                            </div>
                                                            <a href={getExplorerUrl(successTxId)} target="_blank" rel="noopener noreferrer" className="text-[10px] text-emerald-500/70 hover:text-emerald-500 underline decoration-dotted truncate">
                                                                View on Explorer: {successTxId}
                                                            </a>
                                                        </div>
                                                    )}
                                                </>
                                            )}
                                        </CardContent>
                                    </Card>
                                </div>
                            )}

                            {/* VERIFY Tab */}
                            {activeTab === 'verify' && (
                                <div className="max-w-xl mx-auto">
                                    <Card className="bg-card border-border mb-5">
                                        <CardHeader className="pb-3 border-b border-border/50">
                                            <CardTitle className="text-sm font-display uppercase tracking-wider flex items-center gap-2">
                                                <Search className="w-4 h-4 text-primary" /> Verify Certificate
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent className="pt-6">
                                            <p className="text-xs text-muted-foreground mb-4">
                                                Upload a document to check if its original hash exists on the blockchain.
                                            </p>
                                            <div
                                                className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all duration-300 ${selectedFile
                                                    ? 'border-primary/60 bg-primary/5'
                                                    : 'border-border hover:border-primary/40 hover:bg-white/5'
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
                                                        <Search className="w-10 h-10 text-primary mx-auto mb-3" />
                                                        <p className="text-sm font-semibold text-foreground">{selectedFile.name}</p>
                                                    </>
                                                ) : (
                                                    <>
                                                        <Search className="w-10 h-10 text-muted-foreground/60 mx-auto mb-3" />
                                                        <p className="text-sm text-muted-foreground">Select file to verify</p>
                                                    </>
                                                )}
                                            </div>

                                            {/* Verify Result */}
                                            {verifyResult && (
                                                <motion.div
                                                    initial={{ opacity: 0, y: 10 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    className={`mt-6 p-4 rounded-lg border flex items-start gap-3 ${verifyResult === 'match'
                                                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500'
                                                        : 'bg-destructive/10 border-destructive/30 text-destructive'
                                                        }`}
                                                >
                                                    {verifyResult === 'match' ? (
                                                        <>
                                                            <CheckCircle className="w-5 h-5 shrink-0 mt-0.5" />
                                                            <div>
                                                                <h4 className="font-bold text-sm">Valid Certificate</h4>
                                                                <p className="text-xs opacity-80 mt-1">This document's hash matches a record on the blockchain.</p>
                                                            </div>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <XCircle className="w-5 h-5 shrink-0 mt-0.5" />
                                                            <div>
                                                                <h4 className="font-bold text-sm">No Match Found</h4>
                                                                <p className="text-xs opacity-80 mt-1">We could not find a record of this file. It may be modified or not yet stored.</p>
                                                            </div>
                                                        </>
                                                    )}
                                                </motion.div>
                                            )}
                                        </CardContent>
                                    </Card>
                                </div>
                            )}

                            {/* HISTORY Tab */}
                            {activeTab === 'history' && (
                                <div className="max-w-2xl mx-auto">
                                    <div className="space-y-4">
                                        {!isConnected && (
                                            <div className="text-center py-12 bg-card border border-border rounded-xl">
                                                <Wallet className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                                                <h3 className="text-lg font-bold">Connect Wallet</h3>
                                                <p className="text-sm text-muted-foreground mb-4">View your certificate history</p>
                                                <Button onClick={connect} variant="outline">Connect Pera Wallet</Button>
                                            </div>
                                        )}

                                        {isConnected && records.length === 0 && (
                                            <div className="text-center py-12 bg-card border border-border rounded-xl">
                                                <History className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                                                <h3 className="text-lg font-bold">No Records</h3>
                                                <p className="text-sm text-muted-foreground">You haven't stored any certificates yet.</p>
                                            </div>
                                        )}

                                        {isConnected && records.map((record, index) => (
                                            <motion.div
                                                key={record.txId}
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: index * 0.05 }}
                                                className="bg-card border border-border rounded-xl p-4 hover:border-primary/30 transition-all group"
                                            >
                                                <div className="flex justify-between items-start gap-4">
                                                    <div className="flex items-start gap-3">
                                                        <div className="p-2 bg-primary/10 rounded-lg shrink-0">
                                                            <FileCheck className="w-5 h-5 text-primary" />
                                                        </div>
                                                        <div>
                                                            <h4 className="font-bold text-sm text-foreground mb-1">{record.fileName}</h4>
                                                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                                <Clock className="w-3 h-3" />
                                                                {new Date(record.timestamp).toLocaleString()}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <Button variant="ghost" size="sm" className="h-8 text-xs font-display uppercase tracking-wider text-primary" asChild>
                                                        <a href={getExplorerUrl(record.txId)} target="_blank" rel="noopener noreferrer">
                                                            Explorer <ExternalLink className="w-3 h-3 ml-1" />
                                                        </a>
                                                    </Button>
                                                </div>
                                                <div className="mt-3 pt-3 border-t border-border/50 flex items-center gap-2">
                                                    <Hash className="w-3 h-3 text-muted-foreground" />
                                                    <code className="text-[10px] font-mono text-muted-foreground truncate max-w-[300px] md:max-w-full group-hover:text-primary transition-colors">
                                                        {record.hash}
                                                    </code>
                                                </div>
                                            </motion.div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* How It Works - Only show on Store/Verify tabs */}
                            {activeTab !== 'history' && (
                                <div className="max-w-xl mx-auto mt-8">
                                    <Card className="bg-card/50 border-border/50">
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
                                            </ul>
                                        </CardContent>
                                    </Card>
                                </div>
                            )}

                        </motion.div>
                    </AnimatePresence>

                    {/* Footer Info */}
                    <div className="mt-12 text-center">
                        <p className="text-[10px] uppercase tracking-widest text-muted-foreground/50 font-display">
                            Secured by Algorand Blockchain
                        </p>
                    </div>
                </motion.div>
            </main>

            {/* Mobile Bottom Navigation */}
            <div className="fixed bottom-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-t border-border md:hidden safe-area-bottom">
                <div className="flex justify-around items-center p-2">
                    {(['store', 'verify', 'history'] as const).map((tab) => (
                        <button
                            key={tab}
                            onClick={() => {
                                setActiveTab(tab);
                                setVerifyResult(null);
                                setError(null);
                                setStatus('');
                                setSelectedFile(null);
                                setFileHash(null);
                                if (fileInputRef.current) fileInputRef.current.value = '';
                                window.scrollTo({ top: 0, behavior: 'smooth' });
                            }}
                            className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-all duration-300 w-full ${activeTab === tab
                                ? 'text-primary'
                                : 'text-muted-foreground hover:text-foreground'
                                }`}
                        >
                            <div className={`p-1.5 rounded-full transition-all ${activeTab === tab ? 'bg-primary/10' : ''}`}>
                                {tab === 'store' && <Upload className="w-5 h-5" />}
                                {tab === 'verify' && <Search className="w-5 h-5" />}
                                {tab === 'history' && <History className="w-5 h-5" />}
                            </div>
                            <span className="text-[10px] font-display uppercase tracking-wider font-medium">
                                {tab}
                            </span>
                            {activeTab === tab && (
                                <motion.div
                                    layoutId="bottomNavIndicator"
                                    className="absolute bottom-0 w-12 h-1 bg-primary rounded-t-full"
                                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                                />
                            )}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}
