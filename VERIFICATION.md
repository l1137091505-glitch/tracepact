# Verification

Run these checks before publishing:

```bash
cd frontend
npm install
npm run build
```

Compile `contracts/src/TracePact.sol` with Solidity 0.8.24 or newer. The frontend
starts in preview mode until `VITE_TRACEPACT_ADDRESS` is configured.

