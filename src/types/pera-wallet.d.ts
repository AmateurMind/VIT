// Type declarations for packages without TypeScript definitions

declare module '@perawallet/connect' {
    export interface PeraWalletConnectOptions {
        shouldShowSignTxnToast?: boolean;
        chainId?: number;
    }

    export interface SignerTransaction {
        txn: import('algosdk').Transaction;
        signers?: string[];
    }

    export class PeraWalletConnect {
        constructor(options?: PeraWalletConnectOptions);

        connector: {
            on(event: 'disconnect', callback: () => void): void;
            off(event: 'disconnect', callback: () => void): void;
        } | null;

        connect(): Promise<string[]>;
        reconnectSession(): Promise<string[]>;
        disconnect(): Promise<void>;
        signTransaction(txGroups: SignerTransaction[][]): Promise<Uint8Array[]>;
    }
}
