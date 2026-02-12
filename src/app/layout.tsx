import './globals.css';
import type { ReactNode } from 'react';
import type { Metadata } from 'next';
import { Orbitron, Rajdhani } from 'next/font/google';
import { WalletProvider } from '@/context/WalletContext';
import { cn } from '@/lib/utils';

const orbitron = Orbitron({
  subsets: ['latin'],
  variable: '--font-orbitron',
  display: 'swap',
});

const rajdhani = Rajdhani({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-rajdhani',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'STROTAS | Campus Trust System',
  description: 'Decentralized Voting & Verification System.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className="dark">
      <body className={cn(
        "min-h-screen bg-background font-sans antialiased",
        orbitron.variable,
        rajdhani.variable
      )}>
        <WalletProvider>
          {children}
        </WalletProvider>
      </body>
    </html>
  );
}
