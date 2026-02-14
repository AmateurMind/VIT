import './globals.css';
import type { ReactNode } from 'react';
import type { Metadata } from 'next';
import { Orbitron, Rajdhani } from 'next/font/google';
import { WalletProvider } from '@/context/WalletContext';
import { cn } from '@/lib/utils';
import CampusAI from '@/components/CampusAI';
import { SpeedInsights } from '@vercel/speed-insights/next';
import Navbar from '@/components/Navbar';
import MobileBottomBar from '@/components/MobileBottomBar';

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

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};


export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={cn(
        "min-h-screen bg-background font-sans antialiased",
        orbitron.variable,
        rajdhani.variable
      )}>
        <WalletProvider>
          <Navbar />
          <main className="pb-20 md:pb-0">
            {children}
          </main>
          <MobileBottomBar />
          <CampusAI />
          <SpeedInsights />
        </WalletProvider>
      </body>
    </html>
  );
}
