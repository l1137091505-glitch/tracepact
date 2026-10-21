# TRACEPACT

TRACEPACT turns a project promise into a three-part, verifiable task passport:
commit the brief, attach delivery evidence, and close the record with a result.

## What is included

- An original React/Vite interface with a new editorial dashboard layout.
- Wallet connection and live account/network change handling.
- A Solidity contract that stores only hashes and timestamps.
- A preview mode with sample records when no contract address is configured.
- SPA rewrites for Vercel.

## Deploy the contract

Compile `contracts/src/TracePact.sol` with Solidity 0.8.24. Deploy it while your
wallet is connected to the intended EVM network. Review and test the contract
before using it with valuable assets.

## Configure Vercel

Create this environment variable for Production, Preview, and Development:

```text
VITE_TRACEPACT_ADDRESS=0xYourDeployedContractAddress
```

The variable is public by design: a contract address is not a secret. Set the
Vercel Root Directory to `frontend`, then redeploy.

## Local development

```bash
cd frontend
npm install
npm run dev
```

## Contract flow

1. `openPact(briefHash)` anchors a brief hash.
2. `attachEvidence(id, evidenceHash)` locks delivery evidence.
3. `closePact(id, resultHash)` records the conclusion and closes the timeline.

The application hashes readable text in the browser. Do not treat hash-only
storage as a substitute for a security audit, legal advice, or durable backup.

