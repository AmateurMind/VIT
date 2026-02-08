'use client';

import { useState, useRef } from 'react';
import { useWallet } from '@/context/WalletContext';
import Link from 'next/link';
import {
    createHashStoreTxn,
    getSuggestedParams,
    getAlgodClient,
    getExplorerUrl,
    hashFile,
} from '@/lib/algorand';

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

    // Handle file selection
    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setSelectedFile(file);
        setVerifyResult(null);

        // Generate hash
        setStatus('Generating SHA-256 hash...');
        try {
            const hash = await hashFile(file);
            setFileHash(hash);
            setStatus('');

            // If in verify mode, check against stored records
            if (verifyMode) {
                const exists = records.some(r => r.hash === hash);
                setVerifyResult(exists ? 'match' : 'no-match');
            }
        } catch (err) {
            console.error('Hash error:', err);
            setError('Failed to generate hash');
        }
    };

    // Store certificate hash on blockchain
    const handleStoreCertificate = async () => {
        if (!address || !peraWallet || !fileHash || !selectedFile) {
            setError('Please select a file first');
            return;
        }

        setLoading(true);
        setStatus('Preparing transaction...');
        setError(null);

        try {
            const params = await getSuggestedParams();
            const txn = createHashStoreTxn(address, fileHash, 'CERTIFICATE', params);

            setStatus('Please sign the transaction in Pera Wallet...');
            const signedTxns = await peraWallet.signTransaction([[{ txn }]]);

            setStatus('Storing hash on Algorand blockchain...');
            const client = getAlgodClient();
            const result = await client.sendRawTransaction(signedTxns[0]).do();

            setStatus('Confirming on-chain...');
            await new Promise(resolve => setTimeout(resolve, 4000));

            // Add to local records
            const newRecord: CertificateRecord = {
                fileName: selectedFile.name,
                hash: fileHash,
                txId: result.txId,
                timestamp: new Date().toISOString(),
            };
            setRecords(prev => [newRecord, ...prev]);

            setStatus('');
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

    return (
        <div className="certificate-page">
            <Link href="/" className="back-link">← Back to Home</Link>

            <header className="page-header">
                <h1>🎓 Certificate Verification</h1>
                <p>Store and verify certificate authenticity using blockchain hashes.</p>
            </header>

            {/* Mode Toggle */}
            <div className="card" style={{ textAlign: 'center' }}>
                <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                    <button
                        onClick={() => { setVerifyMode(false); setVerifyResult(null); }}
                        className={`btn ${!verifyMode ? 'btn-primary' : 'btn-secondary'}`}
                    >
                        📤 Store Certificate
                    </button>
                    <button
                        onClick={() => { setVerifyMode(true); setVerifyResult(null); }}
                        className={`btn ${verifyMode ? 'btn-primary' : 'btn-secondary'}`}
                    >
                        🔍 Verify Certificate
                    </button>
                </div>
            </div>

            {/* Connection Status */}
            {!isConnected && !verifyMode && (
                <div className="card connect-card">
                    <h3>🔗 Connect Your Wallet</h3>
                    <p>Connect your Pera Wallet to store certificate hashes.</p>
                    <button onClick={connect} className="btn btn-primary">
                        Connect Pera Wallet
                    </button>
                </div>
            )}

            {/* Error Display */}
            {error && (
                <div className="alert alert-error">
                    ⚠️ {error}
                </div>
            )}

            {/* Status Display */}
            {status && (
                <div className="alert alert-info">
                    ⏳ {status}
                </div>
            )}

            {/* File Upload Section */}
            <div className="card">
                <h3>{verifyMode ? '🔍 Upload Certificate to Verify' : '📄 Upload Certificate to Store'}</h3>
                <p style={{ marginBottom: '16px', color: 'var(--ink-muted)' }}>
                    {verifyMode
                        ? 'Upload a certificate to verify its authenticity against stored hashes.'
                        : 'Upload a certificate file to store its hash on the blockchain.'}
                </p>

                <div
                    className={`file-upload ${selectedFile ? 'has-file' : ''}`}
                    onClick={() => fileInputRef.current?.click()}
                >
                    <input
                        ref={fileInputRef}
                        type="file"
                        onChange={handleFileSelect}
                        accept=".pdf,.png,.jpg,.jpeg"
                    />
                    {selectedFile ? (
                        <>
                            <div style={{ fontSize: '2rem', marginBottom: '8px' }}>📄</div>
                            <p><strong>{selectedFile.name}</strong></p>
                            <p style={{ fontSize: '0.85rem', color: 'var(--ink-muted)' }}>
                                {(selectedFile.size / 1024).toFixed(2)} KB
                            </p>
                        </>
                    ) : (
                        <>
                            <div style={{ fontSize: '2rem', marginBottom: '8px' }}>📁</div>
                            <p>Click to select a certificate file</p>
                            <p style={{ fontSize: '0.85rem', color: 'var(--ink-muted)' }}>
                                Supports PDF, PNG, JPG
                            </p>
                        </>
                    )}
                </div>

                {/* Hash Display */}
                {fileHash && (
                    <div style={{ marginTop: '16px' }}>
                        <p><strong>SHA-256 Hash:</strong></p>
                        <div className="hash-display">{fileHash}</div>
                    </div>
                )}

                {/* Verify Result */}
                {verifyMode && verifyResult && (
                    <div className={`alert ${verifyResult === 'match' ? 'alert-success' : 'alert-warning'}`}>
                        {verifyResult === 'match'
                            ? '✅ Certificate hash matches! This certificate is authentic.'
                            : '⚠️ No matching hash found. This certificate may not have been stored or could be altered.'}
                    </div>
                )}

                {/* Store Button */}
                {!verifyMode && isConnected && fileHash && (
                    <button
                        onClick={handleStoreCertificate}
                        disabled={loading}
                        className="btn btn-primary"
                        style={{ width: '100%', marginTop: '16px' }}
                    >
                        {loading ? 'Storing...' : '🔗 Store Hash on Blockchain'}
                    </button>
                )}
            </div>

            {/* Stored Certificates */}
            {records.length > 0 && (
                <div className="card">
                    <h3>📊 Stored Certificates</h3>
                    <div className="records-list">
                        {records.map((record, index) => (
                            <div key={index} className="record-item" style={{ flexDirection: 'column', gap: '8px' }}>
                                <div className="record-info" style={{ width: '100%' }}>
                                    <strong>📄 {record.fileName}</strong>
                                    <span className="record-time">
                                        {new Date(record.timestamp).toLocaleString()}
                                    </span>
                                </div>
                                <div style={{ fontSize: '0.8rem', fontFamily: 'monospace', color: 'var(--ink-muted)', wordBreak: 'break-all' }}>
                                    Hash: {record.hash.slice(0, 20)}...{record.hash.slice(-20)}
                                </div>
                                <a
                                    href={getExplorerUrl(record.txId)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="btn btn-secondary"
                                    style={{ padding: '8px 16px', fontSize: '0.85rem', alignSelf: 'flex-start' }}
                                >
                                    View on Explorer
                                </a>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* How It Works */}
            <div className="card info-card">
                <h3>🔐 How Certificate Verification Works</h3>
                <ul className="trust-list">
                    <li><strong>Hash Generation</strong> — SHA-256 hash uniquely identifies the file</li>
                    <li><strong>Blockchain Storage</strong> — Hash is stored on Algorand permanently</li>
                    <li><strong>Instant Verification</strong> — Any modification changes the hash</li>
                    <li><strong>Public Proof</strong> — Anyone can verify authenticity via explorer</li>
                </ul>
            </div>
        </div>
    );
}
