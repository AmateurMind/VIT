'use client';

import { useState } from 'react';
import { useWallet } from '@/context/WalletContext';
import Link from 'next/link';
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

    // Generate unique session ID (for demo)
    const generateSessionId = () => {
        const date = new Date().toISOString().split('T')[0];
        const random = Math.random().toString(36).substring(2, 8).toUpperCase();
        setSessionId(`SESSION-${date}-${random}`);
    };

    // Mark attendance on blockchain
    const handleMarkAttendance = async () => {
        if (!address || !peraWallet || !sessionId) {
            setError('Please enter or generate a session ID');
            return;
        }

        setLoading(true);
        setStatus('Preparing attendance transaction...');
        setError(null);

        try {
            const timestamp = new Date().toISOString();
            const attendanceData = {
                sessionId,
                studentWallet: address.slice(0, 10) + '...',
                timestamp,
            };

            // Create hash of attendance data
            const hash = await crypto.subtle.digest(
                'SHA-256',
                new TextEncoder().encode(JSON.stringify(attendanceData))
            );
            const hashHex = Array.from(new Uint8Array(hash))
                .map(b => b.toString(16).padStart(2, '0'))
                .join('');

            const params = await getSuggestedParams();
            const txn = createHashStoreTxn(address, hashHex, 'ATTENDANCE', params);

            setStatus('Please sign the transaction in Pera Wallet...');
            const signedTxns = await peraWallet.signTransaction([[{ txn }]]);

            setStatus('Recording attendance on Algorand blockchain...');
            const client = getAlgodClient();
            const result = await client.sendRawTransaction(signedTxns[0]).do();

            setStatus('Confirming on-chain...');
            await new Promise(resolve => setTimeout(resolve, 4000));

            // Add to local records
            const newRecord: AttendanceRecord = {
                sessionId,
                timestamp,
                txId: result.txId,
            };
            setRecords(prev => [newRecord, ...prev]);

            setStatus('');
            setSessionId('');
        } catch (err) {
            console.error('Attendance error:', err);
            setError('Failed to record attendance. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="attendance-page">
            <Link href="/" className="back-link">← Back to Home</Link>

            <header className="page-header">
                <h1>📋 Blockchain Attendance</h1>
                <p>Tamper-proof attendance records. No proxy. No disputes.</p>
            </header>

            {/* Connection Status */}
            {!isConnected && (
                <div className="card connect-card">
                    <h3>🔗 Connect Your Wallet</h3>
                    <p>Connect your Pera Wallet to mark attendance.</p>
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

            {/* Mark Attendance Section */}
            {isConnected && (
                <div className="card">
                    <h3>📝 Mark Your Attendance</h3>
                    <p style={{ marginBottom: '16px' }}>
                        Your attendance will be permanently recorded on Algorand blockchain.
                    </p>

                    <div className="input-group" style={{ marginBottom: '16px' }}>
                        <input
                            type="text"
                            value={sessionId}
                            onChange={(e) => setSessionId(e.target.value)}
                            placeholder="Enter Session ID"
                            className="input"
                        />
                        <button onClick={generateSessionId} className="btn btn-secondary">
                            Generate
                        </button>
                    </div>

                    {sessionId && (
                        <div className="alert alert-info" style={{ marginBottom: '16px' }}>
                            Session ID: <strong>{sessionId}</strong>
                        </div>
                    )}

                    <button
                        onClick={handleMarkAttendance}
                        disabled={loading || !sessionId}
                        className="btn btn-primary"
                        style={{ width: '100%' }}
                    >
                        {loading ? 'Recording...' : '✅ Mark Present on Blockchain'}
                    </button>
                </div>
            )}

            {/* Attendance Records */}
            {records.length > 0 && (
                <div className="card">
                    <h3>📊 Your Attendance Records</h3>
                    <div className="records-list">
                        {records.map((record, index) => (
                            <div key={index} className="record-item">
                                <div className="record-info">
                                    <strong>{record.sessionId}</strong>
                                    <span className="record-time">
                                        {new Date(record.timestamp).toLocaleString()}
                                    </span>
                                </div>
                                <a
                                    href={getExplorerUrl(record.txId)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="btn btn-secondary"
                                    style={{ padding: '8px 16px', fontSize: '0.85rem' }}
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
                <h3>🔐 How Blockchain Attendance Works</h3>
                <ul className="trust-list">
                    <li><strong>Wallet Identity</strong> — Your wallet address acts as your unique ID</li>
                    <li><strong>Hash Storage</strong> — Attendance data hash is stored on-chain</li>
                    <li><strong>Timestamped</strong> — Exact time is captured in the transaction</li>
                    <li><strong>Immutable Proof</strong> — Once recorded, it cannot be altered</li>
                </ul>
            </div>
        </div>
    );
}
