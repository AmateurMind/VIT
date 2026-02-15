# Suggested MVP Folder Structure

```text
VIT/
  apps/
    web/
      src/
        app/
          page.tsx
          vote/page.tsx
          attendance/page.tsx
          certificate/page.tsx
        components/
          WalletConnect.tsx
          VotePanel.tsx
          ExplorerLink.tsx
        lib/
          algorand.ts        # algod/indexer clients + helpers
          wallet.ts          # Pera/AlgoSigner helpers
          voteContract.ts    # app-call builders (opt-in, vote, close)
          certificate.ts     # file hashing helper
      .env.local
  contracts/
    voting.py
    deploy_voting.py
    requirements.txt
  convex/
    schema.ts
    queries.ts
    mutations.ts
  docs/
    MVP_FLOW.md
    HACKATHON_STRUCTURE.md
```

## Frontend -> Contract Call Flow

Voting must use Algorand as source of truth:

1. Connect wallet (Pera or AlgoSigner) and get wallet address.
2. If wallet is not opted in to `APP_ID`, send App Opt-In transaction.
3. Send App NoOp with app args:
   - `["vote", <optionIndex>]` where `optionIndex` is `0` or `1`.
4. Wait for confirmation and show:
   - transaction ID
   - explorer link `https://testnet.algoexplorer.io/tx/<TX_ID>`
5. Read global/local state from Algorand to render counts and "already voted".

Convex can store only metadata (poll title, candidate labels, UI text), not vote records.
