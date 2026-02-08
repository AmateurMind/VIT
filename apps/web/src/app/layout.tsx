import './globals.css';
import type { ReactNode } from 'react';
import type { Metadata } from 'next';
import { WalletProvider } from '@/context/WalletContext';

export const metadata: Metadata = {
  title: 'Campus Trust System | Blockchain-Secured Voting, Attendance & Certificates',
  description: 'A decentralized campus system built on Algorand blockchain for tamper-proof voting, attendance, and certificate verification.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body>
        <WalletProvider>
          <main className="container">
            {children}
          </main>
        </WalletProvider>
      </body>
    </html>
  );
}
