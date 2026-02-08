'use client';

import { useState, useEffect, useCallback } from 'react';
import { useWallet } from '@/context/WalletContext';
import Link from 'next/link';
import {
    getVotingState,
    hasUserVoted,
    hasOptedIn,
    createOptInTxn,
    createVoteTxn,
    getSuggestedParams,
    getAlgodClient,
    getExplorerUrl,
    getAppExplorerUrl,
    VOTING_APP_ID,
} from '@/lib/algorand';

interface VotingState {
    isOpen: boolean;
    option0: number;
    option1: number;
    creator: string;
}

export default function VotePage() {
    const {
        address,
        isConnected,
        connect,
        peraWallet,
        isGuestMode,
        guestSecretKey,
        enableGuestMode
    } = useWallet();

    const [appId, setAppId] = useState<number>(VOTING_APP_ID);
    const [votingState, setVotingState] = useState<VotingState | null>(null);
    const [userVoted, setUserVoted] = useState<boolean>(false);
    const [userOptedIn, setUserOptedIn] = useState<boolean>(false);
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [txId, setTxId] = useState<string | null>(null);
    const [status, setStatus] = useState<string>('');

    // Poll options (can be customized)
    const options = [
        { id: 0, label: 'Option A', emoji: '🅰️' },
        { id: 1, label: 'Option B', emoji: '🅱️' },
    ];

    // Fetch current voting state
    const fetchState = useCallback(async () => {
        if (!appId || appId === 0) {
            setError('Voting App ID not configured. Please deploy the contract first.');
            return;
        }

        try {
            const state = await getVotingState(appId);
            setVotingState(state);
            setError(null);

            if (address) {
                const hasVoted = await hasUserVoted(appId, address);
                const optedIn = await hasOptedIn(appId, address);
                setUserVoted(hasVoted);
                setUserOptedIn(optedIn);
            }
        } catch (err) {
            console.error('Error fetching voting state:', err);
            setError('Could not fetch voting state. Is the App ID correct?');
        }
    }, [appId, address]);

    useEffect(() => {
        fetchState();
        // Poll every 10 seconds for live updates
        const interval = setInterval(fetchState, 10000);
        return () => clearInterval(interval);
    }, [fetchState]);

    // Handle opt-in to the contract
    const handleOptIn = async () => {
        if (!address || !peraWallet) return;

        setLoading(true);
        setStatus('Preparing opt-in transaction...');
        setError(null);

        try {
            const params = await getSuggestedParams();
            const txn = createOptInTxn(address, appId, params);

            setStatus(isGuestMode ? 'Signing locally...' : 'Please sign the transaction in Pera Wallet...');
            let signedTxns: Uint8Array[];

            if (isGuestMode && guestSecretKey) {
                signedTxns = [txn.signTxn(guestSecretKey)];
            } else if (peraWallet) {
                signedTxns = await peraWallet.signTransaction([[{ txn }]]);
            } else {
                throw new Error('No wallet connected');
            }

            setStatus('Sending transaction to Algorand...');
            const client = getAlgodClient();
            const { txId } = await client.sendRawTransaction(signedTxns[0]).do();

            setStatus('Confirming transaction...');
            await new Promise(resolve => setTimeout(resolve, 4000));

            setTxId(txId);
            setUserOptedIn(true);
            setStatus(`Successfully ${isGuestMode ? 'Guest ' : ''}opted in! You can now vote.`);
            await fetchState();
        } catch (err) {
            console.error('Opt-in error:', err);
            setError('Failed to opt-in. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    // Handle vote submission
    const handleVote = async (choice: number) => {
        if (!address || !peraWallet) return;

        setLoading(true);
        setStatus(`Casting vote for ${options[choice].label}...`);
        setError(null);

        try {
            const params = await getSuggestedParams();
            const txn = createVoteTxn(address, appId, choice, params);

            setStatus(isGuestMode ? 'Signing locally...' : 'Please sign the transaction in Pera Wallet...');
            let signedTxns: Uint8Array[];

            if (isGuestMode && guestSecretKey) {
                signedTxns = [txn.signTxn(guestSecretKey)];
            } else if (peraWallet) {
                signedTxns = await peraWallet.signTransaction([[{ txn }]]);
            } else {
                throw new Error('No wallet connected');
            }

            setStatus('Sending vote to Algorand blockchain...');
            const client = getAlgodClient();
            const result = await client.sendRawTransaction(signedTxns[0]).do();

            setStatus('Confirming on-chain...');
            await new Promise(resolve => setTimeout(resolve, 4000));

            setTxId(result.txId);
            setUserVoted(true);
            setStatus(`🎉 ${isGuestMode ? 'Guest ' : ''}Vote recorded on blockchain!`);
            await fetchState();
        } catch (err) {
            console.error('Voting error:', err);
            setError('Failed to cast vote. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const totalVotes = (votingState?.option0 || 0) + (votingState?.option1 || 0);

    return (
        <div className="vote-page">
            <Link href="/" className="back-link">← Back to Home</Link>

            <header className="page-header">
                <h1>🗳️ Blockchain Voting</h1>
                <p>One wallet = one vote. Immutable. Transparent. Verifiable.</p>
            </header>

            {/* App ID Input (for demo/testing) */}
            {(!VOTING_APP_ID || VOTING_APP_ID === 0) && (
                <div className="card config-card">
                    <h3>⚙️ Configuration</h3>
                    <p>Enter your deployed Voting App ID:</p>
                    <div className="input-group">
                        <input
                            type="number"
                            value={appId || ''}
                            onChange={(e) => setAppId(Number(e.target.value))}
                            placeholder="Enter App ID"
                            className="input"
                        />
                        <button onClick={fetchState} className="btn btn-secondary">
                            Load Poll
                        </button>
                    </div>
                </div>
            )}

            {/* Connection Status */}
            {!isConnected && (
                <div className="card connect-card">
                    <h3>🔗 Demo Guest Mode</h3>
                    <p style={{ marginBottom: '16px', color: 'var(--ink-muted)' }}>
                        Already voted? Use Guest Mode to generate a temporary wallet for testing multiple votes.
                    </p>
                    <button onClick={enableGuestMode} className="btn btn-secondary" style={{ width: '100%', marginBottom: '12px' }}>
                        🚀 Enter Guest Mode
                    </button>

                    <div style={{ textAlign: 'center', margin: '16px 0', color: 'var(--ink-muted)' }}>— OR —</div>

                    <h3>🔗 Connect Your Wallet</h3>
                    <p>You need to connect your Pera Wallet to vote.</p>
                    <button onClick={connect} className="btn btn-primary" style={{ width: '100%' }}>
                        Connect Pera Wallet
                    </button>
                </div>
            )}

            {/* Guest Mode Indicator */}
            {isGuestMode && isConnected && (
                <div className="card guest-info-card" style={{ border: '1px solid var(--accent)', background: 'rgba(59, 130, 246, 0.1)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                        <h3 style={{ margin: 0 }}>🚀 Demo Guest Identity</h3>
                        <span className="status-badge open">Active</span>
                    </div>
                    <p style={{ fontSize: '0.85rem', marginBottom: '8px' }}>This is a temporary wallet generated for your demo.</p>
                    <div className="hash-display" style={{ marginBottom: '12px', fontSize: '0.8rem' }}>{address}</div>

                    <div className="alert alert-warning" style={{ fontSize: '0.85rem', padding: '8px 12px' }}>
                        💡 <strong>Note:</strong> This guest needs ~0.5 ALGO to vote.
                        <a href="https://bank.testnet.algorand.network/" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)', marginLeft: '8px', textDecoration: 'underline' }}>
                            Fund it here →
                        </a>
                    </div>

                    <button onClick={enableGuestMode} className="btn btn-secondary" style={{ width: '100%', marginTop: '12px' }}>
                        🆕 Generate Another Guest
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
            {status && !error && (
                <div className="alert alert-info">
                    ⏳ {status}
                </div>
            )}

            {/* Transaction Success */}
            {txId && (
                <div className="alert alert-success">
                    ✅ Transaction confirmed!
                    <a href={getExplorerUrl(txId)} target="_blank" rel="noopener noreferrer" className="explorer-link">
                        View on Algorand Explorer →
                    </a>
                </div>
            )}

            {/* Voting State */}
            {votingState && (
                <>
                    {/* Poll Status */}
                    <div className="card status-card">
                        <div className="status-row">
                            <span className={`status-badge ${votingState.isOpen ? 'open' : 'closed'}`}>
                                {votingState.isOpen ? '🟢 Voting Open' : '🔴 Voting Closed'}
                            </span>
                            <span className="total-votes">
                                {totalVotes} vote{totalVotes !== 1 ? 's' : ''} recorded
                            </span>
                        </div>
                        {appId > 0 && (
                            <a href={getAppExplorerUrl(appId)} target="_blank" rel="noopener noreferrer" className="app-link">
                                View App on Explorer (ID: {appId})
                            </a>
                        )}
                    </div>

                    {/* Results Display */}
                    <div className="card results-card">
                        <h3>📊 Live Results</h3>
                        <div className="results">
                            {options.map((option) => {
                                const votes = option.id === 0 ? votingState.option0 : votingState.option1;
                                const percentage = totalVotes > 0 ? (votes / totalVotes) * 100 : 0;

                                return (
                                    <div key={option.id} className="result-bar">
                                        <div className="result-label">
                                            <span>{option.emoji} {option.label}</span>
                                            <span className="result-count">{votes} votes ({percentage.toFixed(1)}%)</span>
                                        </div>
                                        <div className="progress-bar">
                                            <div
                                                className="progress-fill"
                                                style={{ width: `${percentage}%` }}
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Voting Actions */}
                    {isConnected && votingState.isOpen && (
                        <div className="card voting-card">
                            {userVoted ? (
                                <div className="voted-message">
                                    <h3>✅ You have already voted</h3>
                                    <p>Your vote is permanently recorded on the Algorand blockchain.</p>
                                </div>
                            ) : !userOptedIn ? (
                                <>
                                    <h3>📝 Step 1: Opt-In to Voting Contract</h3>
                                    <p>Before voting, you need to opt-in to the smart contract.</p>
                                    <button
                                        onClick={handleOptIn}
                                        disabled={loading}
                                        className="btn btn-primary"
                                    >
                                        {loading ? 'Processing...' : 'Opt-In to Vote'}
                                    </button>
                                </>
                            ) : (
                                <>
                                    <h3>🗳️ Cast Your Vote</h3>
                                    <p>Choose your option below. This action is irreversible.</p>
                                    <div className="voting-buttons">
                                        {options.map((option) => (
                                            <button
                                                key={option.id}
                                                onClick={() => handleVote(option.id)}
                                                disabled={loading}
                                                className="btn btn-vote"
                                            >
                                                {option.emoji} Vote for {option.label}
                                            </button>
                                        ))}
                                    </div>
                                </>
                            )}
                        </div>
                    )}
                </>
            )}

            {/* Trust Explanation */}
            <div className="card info-card">
                <h3>🔐 Why Blockchain?</h3>
                <ul className="trust-list">
                    <li><strong>1 wallet = 1 vote</strong> — No duplicate voting possible</li>
                    <li><strong>Immutable</strong> — Once recorded, votes cannot be changed</li>
                    <li><strong>Transparent</strong> — Anyone can verify results on-chain</li>
                    <li><strong>No admin control</strong> — Smart contract enforces rules</li>
                </ul>
            </div>
        </div>
    );
}
