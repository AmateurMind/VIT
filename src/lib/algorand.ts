/**
 * Algorand utilities for Campus Trust System
 * Handles wallet connection, transactions, and contract interactions
 */

import algosdk from 'algosdk';

const debugLog = (...args: unknown[]) => console.log('[ALGORAND]', new Date().toISOString(), ...args);

// Algorand TestNet configuration
const ALGOD_SERVER = process.env.NEXT_PUBLIC_ALGOD_SERVER || 'https://testnet-api.algonode.cloud';
const ALGOD_PORT = process.env.NEXT_PUBLIC_ALGOD_PORT || '443';
const ALGOD_TOKEN = process.env.NEXT_PUBLIC_ALGOD_TOKEN || '';
const ATTENDANCE_LOOKBACK_ROUNDS = 300000;

// Helper to decode base64 to string safely in browser/node
function safeDecodeBase64(str: string | Uint8Array): string {
    if (str instanceof Uint8Array) {
        if (typeof TextDecoder !== 'undefined') {
            return new TextDecoder().decode(str);
        }
        if (typeof Buffer !== 'undefined') {
            return Buffer.from(str).toString('utf-8');
        }
        return '';
    }
    if (typeof Buffer !== 'undefined') {
        return Buffer.from(str, 'base64').toString('utf-8');
    }
    if (typeof atob !== 'undefined') {
        return atob(str);
    }
    return '';
}

function safeDecodeNote(note: string | Uint8Array): string {
    if (typeof note === 'string') {
        return safeDecodeBase64(note);
    }
    if (typeof Buffer !== 'undefined') {
        return Buffer.from(note).toString('utf-8');
    }
    if (typeof TextDecoder !== 'undefined') {
        return new TextDecoder().decode(note);
    }
    return '';
}

// Helper to decode base64 to Uint8Array safely
function safeBase64ToUint8Array(str: string | Uint8Array): Uint8Array {
    if (str instanceof Uint8Array) {
        return str;
    }
    if (typeof Buffer !== 'undefined') {
        return new Uint8Array(Buffer.from(str, 'base64'));
    }
    if (typeof atob !== 'undefined') {
        const binary = atob(str);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i);
        }
        return bytes;
    }
    return new Uint8Array(0);
}

export function normalizeSignedTxnBytes(signedTxn: unknown): Uint8Array {
    if (signedTxn instanceof Uint8Array) {
        return signedTxn;
    }

    if (signedTxn instanceof ArrayBuffer) {
        return new Uint8Array(signedTxn);
    }

    if (Array.isArray(signedTxn) && signedTxn.every((item) => typeof item === 'number')) {
        return Uint8Array.from(signedTxn as number[]);
    }

    if (typeof signedTxn === 'string') {
        return safeBase64ToUint8Array(signedTxn);
    }

    if (signedTxn && typeof signedTxn === 'object') {
        const candidate = signedTxn as { blob?: unknown; signedTxn?: unknown };
        if (candidate.blob !== undefined) {
            return normalizeSignedTxnBytes(candidate.blob);
        }
        if (candidate.signedTxn !== undefined) {
            return normalizeSignedTxnBytes(candidate.signedTxn);
        }
    }

    throw new Error('Unsupported signed transaction format from wallet');
}

// Voting App ID (set after deployment)
export const VOTING_APP_ID = Number(process.env.NEXT_PUBLIC_VOTING_APP_ID) || 0;

/**
 * Get Algorand client for TestNet
 */
export function getAlgodClient(): algosdk.Algodv2 {
    debugLog('getAlgodClient', { server: ALGOD_SERVER, port: ALGOD_PORT });
    return new algosdk.Algodv2(ALGOD_TOKEN, ALGOD_SERVER, ALGOD_PORT);
}

/**
 * Get Algorand Indexer client for TestNet
 */
export function getIndexerClient(): algosdk.Indexer {
    debugLog('getIndexerClient', { server: 'https://testnet-idx.algonode.cloud', port: '443' });
    return new algosdk.Indexer('', 'https://testnet-idx.algonode.cloud', '443');
}

export interface CertificateRecord {
    fileName: string;
    hash: string;
    txId: string;
    timestamp: string;
    sender: string;
}

export interface AttendanceRecord {
    sessionId: string;
    timestamp: string;
    txId: string;
    sender: string;
    studentName?: string;
    location?: {
        lat: number;
        long: number;
    };
    locationVerified?: boolean;
    distance?: number; // Calculated on client
}

export interface AttendanceSessionSummary {
    sessionId: string;
    totalTransactions: number;
    presentStudents: number;
    geoVerifiedTransactions: number;
    latestTimestamp: string;
}

async function getRecentMinRound(): Promise<number | undefined> {
    try {
        const client = getAlgodClient();
        const status = await client.status().do();
        const currentRound = status.lastRound || 0;
        if (!currentRound) return undefined;
        return Math.max(1, Number(currentRound) - ATTENDANCE_LOOKBACK_ROUNDS);
    } catch {
        return undefined;
    }
}

/**
 * Fetch stored certificates from the blockchain history
 */
export async function fetchCertificateTransactions(address: string): Promise<CertificateRecord[]> {
    const indexer = getIndexerClient();
    try {
        const response = await indexer.searchForTransactions()
            .address(address)
            .txType('pay') // We used payment txns for storage
            .notePrefix(new TextEncoder().encode('{"type":"CERTIFICATE"')) // Filter by our specific note prefix
            .do();

        const records: CertificateRecord[] = [];

        for (const txn of response.transactions) {
            try {
                if (txn.note) {
                    const noteString = safeDecodeNote(txn.note);
                    const noteData = JSON.parse(noteString);

                    if (noteData.type === 'CERTIFICATE' && noteData.hash) {
                        if (!txn.id || !txn.sender || !txn.roundTime) continue;
                        records.push({
                            fileName: 'Certificate', // Filename isn't stored on-chain to save space/privacy, handled by UI context or generic
                            hash: noteData.hash,
                            txId: txn.id,
                            timestamp: new Date(txn.roundTime * 1000).toISOString(),
                            sender: txn.sender
                        });
                    }
                }
            } catch {
                // Skip malformed notes
            }
        }
        return records;
    } catch (error) {
        console.error('Error fetching certificates:', error);
        return [];
    }
}

/**
 * Fetch attendance for a specific session ID
 */
export async function fetchAttendanceForSession(sessionId: string): Promise<AttendanceRecord[]> {
    const indexer = getIndexerClient();
    try {
        const sessionPrefix = `{"type":"ATTENDANCE","sessionId":"${sessionId}"`;
        const minRound = await getRecentMinRound();

        let query = indexer.searchForTransactions()
            .txType('pay')
            .notePrefix(new TextEncoder().encode(sessionPrefix))
            .limit(200);

        if (minRound) {
            query = query.minRound(minRound);
        }

        const response = await query.do();

        const records: AttendanceRecord[] = [];

        for (const txn of response.transactions) {
            try {
                if (txn.note) {
                    const noteString = safeDecodeNote(txn.note);
                    const noteData = JSON.parse(noteString);

                    if (noteData.type === 'ATTENDANCE' && noteData.sessionId === sessionId) {
                        if (!txn.id || !txn.sender || !txn.roundTime) continue;
                        const hasGeoProof = Boolean(
                            noteData.locationHash ||
                            noteData.locationCell ||
                            (noteData.lat && noteData.long)
                        );

                        records.push({
                            sessionId: noteData.sessionId,
                            timestamp: new Date(txn.roundTime * 1000).toISOString(),
                            txId: txn.id,
                            sender: txn.sender,
                            studentName: noteData.name || 'Anonymous',
                            locationVerified: hasGeoProof,
                            location: noteData.lat && noteData.long ? {
                                lat: noteData.lat,
                                long: noteData.long
                            } : undefined
                        });
                    }
                }
            } catch {
                // Skip
            }
        }
        return records;
    } catch (error) {
        console.error('Error fetching attendance:', error);
        return [];
    }
}

/**
 * Fetch all attendance sessions and basic counts.
 */
export async function fetchAttendanceSessionsSummary(): Promise<AttendanceSessionSummary[]> {
    const indexer = getIndexerClient();
    try {
        const minRound = await getRecentMinRound();

        let query = indexer.searchForTransactions()
            .txType('pay')
            .notePrefix(new TextEncoder().encode('{"type":"ATTENDANCE"'))
            .limit(300);

        if (minRound) {
            query = query.minRound(minRound);
        }

        const response = await query.do();

        const bySession = new Map<string, { txns: number; geoTxns: number; students: Set<string>; latest: number }>();

        for (const txn of response.transactions) {
            try {
                if (!txn.note) continue;
                const noteString = safeDecodeNote(txn.note);
                const noteData = JSON.parse(noteString);

                if (noteData.type !== 'ATTENDANCE' || !noteData.sessionId) continue;

                const current = bySession.get(noteData.sessionId) ?? { txns: 0, geoTxns: 0, students: new Set<string>(), latest: 0 };
                current.txns += 1;
                if (noteData.locationHash || noteData.locationCell || (noteData.lat && noteData.long)) {
                    current.geoTxns += 1;
                }

                const studentKey = (noteData.name || txn.sender || '').toString();
                if (studentKey) current.students.add(studentKey);

                const roundTime = (txn.roundTime || 0) * 1000;
                if (roundTime > current.latest) current.latest = roundTime;

                bySession.set(noteData.sessionId, current);
            } catch {
                // Ignore malformed notes
            }
        }

        return Array.from(bySession.entries())
            .map(([sessionId, value]) => ({
                sessionId,
                totalTransactions: value.txns,
                presentStudents: value.students.size,
                geoVerifiedTransactions: value.geoTxns,
                latestTimestamp: new Date(value.latest || Date.now()).toISOString(),
            }))
            .sort((a, b) => new Date(b.latestTimestamp).getTime() - new Date(a.latestTimestamp).getTime());
    } catch (error) {
        console.error('Error fetching attendance sessions summary:', error);
        return [];
    }
}

/**
 * Get suggested transaction parameters
 */
export async function getSuggestedParams(): Promise<algosdk.SuggestedParams> {
    debugLog('getSuggestedParams:start');
    const client = getAlgodClient();
    const params = await client.getTransactionParams().do();
    debugLog('getSuggestedParams:success', {
        fee: params.fee,
        // firstValid/lastValid might be missing in some SDK versions' type definitions
    });
    return params;
}

/**
 * Read global state from the voting app
 */
export async function getVotingState(appId: number): Promise<{
    isOpen: boolean;
    option0: number;
    option1: number;
    creator: string;
}> {
    debugLog('getVotingState:start', { appId });
    const client = getAlgodClient();
    const appInfo = await client.getApplicationByID(appId).do();

    const globalState = appInfo.params.globalState || [];

    let isOpen = false;
    let option0 = 0;
    let option1 = 0;
    let creator = '';

    for (const state of globalState) {
        const key = safeDecodeBase64(state.key);
        const value = state.value;

        switch (key) {
            case 'is_open':
                isOpen = Number(value.uint || 0) === 1;
                break;
            case 'option_0':
                option0 = Number(value.uint || 0);
                break;
            case 'option_1':
                option1 = Number(value.uint || 0);
                break;
            case 'creator':
                creator = algosdk.encodeAddress(safeBase64ToUint8Array(value.bytes));
                break;
        }
    }

    const state = { isOpen, option0, option1, creator };
    debugLog('getVotingState:success', state);
    return state;
}

/**
 * Check if user has already voted
 */
export async function hasUserVoted(appId: number, address: string): Promise<boolean> {
    const client = getAlgodClient();

    try {
        const accountInfo = await client.accountApplicationInformation(address, appId).do();
        const localState = accountInfo.appLocalState?.keyValue || [];

        for (const state of localState) {
            const key = safeDecodeBase64(state.key);
            if (key === 'has_voted' && Number(state.value.uint || 0) === 1) {
                return true;
            }
        }
    } catch {
        // User hasn't opted in yet
        return false;
    }

    return false;
}

/**
 * Check if user has opted into the app
 */
export async function hasOptedIn(appId: number, address: string): Promise<boolean> {
    const client = getAlgodClient();

    try {
        await client.accountApplicationInformation(address, appId).do();
        return true;
    } catch {
        return false;
    }
}

/**
 * Read both opt-in and vote status without hitting the accountApplicationInformation 404 path.
 */
export async function getVotingParticipationStatus(
    appId: number,
    address: string
): Promise<{ optedIn: boolean; hasVoted: boolean }> {
    debugLog('getVotingParticipationStatus:start', { appId, address });
    const client = getAlgodClient();
    const accountInfo = await client.accountInformation(address).do();
    const localApps = accountInfo.appsLocalState || [];
    debugLog('getVotingParticipationStatus:apps-local-state-count', { count: localApps.length });
    const appLocal = localApps.find((app: any) => Number(app.id) === appId);

    if (!appLocal) {
        debugLog('getVotingParticipationStatus:not-opted-in', { appId, address });
        return { optedIn: false, hasVoted: false };
    }

    const keyValues = appLocal.keyValue || [];
    let voted = false;

    for (const state of keyValues) {
        const key = safeDecodeBase64(state.key);
        if (key === 'has_voted' && Number(state.value?.uint || 0) === 1) {
            voted = true;
            break;
        }
    }

    const result = { optedIn: true, hasVoted: voted };
    debugLog('getVotingParticipationStatus:success', result);
    return result;
}

/**
 * Create opt-in transaction
 */
export function createOptInTxn(
    sender: string,
    appId: number,
    suggestedParams: algosdk.SuggestedParams
): algosdk.Transaction {
    if (!sender) {
        throw new Error('createOptInTxn: sender address is missing or invalid');
    }
    // algosdk v3 object constructors require `sender` (not `from`)
    return algosdk.makeApplicationCallTxnFromObject({
        sender,
        appIndex: appId,
        onComplete: algosdk.OnApplicationComplete.OptInOC,
        suggestedParams,
    } as any);
}

/**
 * Create vote transaction
 * @param choice - 0 or 1 for the two voting options
 */
export function createVoteTxn(
    sender: string,
    appId: number,
    choice: number,
    suggestedParams: algosdk.SuggestedParams
): algosdk.Transaction {
    if (!sender) {
        throw new Error('createVoteTxn: sender address is missing or invalid');
    }
    const appArgs = [
        new TextEncoder().encode('vote'),
        algosdk.encodeUint64(choice),
    ];

    return algosdk.makeApplicationCallTxnFromObject({
        sender,
        appIndex: appId,
        onComplete: algosdk.OnApplicationComplete.NoOpOC,
        appArgs,
        suggestedParams,
    } as any);
}

/**
 * Create a transaction to store a hash (for attendance/certificates)
 */
export function createHashStoreTxn(
    sender: string,
    hash: string,
    noteObject: Record<string, unknown>,
    suggestedParams: algosdk.SuggestedParams
): algosdk.Transaction {
    console.log('createHashStoreTxn: sender', sender, typeof sender);
    if (typeof sender !== 'string' || !sender) {
        throw new Error(`createHashStoreTxn: sender address is missing or invalid. Got: ${JSON.stringify(sender)}`);
    }
    // Use a simple payment transaction with note for storing hash
    // This is cheaper than app calls for simple proof storage
    // Ensure the note contains the hash and the type
    // Ensure the note contains the hash and the type
    const noteData = { ...noteObject, hash };

    return algosdk.makePaymentTxnWithSuggestedParamsFromObject({
        sender,
        receiver: sender, // Self-transfer (0 ALGO)
        amount: 0,
        note: new TextEncoder().encode(JSON.stringify(noteData)),
        suggestedParams,
    } as any);
}

/**
 * Generate SHA-256 hash of a file
 */
export async function hashFile(file: File): Promise<string> {
    const buffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Get Algorand Explorer URL for a transaction
 */
export function getExplorerUrl(txId: string): string {
    return `https://testnet.explorer.perawallet.app/tx/${txId}`;
}

/**
 * Get Algorand Explorer URL for an application
 */
export function getAppExplorerUrl(appId: number): string {
    return `https://testnet.explorer.perawallet.app/application/${appId}`;
}
