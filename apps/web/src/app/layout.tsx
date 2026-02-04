import './globals.css';
import type { ReactNode } from 'react';

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <main className="container">
          <header className="hero">
            <h1>Decentralized Campus Voting & Certification</h1>
            <p>Convex for realtime, Algorand for trust-critical records.</p>
          </header>
          {children}
        </main>
      </body>
    </html>
  );
}
