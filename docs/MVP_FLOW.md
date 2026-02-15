# MVP Flow: Decentralized Campus Voting & Certification

## 1) Auth & Eligibility
- User logs in with email (mock college email allowed).
- Convex checks `eligibility` table.
- Convex issues a temporary `hashedStudentId` (never stored on-chain as raw identity).

## 2) Election Creation
- Organizer creates election in Convex.
- Convex deploys Algorand app (smart contract) and stores `algorandAppId` in `elections`.
- Election status becomes `open`.

## 3) Voting
- User selects candidate in UI.
- Convex validates eligibility and session.
- Convex submits `hashedStudentId + candidateId` to Algorand app.
- Algorand app enforces one-vote-per-account and updates totals.

## 4) Automation
- Smart contract auto-closes when `end` time passes.
- `close` and `finalize` calls lock results on-chain.
- Convex syncs results into `electionCache` for fast UI updates.

## 5) Certificate Issuance (Bonus)
- After finalization, Convex generates certificate hash.
- Hash is submitted on-chain.
- UI shows verification by Algorand transaction id.

## Trust Boundaries
- Convex handles UX, auth, caching.
- Algorand is the final source of truth for votes and results.
