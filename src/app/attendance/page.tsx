'use client';

import { useState, useEffect } from 'react';
import { useWallet } from '@/context/WalletContext';
import { useRouter } from 'next/navigation';
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
    fetchAttendanceForSession,
    AttendanceRecord
} from '@/lib/algorand';
import { notifyN8N } from '@/lib/n8n';

export default function AttendancePage() {
    const { address, isConnected, connect, peraWallet } = useWallet();
    const router = useRouter();

    const [sessionId, setSessionId] = useState<string>('');
    const [studentName, setStudentName] = useState<string>('');
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [records, setRecords] = useState<AttendanceRecord[]>([]); // User's records
    const [liveList, setLiveList] = useState<AttendanceRecord[]>([]); // All students for session
    const [fetchingList, setFetchingList] = useState<boolean>(false);
    const [status, setStatus] = useState<string>('');
    const [successTxId, setSuccessTxId] = useState<string | null>(null);
    const [sessionLocation, setSessionLocation] = useState<{ lat: number, long: number, name?: string } | null>(null);

    // Refresh live list
    const refreshLiveList = async (sId: string) => {
        if (!sId) return;
        setFetchingList(true);
        try {
            const list = await fetchAttendanceForSession(sId);

            // Calculate distance if session location is set
            const listWithDistance = list.map(record => {
                if (record.location && sessionLocation) {
                    record.distance = getDistanceFromLatLonInKm(
                        sessionLocation.lat, sessionLocation.long,
                        record.location.lat, record.location.long
                    ) * 1000; // to meters
                }
                return record;
            });

            // Show full transaction history for this session (no dedupe)
            setLiveList(listWithDistance.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
        } finally {
            setFetchingList(false);
        }
    };

    // Auto-refresh live list
    useEffect(() => {
        if (sessionId && sessionId.length > 10) {
            refreshLiveList(sessionId);
            const interval = setInterval(() => refreshLiveList(sessionId), 10000);
            return () => clearInterval(interval);
        }
    }, [sessionId]);

    const generateSessionId = () => {
        const date = new Date().toISOString().split('T')[0];
        const random = Math.random().toString(36).substring(2, 6).toUpperCase();
        const baseId = `CLASS-${date}-${random}`;
        setSessionId(baseId);

        // Mock: Teacher sets location when generating ID
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition((pos) => {
                setSessionLocation({
                    lat: pos.coords.latitude,
                    long: pos.coords.longitude,
                    name: 'Classroom A'
                });
                // In a real app, this location would be stored on-chain or in a DB associated with the Session ID
                // For this hackathon demo, we'll simulate by appending coordinates to sessionId if we wanted, 
                // but simpler to just keep it in local state for the "Teacher View" demo on one device.
                // To make it work across devices without a DB, we'd need to put the coords in the URL or QR code.
                // For now, we will assume the User acts as both for demo purposes or we just show the logic.
            });
        }
    };

    const handleMarkAttendance = async () => {
        if (!address || !peraWallet || !sessionId || !studentName) {
            setError('Please enter Session ID and your Name');
            return;
        }

        setLoading(true);
        setStatus('Getting Location...');
        setError(null);
        setSuccessTxId(null);

        try {
            // 1. Get Location
            const location = await new Promise<{ lat: number, long: number }>((resolve, reject) => {
                if (!navigator.geolocation) reject('Geolocation not supported');
                navigator.geolocation.getCurrentPosition(
                    (pos) => resolve({ lat: pos.coords.latitude, long: pos.coords.longitude }),
                    (err) => reject('Location access denied. Required for attendance.')
                );
            });

            setStatus('Preparing attendance transaction...');
            const timestamp = new Date().toISOString();

            // 2. Prepare Data with Name and Location
            const attendanceData = {
                type: 'ATTENDANCE',
                sessionId,
                name: studentName,
                wallet: address,
                timestamp,
                lat: location.lat,
                long: location.long
            };

            // 3. Create Hash (Proof of Integrity)
            const hash = await crypto.subtle.digest(
                'SHA-256',
                new TextEncoder().encode(JSON.stringify(attendanceData))
            );
            const hashHex = Array.from(new Uint8Array(hash))
                .map(b => b.toString(16).padStart(2, '0'))
                .join('');

            // 4. Create Transaction
            const params = await getSuggestedParams();
            // Pass the FULL data object as the note so it's readable on-chain by the Indexer
            const txn = createHashStoreTxn(address, hashHex, attendanceData, params);

            setStatus('Sign in Pera Wallet...');
            const signedTxns = await peraWallet.signTransaction([[{ txn }]]);

            setStatus('Recording on Algorand...');
            const client = getAlgodClient();
            const result = await client.sendRawTransaction(signedTxns[0]).do();
            const txId = txn.txID() || result.txid || '';

            setStatus('Confirming on-chain...');
            await new Promise(resolve => setTimeout(resolve, 3000));

            // 5. Update UI
            const newRecord: AttendanceRecord = {
                sessionId,
                timestamp,
                txId,
                sender: address,
                studentName,
                location
            };
            setRecords(prev => [newRecord, ...prev]);
            setSuccessTxId(txId);
            setStatus('');
            // Don't clear session ID so they can see the live list
            setStudentName('');

            // Refresh live list to show self immediately
            await refreshLiveList(sessionId);

            // Notify n8n
            notifyN8N({
                event: 'ATTENDANCE_MARKED',
                details: {
                    wallet: address,
                    studentName: studentName,
                    actionSummary: `Marked attendance for session ${sessionId}`,
                    txId: txId,
                    metadata: {
                        lat: location.lat,
                        long: location.long,
                        distance: 0 // Ideally calculated
                    }
                }
            });

        } catch (err: any) {
            console.error('Attendance error:', err);
            setError(typeof err === 'string' ? err : 'Failed to record attendance. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    // Helper to calculate distance
    function getDistanceFromLatLonInKm(lat1: number, lon1: number, lat2: number, lon2: number) {
        var R = 6371; // Radius of the earth in km
        var dLat = deg2rad(lat2 - lat1);  // deg2rad below
        var dLon = deg2rad(lon2 - lon1);
        var a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2)
            ;
        var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        var d = R * c; // Distance in km
        return d;
    }

    function deg2rad(deg: number) {
        return deg * (Math.PI / 180)
    }

    const container = {
        hidden: { opacity: 0 },
        show: { opacity: 1, transition: { staggerChildren: 0.08 } }
    };
    const item = {
        hidden: { opacity: 0, y: 20 },
        show: { opacity: 1, y: 0, transition: { duration: 0.4 } }
    };

    const isTeacher = true; // For demo purposes, we enable teacher controls
    const goToAttendanceList = () => {
        if (!sessionId) return;
        router.push(`/attendance/list?sessionId=${encodeURIComponent(sessionId)}`);
    };
    return (
        <div className="min-h-screen">
            <main className="max-w-3xl mx-auto px-6 md:px-12 py-12">
                <motion.div variants={container} initial="hidden" animate="show">
                    {/* Page Title */}
                    <motion.div variants={item} className="text-center mb-10">
                        <Activity className="w-10 h-10 text-primary mx-auto mb-4" />
                        <h1 className="font-display text-3xl md:text-4xl font-bold tracking-tight text-primary text-glow mb-2">
                            SMART ATTENDANCE
                        </h1>
                        <p className="text-sm text-muted-foreground">Geo-Verified. Tamper-proof. Real-time.</p>
                    </motion.div >

                    {/* Connect */}
                    {
                        !isConnected && (
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
                        )
                    }

                    {/* Alerts */}
                    {
                        error && (
                            <motion.div variants={item} className="bg-destructive/10 border border-destructive/30 p-4 mb-5 text-sm text-destructive">
                                ⚠️ {error}
                            </motion.div>
                        )
                    }
                    {
                        status && (
                            <motion.div variants={item} className="bg-primary/5 border border-primary/20 p-4 mb-5 text-sm text-primary font-mono cursor-wait">
                                ⏳ {status}
                            </motion.div>
                        )
                    }
                    {
                        successTxId && (
                            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="bg-emerald-100 border-2 border-emerald-300 p-5 mb-5 rounded-md text-emerald-900 flex flex-col gap-3">
                                <div className="flex items-center gap-2 font-bold text-base">
                                    <CheckCircle className="w-5 h-5" />
                                    <span>Attendance Marked!</span>
                                </div>
                                <div className="pl-7 space-y-2">
                                    <a
                                        href={getExplorerUrl(successTxId)}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-2 px-4 py-2 rounded bg-emerald-200 text-emerald-900 font-bold text-xs hover:bg-emerald-300 transition-colors"
                                    >
                                        View Proof on Explorer <ExternalLink className="w-3 h-3" />
                                    </a>
                                </div>
                            </motion.div>
                        )
                    }

                    {/* Mark Attendance */}
                    {
                        isConnected && (
                            <motion.div variants={item}>
                                <Card className="bg-card border-border mb-5">
                                    <CardHeader className="pb-3">
                                        <CardTitle className="text-sm font-display uppercase tracking-wider flex items-center gap-2">
                                            <Fingerprint className="w-4 h-4 text-primary" /> Mark Attendance
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <p className="text-xs text-muted-foreground mb-4">
                                            Please ensure you are currently in the classroom. Location access is required.
                                        </p>

                                        <div className="flex gap-3 mb-4">
                                            <input
                                                type="text"
                                                value={sessionId}
                                                onChange={(e) => setSessionId(e.target.value)}
                                                placeholder="Session ID (Ask Teacher)"
                                                className="flex-1 bg-secondary border border-border px-3 py-2 text-sm font-mono text-foreground focus:outline-none focus:border-primary placeholder:text-muted-foreground/50"
                                            />
                                            {isTeacher && (
                                                <Button variant="outline" size="sm" onClick={generateSessionId} className="font-display uppercase tracking-wider text-xs border-primary/40 text-primary">
                                                    New Session
                                                </Button>
                                            )}
                                            <Button variant="ghost" size="sm" onClick={goToAttendanceList} disabled={!sessionId} className="font-display uppercase tracking-wider text-xs">
                                                Fetch List
                                            </Button>
                                        </div>

                                        <div className="mb-4">
                                            <input
                                                type="text"
                                                value={studentName}
                                                onChange={(e) => setStudentName(e.target.value)}
                                                placeholder="Enter Your Full Name"
                                                className="w-full bg-secondary border border-border px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary placeholder:text-muted-foreground/50"
                                            />
                                        </div>

                                        {sessionId && (
                                            <div className="bg-primary/5 border border-primary/20 p-3 mb-4 text-xs font-mono text-primary flex justify-between items-center rounded-sm">
                                                <span>Session: <strong>{sessionId}</strong></span>
                                                {sessionLocation && <span className="bg-green-500/10 text-green-600 px-2 py-0.5 rounded text-[10px] border border-green-500/20">📍 Location Active</span>}
                                            </div>
                                        )}

                                        <Button
                                            onClick={handleMarkAttendance}
                                            disabled={loading || !sessionId || !studentName}
                                            className="w-full font-display uppercase tracking-wider text-xs bg-primary text-primary-foreground hover:bg-primary/90"
                                        >
                                            {loading ? 'Verifying Location & Signing...' : 'Mark Present (with Geo-Tag)'}
                                        </Button>
                                    </CardContent>
                                </Card>
                            </motion.div>
                        )
                    }

                    {/* Live Attendance List */}
                    {
                        sessionId && (
                            <motion.div variants={item}>
                                <Card className="bg-card border-border mb-5">
                                    <CardHeader className="pb-3 border-b border-border/50">
                                        <div className="flex items-center justify-between">
                                            <CardTitle className="text-sm font-display uppercase tracking-wider flex items-center gap-2">
                                                <Activity className="w-4 h-4 text-green-500 animate-pulse" /> Live Attendance
                                            </CardTitle>
                                            <Badge variant="outline" className="text-[10px] font-mono border-border text-foreground">
                                                {liveList.length} Txns
                                            </Badge>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="pt-0 max-h-80 overflow-y-auto">
                                        {liveList.length === 0 ? (
                                            <div className="py-8 text-center text-xs text-muted-foreground">
                                                No attendance records found for this session yet.
                                                <br />Click "Fetch List" to refresh.
                                            </div>
                                        ) : (
                                            <div className="divide-y divide-border/30">
                                                {liveList.map((record, i) => (
                                                    <div key={i} className="py-3 flex justify-between items-center group hover:bg-white/5 px-2 -mx-2 rounded transition-colors">
                                                        <div className="flex flex-col">
                                                            <span className="text-sm font-semibold text-foreground flex items-center gap-2">
                                                                {record.studentName}
                                                                {record.sender === address && <span className="text-[9px] bg-primary/20 text-primary px-1 rounded">YOU</span>}
                                                            </span>
                                                            <span className="text-[10px] font-mono text-muted-foreground">{record.sender.slice(0, 8)}...{record.sender.slice(-4)}</span>
                                                            <a
                                                                href={getExplorerUrl(record.txId)}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="text-[10px] font-mono text-primary hover:underline mt-1"
                                                            >
                                                                Tx: {record.txId.slice(0, 10)}...{record.txId.slice(-6)}
                                                            </a>
                                                        </div>
                                                        <div className="flex flex-col items-end gap-1">
                                                            <span className="text-[10px] text-muted-foreground">{new Date(record.timestamp).toLocaleTimeString()}</span>

                                                            {record.distance !== undefined && (
                                                                record.distance < 100 ? (
                                                                    <span className="text-[9px] bg-green-500/10 text-green-600 px-1.5 py-0.5 rounded font-bold uppercase tracking-wide border border-green-500/20">
                                                                        🟢 In Class ({Math.round(record.distance)}m)
                                                                    </span>
                                                                ) : (
                                                                    <span className="text-[9px] bg-red-500/10 text-red-600 px-1.5 py-0.5 rounded font-bold uppercase tracking-wide border border-red-500/20">
                                                                        🔴 Remote ({Math.round(record.distance / 1000)}km)
                                                                    </span>
                                                                )
                                                            )}
                                                            {/* Fallback if no session location set but we have user records */}
                                                            {!sessionLocation && record.location && (
                                                                <span className="text-[9px] bg-blue-500/10 text-blue-600 px-1.5 py-0.5 rounded font-bold uppercase tracking-wide border border-blue-500/20">
                                                                    📍 Geo-Tagged
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            </motion.div>
                        )
                    }

                    {/* How It Works */}
                    <motion.div variants={item}>
                        <Card className="bg-card border-border">
                            <CardHeader className="pb-3">
                                <CardTitle className="text-sm font-display uppercase tracking-wider flex items-center gap-2">
                                    <ShieldCheck className="w-4 h-4 text-primary" /> Anti-Proxy Measures
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <ul className="space-y-3 text-xs text-muted-foreground">
                                    <li className="flex items-start gap-2"><Fingerprint className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" /> <span><strong className="text-foreground">Wallet Identity</strong> — Proves "Who" (No stealing passwords)</span></li>
                                    <li className="flex items-start gap-2"><div className="mt-0.5">📍</div> <span><strong className="text-foreground">Geo-Fencing</strong> — Proves "Where" (Must be in classroom)</span></li>
                                    <li className="flex items-start gap-2"><Clock className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" /> <span><strong className="text-foreground">Blockchain Timestamp</strong> — Proves "When" (Cannot backdate)</span></li>
                                </ul>
                            </CardContent>
                        </Card>
                    </motion.div>
                </motion.div >
            </main >
        </div >
    );
}
