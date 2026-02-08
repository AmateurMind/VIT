'use client';

import { useWallet } from '@/context/WalletContext';
import Link from 'next/link';

export default function HomePage() {
  const { address, isConnected, isConnecting, connect, disconnect } = useWallet();

  return (
    <div className="home-page">
      {/* Hero Section */}
      <header className="hero">
        <div className="hero-content">
          <h1>🔐 Campus Trust System</h1>
          <p className="hero-subtitle">
            Blockchain-secured voting, attendance & certificates on Algorand
          </p>
          <p className="hero-description">
            Trust comes from code, not authority. Every record is immutable, verifiable, and transparent.
          </p>
        </div>
        <div className="wallet-section">
          {isConnected ? (
            <div className="wallet-connected">
              <span className="wallet-badge">🟢 Connected</span>
              <span className="wallet-address">{address?.slice(0, 6)}...{address?.slice(-4)}</span>
              <button onClick={disconnect} className="btn btn-secondary">Disconnect</button>
            </div>
          ) : (
            <button
              onClick={connect}
              disabled={isConnecting}
              className="btn btn-primary"
            >
              {isConnecting ? 'Connecting...' : '🔗 Connect Pera Wallet'}
            </button>
          )}
        </div>
      </header>

      {/* Features Grid */}
      <section className="features-section">
        <h2 className="section-title">Modules</h2>
        <div className="grid">
          <Link href="/vote" className="card card-interactive">
            <div className="card-icon">🗳️</div>
            <h3>Voting</h3>
            <p>Cast tamper-proof votes on-chain. One wallet = one vote. Results are publicly verifiable.</p>
            <span className="card-badge badge-primary">Core Feature</span>
          </Link>

          <Link href="/attendance" className="card card-interactive">
            <div className="card-icon">📋</div>
            <h3>Attendance</h3>
            <p>Mark attendance with blockchain proof. No proxy, no tampering, no disputes.</p>
            <span className="card-badge badge-secondary">On-Chain Proof</span>
          </Link>

          <Link href="/certificate" className="card card-interactive">
            <div className="card-icon">🎓</div>
            <h3>Certificates</h3>
            <p>Verify certificate authenticity instantly using blockchain stored hashes.</p>
            <span className="card-badge badge-secondary">Hash Verification</span>
          </Link>
        </div>
      </section>

      {/* How It Works */}
      <section className="how-section">
        <h2 className="section-title">How It Works</h2>
        <div className="steps">
          <div className="step">
            <div className="step-number">1</div>
            <div className="step-content">
              <h4>Connect Wallet</h4>
              <p>Link your Pera Wallet to establish identity</p>
            </div>
          </div>
          <div className="step">
            <div className="step-number">2</div>
            <div className="step-content">
              <h4>Perform Action</h4>
              <p>Vote, mark attendance, or upload certificate</p>
            </div>
          </div>
          <div className="step">
            <div className="step-number">3</div>
            <div className="step-content">
              <h4>Blockchain Stores Proof</h4>
              <p>Transaction is recorded on Algorand forever</p>
            </div>
          </div>
          <div className="step">
            <div className="step-number">4</div>
            <div className="step-content">
              <h4>Anyone Can Verify</h4>
              <p>Check on Algorand Explorer anytime</p>
            </div>
          </div>
        </div>
      </section>

      {/* Tech Stack */}
      <section className="tech-section">
        <h2 className="section-title">Built On</h2>
        <div className="tech-badges">
          <span className="tech-badge">⚡ Algorand TestNet</span>
          <span className="tech-badge">🔐 Pera Wallet</span>
          <span className="tech-badge">⚛️ Next.js</span>
          <span className="tech-badge">🐍 PyTeal Smart Contract</span>
        </div>
      </section>
    </div>
  );
}
