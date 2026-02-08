/**
 * Algorand utilities for Campus Trust System
 * Handles wallet connection, transactions, and contract interactions
 */

import algosdk from 'algosdk';

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
    return new algosdk.Algodv2(ALGOD_TOKEN, ALGOD_SERVER, ALGOD_PORT);
}

/**
 * Get suggested transaction parameters
 */
export async function getSuggestedParams(): Promise<algosdk.SuggestedParams> {
    const client = getAlgodClient();
    return await client.getTransactionParams().do();
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

    return { isOpen, option0, option1, creator };
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
    note: string,
    suggestedParams: algosdk.SuggestedParams
): algosdk.Transaction {
    // Use a simple payment transaction with note for storing hash
    // This is cheaper than app calls for simple proof storage
    return algosdk.makePaymentTxnWithSuggestedParamsFromObject({
        from: sender,
        to: sender, // Self-transfer (0 ALGO)
        amount: 0,
        note: new TextEncoder().encode(JSON.stringify({ type: note, hash })),
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
