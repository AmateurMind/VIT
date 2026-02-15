'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ShieldCheck, Wallet, LogOut, Zap } from 'lucide-react';
import { useWallet } from '@/context/WalletContext';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { cn } from '@/lib/utils';
import { useState } from 'react';

export default function Navbar() {
    const pathname = usePathname();
    const { address, isConnected, isConnecting, connect, disconnect } = useWallet();
    const [isLoggingOut, setIsLoggingOut] = useState(false);

    const navLinks = [
        { href: '/vote', label: 'Vote' },
        { href: '/attendance', label: 'Attend' },
        { href: '/certificate', label: 'Certs' },
        { href: '/share', label: 'Share' },
    ];

    const handleLogout = () => {
        if (isLoggingOut) return;

        if (isConnected) {
            // Wallet is connected — disconnect it
            setIsLoggingOut(true);
            setTimeout(() => {
                disconnect();
                setIsLoggingOut(false);
            }, 600);
        } else {
            // No wallet connected — prompt to connect first
            alert('No wallet connected. Please connect your wallet first.');
        }
    };

    return (
        <header className="flex justify-between items-center py-4 px-6 md:px-12 border-b border-border/50 bg-background/80 backdrop-blur-md sticky top-0 z-50">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-3 group">
                <div className="w-8 h-8 border-2 border-primary flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                    <ShieldCheck className="w-5 h-5 text-primary" />
                </div>
                <span className="font-display text-lg tracking-[0.2em] text-primary font-bold uppercase">
                    Strotas
                </span>
            </Link>

            {/* Desktop Nav */}
            <nav className="hidden md:flex items-center gap-8 text-sm text-muted-foreground font-medium uppercase tracking-wider">
                {navLinks.map((link) => (
                    <Link
                        key={link.href}
                        href={link.href}
                        className={cn(
                            "hover:text-primary transition-colors relative",
                            pathname.startsWith(link.href) ? "text-primary font-bold after:absolute after:-bottom-1 after:left-0 after:w-full after:h-0.5 after:bg-primary" : ""
                        )}
                    >
                        {link.label}
                    </Link>
                ))}
            </nav>

            {/* Actions: Theme Toggle + Connect/Address + Logout */}
            <div className="flex items-center gap-4">
                <ThemeToggle fixedPosition={false} className="hidden sm:flex" />

                {isConnected ? (
                    /* Connected: Show wallet address */
                    <div className="flex items-center gap-3 border border-primary/30 px-4 py-1.5 bg-background/50">
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                        <span className="text-xs font-mono text-primary hidden sm:inline-block">
                            {address?.slice(0, 6)}...{address?.slice(-4)}
                        </span>
                    </div>
                ) : (
                    /* Not connected: Show connect button */
                    <Button
                        onClick={connect}
                        disabled={isConnecting}
                        size="sm"
                        className="font-display uppercase tracking-wider text-xs border-2 border-primary bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-5"
                    >
                        {isConnecting ? '...' : 'Connect'}
                        <Wallet className="w-3.5 h-3.5 ml-2" />
                    </Button>
                )}

                {/* Logout Button — Always visible, matches Connect style */}
                <button
                    onClick={handleLogout}
                    className={cn(
                        "logout-btn flex items-center gap-2 h-9 px-5 rounded-sm border-2 border-primary bg-primary text-primary-foreground font-display text-xs uppercase tracking-wider font-bold hover:bg-primary/90",
                        isLoggingOut && "logging-out"
                    )}
                    title={isConnected ? "Disconnect Wallet & Logout" : "No wallet connected"}
                >
                    <span className="btn-shine" />
                    <span>{isLoggingOut ? 'Bye!' : 'Logout'}</span>
                    <LogOut className="w-3.5 h-3.5 ml-1 logout-icon" />
                </button>
            </div>
        </header>
    );
}
