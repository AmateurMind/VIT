<div align="center">

# STROTAS — Campus Trust System

### Blockchain-Secured Voting, Attendance & Certificates on Algorand

[![Built on Algorand](https://img.shields.io/badge/Built%20on-Algorand-000000?style=for-the-badge&logo=algorand&logoColor=white)](https://algorand.com)
[![Next.js](https://img.shields.io/badge/Next.js-16-black?style=for-the-badge&logo=next.js)](https://nextjs.org)
[![Hackspiration'26](https://img.shields.io/badge/Hackspiration'26-Track%202-gold?style=for-the-badge)](https://hackspiration.devfolio.co)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue?style=for-the-badge)](LICENSE)

> **"Trust comes from code, not authority."**  
> Every record is immutable, verifiable, and transparent — secured by Algorand's Pure Proof-of-Stake.

🎬 **[Watch Demo Video →](https://drive.google.com/file/d/1xFr5zADGcqFBKLDf7_sNts4uIdimnu1h/view?usp=sharing)**

<!-- 🖼️ SCREENSHOTS -->
![Homepage — 3D Landing Page with Wallet Connected](./public/Screenshot%202026-02-12%20225742.png)
![Certificate Module — Hash Storage & Verification](./public/Screenshot%202026-02-12%20225819.png)

</div>

---

## 🎯 Problem Statement (Track 2: AI and Automation in Blockchain)

Campus systems like **voting, attendance, feedback, and certification** suffer from:

| Problem | Traditional System | Strotas Solution |
|---|---|---|
| 🔴 **Trust deficit** | "Trust the admin" | Trust the code — results are on-chain |
| 🔴 **Data tampering** | Editable databases | Immutable blockchain records |
| 🔴 **Proxy attendance** | Buddy signs for you | Wallet = Identity, cryptographic proof |
| 🔴 **Fake certificates** | Easy to forge PDFs | SHA-256 hash verification on Algorand |
| 🔴 **No transparency** | Closed-door counting | Anyone can audit via Pera Explorer |

---

## ✨ Key Features

### 🗳️ Module 01 — Secure Voting
- **1 Wallet = 1 Vote** — enforced by a [PyTeal smart contract](./contracts/voting.py)
- On-chain vote tallying with live results
- Multi-election support (create unlimited polls)
- Smart contract prevents double-voting, close-out resets, and admin manipulation
- [View on Pera Explorer →](https://testnet.explorer.perawallet.app/application/755380217)

### 📋 Module 02 — Smart Attendance  
- Mark attendance with a **blockchain transaction** — zero proxy possible
- SHA-256 hashed session data stored permanently on Algorand
- Each record linked to a verifiable transaction ID
- Auto-generated session IDs with timestamps

### 📜 Module 03 — Certificate Verification & Secure Sharing
- Upload any certificate (PDF/PNG/JPG) → generates **SHA-256 hash**
- Hash is **permanently stored on Algorand** as cryptographic proof
- **Verify mode**: Re-upload any certificate to check authenticity instantly
- If even 1 pixel changes, the hash won't match — tamper-proof
- **Secure Sharing**: Create temporary, view-only links with customizable expiration (5s to 7 days). Viewers cannot copy or print.

### 🚀 Demo Guest Mode
- **No wallet needed** — generates a temporary Algorand keypair in-browser
- Perfect for hackathon demos and presentations
- Fund via [Algorand TestNet Faucet](https://bank.testnet.algorand.network/)

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    STROTAS FRONTEND                     │
│              Next.js 16 + React 19 + Tailwind           │
│                                                         │
│  ┌──────────┐  ┌──────────────┐  ┌───────────────┐     │
│  │  Voting  │  │  Attendance  │  │  Certificates │     │
│  │  Module  │  │    Module    │  │    Module      │     │
│  └────┬─────┘  └──────┬───────┘  └───────┬───────┘     │
│       │               │                  │              │
│       └───────────────┼──────────────────┘              │
│                       │                                 │
│              ┌────────▼─────────┐                       │
│              │  WalletContext   │                       │
│              │  (Pera / Guest)  │                       │
│              └────────┬─────────┘                       │
└───────────────────────┼─────────────────────────────────┘
                        │
                        │ algosdk (sign + submit)
                        ▼
┌─────────────────────────────────────────────────────────┐
│              ALGORAND TESTNET (Layer 1)                 │
│                                                         │
│  ┌─────────────────┐    ┌────────────────────────────┐  │
│  │  Smart Contract │    │  Transaction Note Storage  │  │
│  │  (PyTeal AVM8)  │    │  (Attendance & Cert Hashes)│  │
│  │                 │    │                            │  │
│  │  Global State:  │    │  0-ALGO self-transfers     │  │
│  │  • is_open      │    │  with JSON note payloads   │  │
│  │  • option_0     │    │                            │  │
│  │  • option_1     │    │  { type: "ATTENDANCE",     │  │
│  │  • creator      │    │    hash: "a3f8c1..." }     │  │
│  │                 │    │                            │  │
│  │  Local State:   │    │  { type: "CERTIFICATE",    │  │
│  │  • has_voted    │    │    hash: "b7d2e4..." }     │  │
│  │  • choice       │    │                            │  │
│  └─────────────────┘    └────────────────────────────┘  │
│                                                         │
│            ~3.8s finality  •  ~0.001 ALGO/tx            │
└─────────────────────────────────────────────────────────┘
```

**Zero backend. Zero database. 100% on-chain.**

---

## 🛠️ Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| **Frontend** | Next.js 16 + React 19 | App Router, SSR, routing |
| **Styling** | Tailwind CSS 4 + Framer Motion | Premium UI with animations |
| **3D** | Spline + Three.js | Interactive 3D hero visualization |
| **UI Components** | Radix UI + Lucide Icons | Accessible, consistent components |
| **Blockchain** | Algorand TestNet (AVM v8) | Immutable record storage |
| **Smart Contracts** | PyTeal (Python) | Voting contract logic |
| **Wallet** | Pera Wallet SDK | Secure transaction signing |
| **SDK** | algosdk v2.7 | Algorand interaction layer |

---

## 📁 Project Structure — Files Judges Should Review

```
STROTAS/
│
├── 📄 README.md                          ← You are here
│
├── 🔗 contracts/                         ← ⭐ SMART CONTRACT CODE
│   ├── voting.py                         ← PyTeal voting contract (core logic)
│   ├── deploy_voting.py                  ← Deployment script for Algorand TestNet
│   ├── generate_wallet.py                ← Deployer wallet generation utility
│   └── requirements.txt                  ← Python dependencies (pyteal, algosdk)
│
├── 🌐 src/
│   ├── app/
│   │   ├── page.tsx                      ← ⭐ Homepage with 3D Spline scene
│   │   ├── layout.tsx                    ← Root layout with WalletProvider
│   │   ├── vote/page.tsx                 ← ⭐ Voting module (smart contract UI)
│   │   ├── attendance/page.tsx           ← ⭐ Attendance module (hash storage)
│   │   ├── certificate/page.tsx          ← ⭐ Certificate module (verify + store)
│   │   └── certificate/share/[data]/page.tsx ← ⭐ Secure Sharing (view-only link)
│   │
│   ├── context/
│   │   └── WalletContext.tsx             ← ⭐ Pera Wallet + Guest Mode provider
│   │
│   ├── lib/
│   │   └── algorand.ts                   ← ⭐ All Algorand SDK interactions
│   │
│   └── components/ui/                    ← Reusable UI components (Button, Card, etc.)
│
├── 📚 docs/
│   ├── MVP_FLOW.md                       ← System flow documentation
│   └── HACKATHON_STRUCTURE.md            ← Project structure reference
│
├── .env.local                            ← Environment config (App IDs, Algod endpoint)
└── package.json                          ← Dependencies and scripts
```

### ⭐ Must-Review Files for Judges

| Priority | File | What It Demonstrates |
|---|---|---|
| 🥇 | [`contracts/voting.py`](./contracts/voting.py) | PyTeal smart contract — 1 wallet = 1 vote, on-chain state |
| 🥇 | [`src/lib/algorand.ts`](./src/lib/algorand.ts) | All blockchain interactions (vote, attend, certify) |
| 🥇 | [`src/app/vote/page.tsx`](./src/app/vote/page.tsx) | Full voting flow: opt-in → vote → live results |
| 🥈 | [`src/context/WalletContext.tsx`](./src/context/WalletContext.tsx) | Pera Wallet integration + Guest Mode for demos |
| 🥈 | [`src/app/attendance/page.tsx`](./src/app/attendance/page.tsx) | Hash-based attendance proof on Algorand |
| 🥈 | [`src/app/certificate/page.tsx`](./src/app/certificate/page.tsx) | SHA-256 certificate verification system |
| � | [`src/app/certificate/share/.../page.tsx`](./src/app/certificate/share/[data]/page.tsx) | Secure view-only link sharing system |
| �🥉 | [`src/app/page.tsx`](./src/app/page.tsx) | Premium UI with 3D visualization |
| 🥉 | [`contracts/deploy_voting.py`](./contracts/deploy_voting.py) | Automated contract deployment pipeline |

---

## 🚀 Getting Started

### Prerequisites
- **Node.js** 18+ and npm
- **Python** 3.8+ (for smart contract deployment)
- **Pera Wallet** app ([iOS](https://apps.apple.com/app/pera-algo-wallet/id1459898525) / [Android](https://play.google.com/store/apps/details?id=com.algorand.android))

### 1. Clone & Install

```bash
git clone https://github.com/your-username/strotas.git
cd strotas
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env.local
```

```env
# .env.local
NEXT_PUBLIC_ALGOD_SERVER=https://testnet-api.algonode.cloud
NEXT_PUBLIC_ALGOD_PORT=443
NEXT_PUBLIC_ALGOD_TOKEN=
NEXT_PUBLIC_VOTING_APP_ID=755380217    # Pre-deployed on TestNet
```

### 3. Run the Application

```bash
npm run dev
# → Opens at http://localhost:3000
```

### 4. Deploy a New Voting Contract (Optional)

```bash
cd contracts
pip install -r requirements.txt
python generate_wallet.py              # Generate deployer wallet
# Fund it at https://bank.testnet.algorand.network/
set DEPLOYER_MNEMONIC="your 25 word mnemonic"
python deploy_voting.py                # Deploy → get new App ID
```

---

## 🎮 Demo Flow (For Hackathon Presentation)

```
Step 1: Open app → Show premium 3D landing page
        ↓
Step 2: Connect Pera Wallet (or use Guest Mode)
        ↓
Step 3: 🗳️ VOTING → Opt-in → Cast vote → See live results
        → Show transaction on Pera Explorer
        ↓
Step 4: 📋 ATTENDANCE → Generate Session → Mark Present
        → Show hash stored on-chain
        ↓
Step 5: 📜 CERTIFICATE → Upload PDF → Store hash
        → Share Link (5s expiry) → Show auto-expiry & anti-copy
        → Switch to Verify mode → Re-upload → ✅ Match!
        → Modify file → Re-upload → ❌ No match! (tamper detected)
        ↓
Step 6: Show Pera Explorer → All transactions are public & auditable
```

> 💡 **Tip**: Use "Change Election" to switch to a fresh App ID if you need to vote again with the same wallet.

---

## 🏆 Why Strotas Should Win

| Criteria | How We Excel |
|---|---|
| **Innovation** | Zero-database architecture — no backend, no SQL, pure blockchain |
| **Technical Depth** | Custom PyTeal smart contract with local + global state management |
| **Completeness** | 3 fully functional modules: Voting + Attendance + Certificates |
| **UX Quality** | Premium dark UI with 3D Spline scene, Framer Motion animations |
| **Algorand Usage** | Smart Contracts (ABI calls) + Transaction Notes (hash storage) — dual approach |
| **Trust Model** | Every action is verifiable on Pera Explorer — zero admin control |
| **Demo-Ready** | Guest Mode generates instant wallets — no setup needed for judges |
| **Scalability** | Multi-election support, session-based attendance, unlimited certificates |

### 🔐 Trust Guarantees

- ✅ **1 wallet = 1 vote** — Smart contract rejects duplicates
- ✅ **No admin override** — Contract rejects `UpdateApplication` and `DeleteApplication`
- ✅ **No vote reset** — `ClearState` is rejected to prevent gaming
- ✅ **Public auditability** — Every transaction visible on [Pera Explorer](https://testnet.explorer.perawallet.app/)
- ✅ **Cryptographic proofs** — SHA-256 hashes ensure certificate integrity

---


---

## 🔗 Live Links

| Resource | URL |
|---|---|
| 🌐 Live App | `http://localhost:3000` *(run locally)* |
| 🔍 Voting Contract | [App ID 755380217 on Pera Explorer](https://testnet.explorer.perawallet.app/application/755380217) |
| 💰 TestNet Faucet | [bank.testnet.algorand.network](https://bank.testnet.algorand.network/) |
| 📱 Pera Wallet | [Download](https://perawallet.app/) |

---

## Team

**Team Strotas** — Hackspiration'26

---

<div align="center">

Trust is a protocol, not a promise.

</div>
