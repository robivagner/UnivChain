# UnivChain diploma credentials (Variant B)

Off-chain diplomas use **EIP-712 signed JSON** pinned at the on-chain `metadataURI`.

Implementation lives in this folder (`credential.ts`, `types.ts`, `verifyCredential.ts`).

## Format

See [`examples/univchain-diploma.example.json`](examples/univchain-diploma.example.json).

- **`totalCredits`** — ECTS at graduation (signed in JSON)
- **`finalAverage`** — weighted average × 100 (e.g. 950 = 9.50; signed in JSON)
- **`proof.type`** — `Eip712Signature` (simplified, VC-inspired label; verification uses `proofValue` only)
- **`proof.proofValue`** — issuer wallet signature over the typed `DiplomaCredential` struct
- **`evidence.documentHash`** — `keccak256` of the JSON file with this field set to zero (matches on-chain `documentHash`)
- **`studentIdHash`** (optional) — hash of the university matriculation number from `StudentRegistry`

## Issuance flow

1. Issuer portal **graduates & mints** the soulbound diploma (Gradebook policy checked on-chain).
2. Issuer **signs** the credential JSON (EIP-712), including `totalCredits` and `finalAverage` from Gradebook.
3. Download the JSON and pin it to IPFS (or host over HTTPS).
4. Submit `attachDiplomaCredential(student, documentHash, metadataURI)` on-chain.

## Verification

The public verifier checks:

1. EIP-712 signature matches `issuer`
2. Document hash matches pinned JSON
3. On-chain diploma is valid (`isDiplomaValid`) and issuer matches

Academic numbers (credits, GPA) live in the **signed JSON**, not in the on-chain `Diploma` struct.
