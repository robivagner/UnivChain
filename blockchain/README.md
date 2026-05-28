# UnivChain: Decentralized University Management Protocol

> A robust, modular, and decentralized academic management system built on the Ethereum EVM.

**UnivChain** leverages a sophisticated **Hub-and-Spoke architecture** to seamlessly handle student enrollment, secure fee payments, transparent grade tracking, and the cryptographic issuance of **Soulbound Tokens (SBTs)** for both Student Identities and final Diplomas.

---

## Architecture Overview

The protocol is decoupled into five distinct, highly secure smart contracts to maintain a strict separation of concerns, reduce attack vectors, and optimize gas usage.

* **UniversityCore (The Hub):** The central routing unit and primary access control layer.
* **StudentRegistry (Identity Spoke):** Manages live enrollment statuses and encapsulates the core logic for minting and verifying non-transferable Student Identity Soulbound Tokens (SBTs).
* **FeeManager (Treasury Spoke):** Handles institutional registration fees utilizing approved ERC20 stablecoins.
* **Gradebook (Academic Spoke):** Empowers professors to register unique subject curricula and record immutable student grades.
* **Certification (Alumni Spoke):** Directs the cryptographic minting of the final Graduation Diploma Soulbound NFT.

Spoke contracts are wired to the hub exactly once via `initializeCore` and cannot be replaced afterward; the protocol is not upgradeable in place.

**Diploma credentials:** Each graduation mints a soulbound ERC-721 with on-chain snapshots (ECTS, GPA, issuer), an optional `documentHash` (keccak256 of the canonical PDF/JSON), and a `metadataURI` (IPFS/HTTPS JSON for wallets). Admins may revoke a diploma via `revokeDiploma` while keeping the audit trail on-chain. Verifiers should use `hasValidDiploma` / `isDiplomaValid`, not ownership alone.

**Access-control split (hybrid hub-and-spoke):**

| Layer | Responsibility |
|-------|----------------|
| **UniversityCore** | Roles, multi-module workflows (paid → enrolled, enrolled → graded, eligible → diploma) |
| **Spokes** | Domain invariants on their own state (grade bounds, fee voucher rules, duplicate enroll, graduation policy) |

---

## Prerequisites

Ensure you have the following engineering tools installed locally prior to interacting with the protocol:

* Git: Version control system.
* Foundry: A lightning-fast, portable, and modular toolkit for Ethereum application development.

---

## Installation & Setup

Follow these steps to initialize and build the environment:

1. Clone the Repository:
```
git clone https://github.com/robivagner/UnivChain
cd blockchain
```

2. Install OpenZeppelin Dependencies:
```
forge install OpenZeppelin/openzeppelin-contracts --no-commit
```

3. Compile the Smart Contracts:
```
forge build
```

---

## Testing Suite

UnivChain features a rigorous testing suite encompassing standard Unit testing, comprehensive Integration testing, and heavy Fuzz Testing.

* Execute the Entire Test Suite:
```
forge test
```

* Run a Specific Test with Full Verbose Tracing:
```
forge test --mt testFuzz_FullAcademicCycle -vvv
```

* Inspect Detailed Code Coverage:
```
forge coverage
```

---

# Deployment Guide

## Local Anvil (recommended for frontend work)

From the **repository root**:

```bash
make local    # fresh Anvil + deploy + frontend address sync + mock enrollment token
```

Or step by step: `make anvil` → `make deploy` → `make sync-frontend` → optional `make setup-dev`.

## Remote networks

Deployment and contract linking are completely automated via Foundry Solidity scripting.

## 1. Setup Environment Variables
Generate a .env file in the root of your blockchain/ directory and populate it with the following configuration:

Your deployment wallet private key
```
PRIVATE_KEY="your_private_key_here"
```

Targeted EVM Network RPC Endpoint
```
RPC_URL="https://eth-sepolia.g.alchemy.com/v2/YOUR_ALCHEMY_KEY"
```

## 2. Initialize Environment Variables
```
source .env
```

## 3. Broadcast the Protocol Deployment
```
forge script script/DeployUniversity.s.sol:DeployUniversity --rpc-url $RPC_URL --broadcast
```

---