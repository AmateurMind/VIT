'use client';

import { useState, useEffect, useCallback } from 'react';
import { useWallet } from '@/context/WalletContext';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Settings, Vote, Wallet, Rocket, ExternalLink, ShieldCheck, Lock, Eye, Ban } from 'lucide-react';
import {
    getVotingState,
    createOptInTxn,
    createVoteTxn,
    getSuggestedParams,
    getAlgodClient,
    getExplorerUrl,
    getAppExplorerUrl,
    getVotingParticipationStatus,
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
    const [showConfig, setShowConfig] = useState<boolean>(!VOTING_APP_ID || VOTING_APP_ID === 0);
    const debugLog = (...args: unknown[]) => console.log('[VOTE PAGE]', new Date().toISOString(), ...args);

    const options = [
        { id: 0, label: 'Option A', code: 'OPT_A' },
        { id: 1, label: 'Option B', code: 'OPT_B' },
    ];

    const fetchState = useCallback(async (source: string = 'unknown') => {
        debugLog('fetchState:start', { source, appId, address });
        if (!appId || appId === 0) {
            debugLog('fetchState:invalid-app-id', { appId });
            setError('Voting App ID not configured. Deploy the contract first.');
            return;
        }
        try {
            debugLog('fetchState:getVotingState:request', { appId });
            const state = await getVotingState(appId);
            debugLog('fetchState:getVotingState:success', state);
            setVotingState(state);
            setError(null);
            if (address) {
                debugLog('fetchState:getVotingParticipationStatus:request', { appId, address });
                const participation = await getVotingParticipationStatus(appId, address);
                debugLog('fetchState:getVotingParticipationStatus:success', participation);
                setUserVoted(participation.hasVoted);
                setUserOptedIn(participation.optedIn);
            } else {
                debugLog('fetchState:no-address-connected');
            }
            debugLog('fetchState:done');
        } catch (err) {
            console.error('[VOTE PAGE] fetchState:error', err);
            setError('Could not fetch voting state. Is the App ID correct?');
        }
    }, [appId, address]);

    useEffect(() => {
        debugLog('useEffect:init-fetch-and-interval');
        fetchState('initial-effect');
        const interval = setInterval(() => {
            debugLog('interval:tick');
            fetchState('interval');
        }, 10000);
        return () => clearInterval(interval);
    }, [fetchState]);

    const handleLoadElection = async () => {
        debugLog('handleLoadElection:clicked', { appId, address });
        setStatus('Loading election state...');
        await fetchState('load-button');
        setShowConfig(false);
        setStatus('Election state loaded.');
        setTimeout(() => setStatus(''), 1800);
    };

    const handleOptIn = async () => {
        if (!address || !peraWallet) return;
        setLoading(true);
        setStatus('Preparing opt-in transaction...');
        setError(null);
        try {
            const params = await getSuggestedParams();
            const txn = createOptInTxn(address, appId, params);
            setStatus(isGuestMode ? 'Signing locally...' : 'Sign in Pera Wallet...');
            let signedTxns: Uint8Array[];
            if (isGuestMode && guestSecretKey) {
                signedTxns = [txn.signTxn(guestSecretKey)];
            } else if (peraWallet) {
                signedTxns = await peraWallet.signTransaction([[{ txn }]]);
            } else {
                throw new Error('No wallet connected');
            }
            setStatus('Sending to Algorand...');
            const client = getAlgodClient();
            const { txId } = await client.sendRawTransaction(signedTxns[0]).do();
            setStatus('Confirming...');
            await new Promise(resolve => setTimeout(resolve, 4000));
            setTxId(txId);
            setUserOptedIn(true);
            setStatus('Opted in successfully.');
            await fetchState();
        } catch (err: any) {
            console.error('Opt-in error:', err);
            if (err?.data?.type === 'CONNECT_MODAL_CLOSED' || err?.message?.includes('4100')) {
                setError('Transaction cancelled. Please check your Pera Wallet app for pending requests.');
            } else if (err?.message?.includes('pending')) {
                setError('A transaction is already pending. Please check Pera Wallet.');
            } else {
                setError('Failed to opt-in. Please try again.');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleVote = async (choice: number) => {
        if (!address || !peraWallet) return;
        setLoading(true);
        setStatus(`Casting vote for ${options[choice].label}...`);
        setError(null);
        try {
            const params = await getSuggestedParams();
            const txn = createVoteTxn(address, appId, choice, params);
            setStatus(isGuestMode ? 'Signing locally...' : 'Sign in Pera Wallet...');
            let signedTxns: Uint8Array[];
            if (isGuestMode && guestSecretKey) {
                signedTxns = [txn.signTxn(guestSecretKey)];
            } else if (peraWallet) {
                signedTxns = await peraWallet.signTransaction([[{ txn }]]);
            } else {
                throw new Error('No wallet connected');
            }
            setStatus('Broadcasting to blockchain...');
            const client = getAlgodClient();
            const result = await client.sendRawTransaction(signedTxns[0]).do();
            setStatus('Confirming on-chain...');
            await new Promise(resolve => setTimeout(resolve, 4000));
            setTxId(result.txId);
            setUserVoted(true);
            setStatus('Vote recorded on blockchain!');
            await fetchState();
        } catch (err: any) {
            console.error('Voting error:', err);
            if (err?.data?.type === 'CONNECT_MODAL_CLOSED' || err?.message?.includes('4100')) {
                setError('Transaction cancelled. Please check your Pera Wallet app for pending requests.');
            } else if (err?.message?.includes('pending')) {
                setError('A transaction is already pending. Please check Pera Wallet.');
            } else {
                setError('Failed to cast vote. Please try again.');
            }
        } finally {
            setLoading(false);
        }
    };

    const totalVotes = (votingState?.option0 || 0) + (votingState?.option1 || 0);

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

            <main className="max-w-3xl mx-auto px-6 md:px-12 py-12">
                <motion.div variants={container} initial="hidden" animate="show">
                    {/* Page Title */}
                    <motion.div variants={item} className="text-center mb-6 p-5 border-2 border-primary/40 bg-card rounded-lg">
                        <Vote className="w-10 h-10 text-primary mx-auto mb-4" />
                        <h1 className="font-display text-3xl md:text-4xl font-bold tracking-tight text-foreground mb-2">
                            BLOCKCHAIN VOTING
                        </h1>
                        <p className="text-base font-medium text-foreground">One wallet = one vote. Immutable. Transparent. Verifiable.</p>
                    </motion.div>

                    {/* Top Quick Actions */}
                    <motion.div variants={item}>
                        <Card className="bg-card border-2 border-primary/40 mb-5">
                            <CardContent className="pt-6">
                                <h3 className="font-display text-base uppercase tracking-wider text-foreground mb-3">Quick Actions</h3>
                                {!isConnected ? (
                                    <div className="flex gap-3 flex-wrap">
                                        <Button onClick={connect} className="flex-1 min-w-[170px] font-display uppercase tracking-wider text-xs bg-primary text-primary-foreground hover:bg-primary/90">
                                            Connect Pera Wallet
                                        </Button>
                                        <Button onClick={enableGuestMode} variant="outline" className="flex-1 min-w-[170px] font-display uppercase tracking-wider text-xs border-primary/40 text-primary hover:bg-primary/10">
                                            Enter Guest Mode
                                        </Button>
                                        <Button disabled className="w-full font-display uppercase tracking-wider text-xs bg-primary/70 text-primary-foreground cursor-not-allowed">
                                            Opt-In to Vote (Connect Wallet First)
                                        </Button>
                                    </div>
                                ) : !userOptedIn ? (
                                    <div>
                                        <p className="text-sm font-medium text-foreground mb-3">Wallet connected. Complete opt-in to unlock voting.</p>
                                        <Button onClick={handleOptIn} disabled={loading} className="w-full font-display uppercase tracking-wider text-xs bg-primary text-primary-foreground hover:bg-primary/90">
                                            {loading ? 'Processing...' : 'Opt-In to Vote'}
                                        </Button>
                                    </div>
                                ) : (
                                    <p className="text-sm font-medium text-foreground">Opt-in complete. Scroll to cast your vote.</p>
                                )}
                            </CardContent>
                        </Card>
                    </motion.div>

                    {/* Config Card */}
                    <motion.div variants={item}>
                        <Card className="bg-card border-2 border-border mb-5">
                            <CardHeader className="pb-2">
                                <div className="flex justify-between items-center cursor-pointer" onClick={() => setShowConfig(!showConfig)}>
                                    <CardTitle className="text-base font-display uppercase tracking-wider text-foreground flex items-center gap-2">
                                        <Settings className="w-4 h-4 text-primary" /> Election Config {showConfig ? '▼' : '▶'}
                                    </CardTitle>
                                    {!showConfig && (
                                        <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); setShowConfig(true); }} className="text-xs font-display uppercase tracking-wider text-foreground/90">
                                            Change
                                        </Button>
                                    )}
                                </div>
                            </CardHeader>
                            {showConfig && (
                                <CardContent className="pt-2">
                                    <p className="text-sm font-medium text-foreground mb-3">Enter the App ID for the election:</p>
                                    <div className="flex gap-3">
                                        <input
                                            type="number"
                                            value={appId || ''}
                                            onChange={(e) => {
                                                const nextAppId = Number(e.target.value);
                                                debugLog('appId:changed', { from: appId, to: nextAppId });
                                                setAppId(nextAppId);
                                            }}
                                            placeholder="App ID"
                                            className="flex-1 bg-secondary border border-border px-3 py-2 text-sm font-mono text-foreground focus:outline-none focus:border-primary"
                                        />
                                        <Button variant="outline" size="sm" onClick={handleLoadElection} className="font-display uppercase tracking-wider text-xs border-primary/40 text-primary">
                                            Load
                                        </Button>
                                    </div>
                                    {VOTING_APP_ID > 0 && appId !== VOTING_APP_ID && (
                                        <p className="text-[10px] font-mono text-muted-foreground mt-2">
                                            Default: <a href="#" onClick={(e) => { e.preventDefault(); setAppId(VOTING_APP_ID); }} className="text-primary">{VOTING_APP_ID}</a>
                                        </p>
                                    )}
                                </CardContent>
                            )}
                        </Card>
                    </motion.div>

                    {/* Connect / Guest Mode */}
                    {!isConnected && (
                        <motion.div variants={item}>
                            <Card className="bg-card border-2 border-border mb-5">
                                <CardContent className="pt-6 space-y-4">
                                    <div className="text-center">
                                        <Rocket className="w-8 h-8 text-primary mx-auto mb-3" />
                                        <h3 className="font-display text-base uppercase tracking-wider text-foreground mb-1">Demo Guest Mode</h3>
                                        <p className="text-xs text-muted-foreground mb-4">Generate a temporary wallet for testing.</p>
                                        <Button onClick={enableGuestMode} variant="outline" className="w-full font-display uppercase tracking-wider text-xs border-primary/40 text-primary hover:bg-primary/10 mb-4">
                                            Enter Guest Mode
                                        </Button>
                                    </div>
                                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                        <div className="h-px flex-1 bg-border" />
                                        <span>OR</span>
                                        <div className="h-px flex-1 bg-border" />
                                    </div>
                                    <div className="text-center">
                                        <Wallet className="w-8 h-8 text-primary mx-auto mb-3" />
                                        <h3 className="font-display text-base uppercase tracking-wider text-foreground mb-1">Connect Wallet</h3>
                                        <p className="text-xs text-muted-foreground mb-4">Connect Pera Wallet to vote.</p>
                                        <Button onClick={connect} className="w-full font-display uppercase tracking-wider text-xs bg-primary text-primary-foreground hover:bg-primary/90">
                                            Connect Pera Wallet
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        </motion.div>
                    )}

                    {/* Guest Mode Info */}
                    {isGuestMode && isConnected && (
                        <motion.div variants={item}>
                            <Card className="bg-card border-primary/30 mb-5">
                                <CardContent className="pt-6">
                                    <div className="flex justify-between items-center mb-3">
                                        <h3 className="font-display text-base uppercase tracking-wider text-foreground flex items-center gap-2">
                                            <Rocket className="w-4 h-4 text-primary" /> Guest Identity
                                        </h3>
                                        <Badge variant="outline" className="text-[10px] border-emerald-600/40 text-emerald-700">Active</Badge>
                                    </div>
                                    <p className="text-xs text-muted-foreground mb-2">Temporary wallet for demo purposes.</p>
                                    <div className="bg-secondary p-3 font-mono text-[11px] text-primary break-all mb-3 border border-border">{address}</div>
                                    <div className="bg-primary/10 border border-primary/20 p-3 text-xs text-primary mb-3">
                                        💡 This guest needs ~0.5 ALGO.{' '}
                                        <a href="https://bank.testnet.algorand.network/" target="_blank" rel="noopener noreferrer" className="underline font-semibold">Fund it →</a>
                                    </div>
                                    <Button onClick={enableGuestMode} variant="outline" size="sm" className="w-full font-display uppercase tracking-wider text-xs border-primary/40 text-primary">
                                        Generate Another Guest
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
                    {status && !error && (
                        <motion.div variants={item} className="bg-primary/10 border-2 border-primary/30 p-4 mb-5 text-sm text-foreground font-mono">
                            ⏳ {status}
                        </motion.div>
                    )}
                    {txId && (
                        <motion.div variants={item} className="bg-emerald-100 border border-emerald-300 p-4 mb-5 text-sm text-emerald-800">
                            ✅ Transaction confirmed!{' '}
                            <a href={getExplorerUrl(txId)} target="_blank" rel="noopener noreferrer" className="underline font-semibold inline-flex items-center gap-1">
                                View on Explorer <ExternalLink className="w-3 h-3" />
                            </a>
                        </motion.div>
                    )}

                    {/* Voting State */}
                    {votingState && (
                        <>
                            {/* Status */}
                            <motion.div variants={item}>
                                <Card className="bg-card border-2 border-border mb-5">
                                    <CardContent className="pt-6">
                                        <div className="flex justify-between items-center flex-wrap gap-3 mb-3">
                                            <Badge variant={votingState.isOpen ? "default" : "destructive"} className="font-display text-[10px] uppercase tracking-wider">
                                                {votingState.isOpen ? '● OPEN' : '● CLOSED'}
                                            </Badge>
                                            <span className="text-sm font-mono text-foreground/90">
                                                {totalVotes} vote{totalVotes !== 1 ? 's' : ''} recorded
                                            </span>
                                        </div>
                                        {appId > 0 && (
                                            <a href={getAppExplorerUrl(appId)} target="_blank" rel="noopener noreferrer" className="text-xs text-primary font-mono inline-flex items-center gap-1 hover:underline">
                                                App ID: {appId} <ExternalLink className="w-3 h-3" />
                                            </a>
                                        )}
                                    </CardContent>
                                </Card>
                            </motion.div>

                            {/* Results */}
                            <motion.div variants={item}>
                                <Card className="bg-card border-2 border-border mb-5">
                                    <CardHeader className="pb-3">
                                        <CardTitle className="text-base font-display uppercase tracking-wider text-foreground flex items-center gap-2">
                                            <Eye className="w-4 h-4 text-primary" /> Live Results
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        {options.map((option) => {
                                            const votes = option.id === 0 ? votingState.option0 : votingState.option1;
                                            const percentage = totalVotes > 0 ? (votes / totalVotes) * 100 : 0;
                                            return (
                                                <div key={option.id}>
                                                    <div className="flex justify-between text-sm mb-1 text-foreground">
                                                        <span className="font-display uppercase tracking-wider">{option.code} — {option.label}</span>
                                                        <span className="font-mono text-foreground/90">{votes} ({percentage.toFixed(1)}%)</span>
                                                    </div>
                                                    <div className="h-5 bg-secondary border border-border overflow-hidden">
                                                        <div
                                                            className="h-full bg-primary transition-all duration-500"
                                                            style={{ width: `${percentage}%` }}
                                                        />
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </CardContent>
                                </Card>
                            </motion.div>

                            {/* Voting Actions */}
                            {!votingState.isOpen && (
                                <motion.div variants={item}>
                                    <Card className="bg-card border-2 border-border mb-5">
                                        <CardContent className="pt-6 text-center">
                                            <Lock className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
                                            <h3 className="font-display text-base uppercase tracking-wider text-foreground mb-1">Election Closed</h3>
                                            <p className="text-sm text-foreground/90">Voting actions are disabled for this app.</p>
                                        </CardContent>
                                    </Card>
                                </motion.div>
                            )}
                            {votingState.isOpen && !isConnected && (
                                <motion.div variants={item}>
                                    <Card className="bg-card border-2 border-border mb-5">
                                        <CardContent className="pt-6 text-center">
                                            <Wallet className="w-8 h-8 text-primary mx-auto mb-3" />
                                            <h3 className="font-display text-base uppercase tracking-wider text-foreground mb-1">Connect First</h3>
                                            <p className="text-sm text-foreground mb-4">Connect wallet, then the Opt-In button will appear here.</p>
                                            <div className="flex gap-3 flex-wrap">
                                                <Button onClick={connect} className="flex-1 min-w-[170px] font-display uppercase tracking-wider text-xs bg-primary text-primary-foreground hover:bg-primary/90">
                                                    Connect Pera Wallet
                                                </Button>
                                                <Button onClick={enableGuestMode} variant="outline" className="flex-1 min-w-[170px] font-display uppercase tracking-wider text-xs border-primary/40 text-primary hover:bg-primary/10">
                                                    Enter Guest Mode
                                                </Button>
                                            </div>
                                            <Button disabled className="w-full mt-4 font-display uppercase tracking-wider text-xs bg-primary/70 text-primary-foreground cursor-not-allowed">
                                                Opt-In to Vote (Connect Wallet First)
                                            </Button>
                                        </CardContent>
                                    </Card>
                                </motion.div>
                            )}
                            {isConnected && votingState.isOpen && (
                                <motion.div variants={item}>
                                    <Card className="bg-card border-2 border-border mb-5">
                                        <CardContent className="pt-6">
                                            {userVoted ? (
                                                <div className="text-center py-4">
                                                    <ShieldCheck className="w-10 h-10 text-emerald-700 mx-auto mb-3" />
                                                    <h3 className="font-display text-base uppercase tracking-wider text-emerald-700 mb-1">Vote Recorded</h3>
                                                    <p className="text-sm text-foreground/90">Permanently stored on Algorand.</p>
                                                </div>
                                            ) : !userOptedIn ? (
                                                <div className="text-center">
                                                    <Lock className="w-8 h-8 text-primary mx-auto mb-3" />
                                                    <h3 className="font-display text-base uppercase tracking-wider text-foreground mb-1">Step 1: Opt-In</h3>
                                                    <p className="text-sm text-foreground/90 mb-4">Register with the smart contract before voting.</p>
                                                    <Button onClick={handleOptIn} disabled={loading} className="w-full font-display uppercase tracking-wider text-xs bg-primary text-primary-foreground hover:bg-primary/90">
                                                        {loading ? 'Processing...' : 'Opt-In to Vote'}
                                                    </Button>
                                                </div>
                                            ) : (
                                                <div>
                                                    <h3 className="font-display text-base uppercase tracking-wider text-foreground mb-1 text-center">Cast Your Vote</h3>
                                                    <p className="text-sm text-foreground/90 mb-4 text-center">This action is irreversible.</p>
                                                    <div className="flex gap-4 flex-wrap">
                                                        {options.map((option) => (
                                                            <Button
                                                                key={option.id}
                                                                onClick={() => handleVote(option.id)}
                                                                disabled={loading}
                                                                variant="outline"
                                                                className="flex-1 min-w-[160px] h-16 font-display uppercase tracking-wider text-sm border-2 border-primary/50 text-primary hover:bg-primary hover:text-primary-foreground transition-all"
                                                            >
                                                                {option.code} — {option.label}
                                                            </Button>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </CardContent>
                                    </Card>
                                </motion.div>
                            )}
                        </>
                    )}

                    {/* Info */}
                    <motion.div variants={item}>
                        <Card className="bg-card border-2 border-border">
                            <CardHeader className="pb-3">
                                <CardTitle className="text-base font-display uppercase tracking-wider text-foreground flex items-center gap-2">
                                    <ShieldCheck className="w-4 h-4 text-primary" /> Why Blockchain?
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <ul className="space-y-3 text-sm text-foreground/90">
                                    <li className="flex items-start gap-2"><Ban className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" /> <span><strong className="text-foreground">1 wallet = 1 vote</strong> — No duplicate voting</span></li>
                                    <li className="flex items-start gap-2"><Lock className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" /> <span><strong className="text-foreground">Immutable</strong> — Votes cannot be changed</span></li>
                                    <li className="flex items-start gap-2"><Eye className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" /> <span><strong className="text-foreground">Transparent</strong> — Anyone can verify on-chain</span></li>
                                    <li className="flex items-start gap-2"><ShieldCheck className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" /> <span><strong className="text-foreground">No admin control</strong> — Smart contract enforces rules</span></li>
                                </ul>
                            </CardContent>
                        </Card>
                    </motion.div>
                </motion.div>
            </main>
        </div >
    );
}
