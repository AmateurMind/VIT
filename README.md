# 🎓 Campus Trust System (Algorand Monorepo)

A decentralized, blockchain-secured platform for campus voting, attendance tracking, and certificate verification. Built for **Hackspiration'26**.

## 📁 Project Structure

This project is organized into a modular structure to separate concerns and ensure transparency:

| Directory | Purpose | Key Tech |
| :--- | :--- | :--- |
| **[`apps/`](./apps/web)** | The user-facing Next.js web application. | Next.js, Pera Wallet, algosdk |
| **[`contracts/`](./contracts)** | Smart contracts and deployment scripts. | Python (PyTeal), Algorand SDK |
| **[`docs/`](./docs)** | Project documentation, presentations, and technical diagrams. | Markdown, Images |

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
Navigate to the web app directory to start the frontend:
```bash
cd apps/web
npm install
npm run dev
```

### 2. Smart Contracts
Navigate to the contracts directory to deploy or modify the voting logic:
```bash
cd contracts
pip install -r requirements.txt
python deploy_voting.py
```

### 3. Documentation
Technical specifications and demo presentation materials can be found in:
```bash
cd docs
```

---

## 🏆 Hackathon Winning Points

- **Zero Centralization:** Removed all traditional databases (Convex/SQL). Trust is entirely on-chain.
- **Instant Finality:** Leveraging Algorand's 3.3s block times for real-time campus interaction.
- **Auditability:** Every action generates a public transaction on the Pera Explorer.
- **Inclusive UX:** Supports both **Pera Wallet** and a **Demo Guest Mode** for easy presentation.

---

Built with ❤️ by suhail
