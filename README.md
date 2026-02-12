# 🎓 Campus Trust System

A decentralized, blockchain-secured platform for campus voting, attendance tracking, and certificate verification. Built for **Hackspiration'26**.

## 📁 Project Structure

| Directory | Purpose | Key Tech |
| :--- | :--- | :--- |
| **`src/`** | Next.js app source (pages, components, context, lib) | Next.js, Pera Wallet, algosdk |
| **[`contracts/`](./contracts)** | Smart contracts and deployment scripts | Python (PyTeal), Algorand SDK |
| **[`docs/`](./docs)** | Documentation, presentations, and diagrams | Markdown |

---

## 🏗️ Architecture Overview

The system follows a **Pure Decentralized Architecture**:

1.  **Frontend:** Next.js application that provides the UI and connects to user wallets.
2.  **Wallet:** Pera Wallet handles secure signing of on-chain transactions.
3.  **Blockchain:** Algorand TestNet serves as the single source of truth for votes, attendance, and certificates.
4.  **Smart Contracts:** PyTeal-based logic that governs the rules of the system (e.g., 1 wallet = 1 vote).

---

## 🚀 Getting Started

### 1. Web Application
```bash
npm install
npm run dev
```

### 2. Smart Contracts
```bash
cd contracts
pip install -r requirements.txt
python deploy_voting.py
```

### 3. Documentation
Technical specifications and demo presentation materials can be found in `docs/`.

---

## 🏆 Hackathon Winning Points

- **Zero Centralization:** Removed all traditional databases (Convex/SQL). Trust is entirely on-chain.
- **Instant Finality:** Leveraging Algorand's 3.3s block times for real-time campus interaction.
- **Auditability:** Every action generates a public transaction on the Pera Explorer.
- **Inclusive UX:** Supports both **Pera Wallet** and a **Demo Guest Mode** for easy presentation.

---

Built with ❤️ by suhail
