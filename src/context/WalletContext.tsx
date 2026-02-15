'use client';

import { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react';
import { PeraWalletConnect } from '@perawallet/connect';
import algosdk from 'algosdk';

interface WalletContextType {
    address: string | null;
    isConnected: boolean;
    isConnecting: boolean;
    connect: () => Promise<void>;
    disconnect: () => void;
    peraWallet: PeraWalletConnect | null;
    isGuestMode: boolean;
    guestSecretKey: Uint8Array | null;
    enableGuestMode: () => void;
}

const WalletContext = createContext<WalletContextType>({
    address: null,
    isConnected: false,
    isConnecting: false,
    connect: async () => { },
    disconnect: () => { },
    peraWallet: null,
    isGuestMode: false,
    guestSecretKey: null,
    enableGuestMode: () => { },
});

export function useWallet() {
    return useContext(WalletContext);
}

export function WalletProvider({ children }: { children: ReactNode }) {
    const [address, setAddress] = useState<string | null>(null);
    const [isConnecting, setIsConnecting] = useState(false);
    const [peraWallet, setPeraWallet] = useState<PeraWalletConnect | null>(null);
    const [isGuestMode, setIsGuestMode] = useState(false);
    const [guestSecretKey, setGuestSecretKey] = useState<Uint8Array | null>(null);

    // Initialize Pera Wallet on client side
    useEffect(() => {
        const wallet = new PeraWalletConnect({
            network: 'testnet',
        } as any);
        setPeraWallet(wallet);

        // Reconnect if session exists
        wallet.reconnectSession().then((accounts: string[]) => {
            if (accounts.length > 0) {
                setAddress(accounts[0]);
                wallet.connector?.on('disconnect', handleDisconnect);
            }
        }).catch(console.error);

    }, []);

    const handleDisconnect = useCallback(() => {
        setAddress(null);
        setIsGuestMode(false);
        setGuestSecretKey(null);
    }, []);

    const enableGuestMode = useCallback(() => {
        const account = algosdk.generateAccount();
        setAddress(account.addr.toString());
        setGuestSecretKey(account.sk);
        setIsGuestMode(true);
    }, []);

    const connect = useCallback(async () => {
        if (!peraWallet) return;

        setIsConnecting(true);
        setIsGuestMode(false);
        setGuestSecretKey(null);

        try {
            const accounts = await peraWallet.connect();
            if (accounts.length > 0) {
                setAddress(accounts[0]);
                peraWallet.connector?.on('disconnect', handleDisconnect);
            }
        } catch (error) {
            console.error('Failed to connect wallet:', error);
        } finally {
            setIsConnecting(false);
        }
    }, [peraWallet, handleDisconnect]);

    const disconnect = useCallback(() => {
        peraWallet?.disconnect();
        setAddress(null);
        setIsGuestMode(false);
        setGuestSecretKey(null);
    }, [peraWallet]);

    return (
        <WalletContext.Provider
            value={{
                address,
                isConnected: !!address,
                isConnecting,
                connect,
                disconnect,
                peraWallet,
                isGuestMode,
                guestSecretKey,
                enableGuestMode,
            }}
        >
            {children}
        </WalletContext.Provider>
    );
}
