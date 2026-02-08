# 🔐 Campus Trust System

> **Blockchain-Secured Voting, Attendance & Certificate Verification on Algorand**

Built for **Hackspiration'26 - Track 2: AI and Automation in Blockchain**

---

## 🎯 Problem Statement

Campus systems (voting, attendance, certificates) suffer from:
- ❌ Lack of trust in centralized systems
- ❌ Manual verification prone to tampering
- ❌ No auditability or transparency
- ❌ Admin can manipulate records

## ✅ Our Solution

A decentralized system where **trust comes from code, not authority**:
- ✅ **Algorand blockchain** stores all critical records
- ✅ **Wallet-based identity** (1 wallet = 1 vote)
- ✅ **Immutable proofs** that anyone can verify
- ✅ **No blind trust** in admins required

---

## 🏗️ Architecture

```
┌──────────────────┐     ┌─────────────────┐     ┌──────────────────┐
│   Next.js UI     │────▶│   Pera Wallet   │────▶│  Algorand        │
│   (Frontend)     │     │   (Signing)     │     │  TestNet         │
└──────────────────┘     └─────────────────┘     └──────────────────┘
                                                          │
                                                          ▼
                                                 ┌──────────────────┐
                                                 │  Smart Contract  │
                                                 │  (PyTeal)        │
                                                 └──────────────────┘
```

**Key Principle:** Blockchain is the single source of truth. UI only facilitates interaction.

---

## 📦 Features

### 🗳️ Voting (Core Feature)
- Connect Pera Wallet
- One wallet =- Cast vote → on-chain transaction
- Show confirmation + transaction ID
- Display live results from blockchain
- Add "Verify on Pera Explorer" link

### 📋 Attendance
- Mark attendance with wallet signature
- Hash stored on-chain as proof
- Timestamped and immutable

### 🎓 Certificate Verification
- Upload certificate → generate SHA-256 hash
- Store hash on Algorand
- Verify authenticity by re-hashing

---

## 🛠️ Tech Stack

| Component | Technology |
|-----------|------------|
| Frontend | Next.js 16 |
| Wallet | Pera Wallet |
| Blockchain | Algorand TestNet |
| Smart Contract | Python (PyTeal) |
| Styling | CSS with Glassmorphism |

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Pera Wallet app (for testing)
- Python 3.8+ (for contract deployment)

### 1. Install Dependencies
```bash
cd apps/web
npm install
```

### 2. Configure Environment
```bash
cp .env.example .env.local
# Edit .env.local with your Voting App ID
```

### 3. Deploy Smart Contract (Optional - if not already deployed)
```bash
cd contracts
pip install -r requirements.txt

# Set your mnemonic (TESTNET ONLY!)
set DEPLOYER_MNEMONIC=your 25 word mnemonic here

# Deploy
python deploy_voting.py
# Note the App ID from output
```

### 4. Run Development Server
```bash
cd apps/web
npm run dev
```

Open http://localhost:3000

---

## 📁 Project Structure

```
├── apps/web/                 # Next.js Frontend
│   ├── src/
│   │   ├── app/
│   │   │   ├── page.tsx          # Home page
│   │   │   ├── vote/             # Voting module
│   │   │   ├── attendance/       # Attendance module
│   │   │   └── certificate/      # Certificate module
│   │   ├── lib/
│   │   │   └── algorand.ts       # Algorand utilities
│   │   └── context/
│   │       └── WalletContext.tsx # Wallet state
│   └── .env.example
│
└── contracts/                # Smart Contracts
    ├── voting.py             # PyTeal voting contract
    ├── deploy_voting.py      # Deployment script
    └── requirements.txt
```

---

## 🔐 Why Blockchain?

| Traditional System | Campus Trust System |
|--------------------|---------------------|
| Admin can edit | Records are immutable |
| Trust the authority | Trust the code |
| No audit trail | Public blockchain explorer |
| Duplicate votes possible | 1 wallet = 1 vote |

**Key Quote for Judges:**
> "In campus systems, trust should come from math and code, not authority."

---

## 📊 What's On-Chain vs Off-Chain

| On-Chain (Algorand) | Off-Chain (Frontend) |
|---------------------|----------------------|
| Vote hash & count | Poll titles, UI state |
| Attendance proof | Session names |
| Certificate hash | File preview |

---

## 🎤 Demo Flow

1. **Connect Wallet** → Pera Wallet on TestNet
2. **Cast Vote** → Opt-in → Select option → Sign transaction
3. **Mark Attendance** → Generate session → Sign → View on explorer
4. **Verify Certificate** → Upload → Hash matches? Authentic!

---

## 👥 Team

Built for Hackspiration'26 at VIT Pune

---

## 📄 License

MIT License - Built for educational purposes
