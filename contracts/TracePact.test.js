// Minimal behavioral checklist for Remix or another EVM test runner:
// 1. openPact rejects bytes32(0).
// 2. only the author can attach evidence or close a pact.
// 3. evidence can only be attached once.
// 4. a pact cannot close before evidence is attached.
// 5. all timestamps increase and all stored hashes remain unchanged.

