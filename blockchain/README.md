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
git clone <your-repo-url>
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

## Deployment Guide

Deployment and contract linking are completely automated via Foundry Solidity scripting.

1. Setup Environment Variables
Generate a .env file in the root of your blockchain/ directory and populate it with the following configuration:

# Your deployment wallet private key
```
PRIVATE_KEY="your_private_key_here"
```

# Targeted EVM Network RPC Endpoint
```
RPC_URL="https://eth-sepolia.g.alchemy.com/v2/YOUR_ALCHEMY_KEY"
```

2. Initialize Environment Variables
```
source .env
```

3. Broadcast the Protocol Deployment
```
forge script script/DeployUniversity.s.sol:DeployUniversity --rpc-url $RPC_URL --broadcast
```

---

## Step-by-Step User Guide (Protocol Lifecycle)

### Phase 1: Institutional Initialization (Admin)
* Access Control Assignment: The initial Deployer (Admin) grants systemic permissions to designated Ethereum addresses.
* Treasury Configuration: The Admin defines the specific enrollment cost mapping to an approved ERC20 stablecoin.
  Action: Execute setTokenFee(tokenAddress, feeAmount) on UniversityCore.

### Phase 2: Student Admission & Identity (Student & Admin)
* Registration Payment Submission (Student):
  Action: The student invokes payRegistrationFee(tokenAddress) directly on the FeeManager contract.
* On-Chain Enrollment Execution (Admin): The core consumes the voucher and issues the identity token.
  Action: Admin executes enrollStudent(studentAddress, studentIdHash) on UniversityCore.

### Phase 3: Active Academic Term (Professors)
* Curriculum Creation:
  Action: Admin or authorized Professor executes addSubject("Blockchain", 6, professorAddress) on UniversityCore.
* Grade Registry Logging: Professors post grades scaled from 1 to 10.
  Action: Professor executes postGrade(studentAddress, subjectId, grade) on UniversityCore.

### Phase 4: Degree Certification & Graduation (Issuer / Secretariat)
* Academic Verification Audit: Once a student profile successfully fulfills all required academic credit thresholds.
  Action: The designated Diploma Issuer calls graduateStudentAndIssueDiploma(studentAddress, "B.Sc. Engineer", "Computer Science") on UniversityCore.

### Phase 5: Financial Treasury Management (Admin)
* Asset Liquidation Extraction: The administrative body can dynamically sweep accumulated registration stablecoins.
  Action: Admin executes withdrawUniversityFunds(tokenAddress, destinationWallet, amount) on UniversityCore.