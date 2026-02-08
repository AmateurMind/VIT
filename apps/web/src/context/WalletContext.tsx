'use client';

import { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react';
import { PeraWalletConnect } from '@perawallet/connect';

interface WalletContextType {
    address: string | null;
    isConnected: boolean;
    isConnecting: boolean;
    connect: () => Promise<void>;
    disconnect: () => void;
    peraWallet: PeraWalletConnect | null;
}

const WalletContext = createContext<WalletContextType>({
    address: null,
    isConnected: false,
    isConnecting: false,
    connect: async () => { },
    disconnect: () => { },
    peraWallet: null,
});

export function useWallet() {
    return useContext(WalletContext);
}

export function WalletProvider({ children }: { children: ReactNode }) {
    const [address, setAddress] = useState<string | null>(null);
    const [isConnecting, setIsConnecting] = useState(false);
    const [peraWallet, setPeraWallet] = useState<PeraWalletConnect | null>(null);

    // Initialize Pera Wallet on client side
    useEffect(() => {
        const wallet = new PeraWalletConnect();
        setPeraWallet(wallet);

        // Reconnect if session exists
        wallet.reconnectSession().then((accounts: string[]) => {
            if (accounts.length > 0) {
                setAddress(accounts[0]);
                wallet.connector?.on('disconnect', handleDisconnect);
            }
        }).catch(console.error);

        return () => {
            wallet.disconnect();
        };
    }, []);

    const handleDisconnect = useCallback(() => {
        setAddress(null);
    }, []);

    const connect = useCallback(async () => {
        if (!peraWallet) return;

        setIsConnecting(true);
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
            }}
        >
            {children}
        </WalletContext.Provider>
    );
}
