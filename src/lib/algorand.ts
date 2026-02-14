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
    distance?: number; // Calculated on client
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
                    const noteBuffer = Buffer.from(txn.note, 'base64');
                    const noteString = noteBuffer.toString('utf-8');
                    const noteData = JSON.parse(noteString);

                    if (noteData.type === 'CERTIFICATE' && noteData.hash) {
                        records.push({
                            fileName: 'Certificate', // Filename isn't stored on-chain to save space/privacy, handled by UI context or generic
                            hash: noteData.hash,
                            txId: txn.id,
                            timestamp: new Date(txn['round-time'] * 1000).toISOString(),
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
        const response = await indexer.searchForTransactions()
            .txType('pay')
            .notePrefix(new TextEncoder().encode('{"type":"ATTENDANCE"'))
            .limit(100)
            .do();

        const records: AttendanceRecord[] = [];

        for (const txn of response.transactions) {
            try {
                if (txn.note) {
                    const noteBuffer = Buffer.from(txn.note, 'base64');
                    const noteString = noteBuffer.toString('utf-8');
                    const noteData = JSON.parse(noteString);

                    if (noteData.type === 'ATTENDANCE' && noteData.sessionId === sessionId) {
                        records.push({
                            sessionId: noteData.sessionId,
                            timestamp: new Date(txn['round-time'] * 1000).toISOString(),
                            txId: txn.id,
                            sender: txn.sender,
                            studentName: noteData.name || 'Anonymous',
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
 * Get suggested transaction parameters
 */
export async function getSuggestedParams(): Promise<algosdk.SuggestedParams> {
    debugLog('getSuggestedParams:start');
    const client = getAlgodClient();
    const params = await client.getTransactionParams().do();
    debugLog('getSuggestedParams:success', {
        fee: params.fee,
        firstRound: params.firstRound,
        lastRound: params.lastRound,
        genesisId: params.genesisID,
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

    const globalState = appInfo.params['global-state'] || [];

    let isOpen = false;
    let option0 = 0;
    let option1 = 0;
    let creator = '';

    for (const state of globalState) {
        const key = Buffer.from(state.key, 'base64').toString();
        const value = state.value;

        switch (key) {
            case 'is_open':
                isOpen = value.uint === 1;
                break;
            case 'option_0':
                option0 = value.uint || 0;
                break;
            case 'option_1':
                option1 = value.uint || 0;
                break;
            case 'creator':
                creator = algosdk.encodeAddress(Buffer.from(value.bytes, 'base64'));
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
        const localState = accountInfo['app-local-state']?.['key-value'] || [];

        for (const state of localState) {
            const key = Buffer.from(state.key, 'base64').toString();
            if (key === 'has_voted' && state.value.uint === 1) {
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
    const localApps = accountInfo['apps-local-state'] || [];
    debugLog('getVotingParticipationStatus:apps-local-state-count', { count: localApps.length });
    const appLocal = localApps.find((app: { id: number }) => app.id === appId);

    if (!appLocal) {
        debugLog('getVotingParticipationStatus:not-opted-in', { appId, address });
        return { optedIn: false, hasVoted: false };
    }

    const keyValues = appLocal['key-value'] || [];
    let voted = false;

    for (const state of keyValues) {
        const key = Buffer.from(state.key, 'base64').toString();
        if (key === 'has_voted' && state.value?.uint === 1) {
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
    return algosdk.makeApplicationOptInTxn(sender, suggestedParams, appId);
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
    const appArgs = [
        new TextEncoder().encode('vote'),
        algosdk.encodeUint64(choice),
    ];

    return algosdk.makeApplicationCallTxnFromObject({
        from: sender,
        appIndex: appId,
        onComplete: algosdk.OnApplicationComplete.NoOpOC,
        appArgs,
        suggestedParams,
    });
}

/**
 * Create a transaction to store a hash (for attendance/certificates)
 */
export function createHashStoreTxn(
    sender: string,
    hash: string,
    noteObject: any,
    suggestedParams: algosdk.SuggestedParams
): algosdk.Transaction {
    // Use a simple payment transaction with note for storing hash
    // This is cheaper than app calls for simple proof storage
    // Ensure the note contains the hash and the type
    const note = { ...noteObject, hash };

    return algosdk.makePaymentTxnWithSuggestedParamsFromObject({
        from: sender,
        to: sender, // Self-transfer (0 ALGO)
        amount: 0,
        note: new TextEncoder().encode(JSON.stringify(note)),
        suggestedParams,
    });
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
