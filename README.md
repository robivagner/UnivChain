# UnivChain

A decentralized university management system on the EVM: enrollment fees, on-chain grades, student registry, and **EIP-712 signed diploma credentials** anchored by soulbound ERC-721 tokens.

This guide covers everything you need to **clone, install, run, and test** the project locally. For smart-contract architecture and remote deployment details, see [`blockchain/README.md`](blockchain/README.md).

---

## What is in this repository?

| Path | Description |
|------|-------------|
| [`blockchain/`](blockchain/) | Solidity contracts (Foundry), tests, deploy scripts |
| [`frontend/`](frontend/) | Next.js portal (RainbowKit / wagmi) — student, professor, admin, issuer, verifier |
| [`indexer/`](indexer/) | SQLite-backed enrollment event indexer + REST API for the admin queue |
| [`frontend/src/lib/diploma/`](frontend/src/lib/diploma/) | Off-chain diploma JSON format (`univchain-diploma-1`), examples, and TypeScript helpers |
| [`scripts/`](scripts/) | Anvil helper, address sync into frontend + indexer |
| [`Makefile`](Makefile) | One-command local stack (`make local`, `make dev`, …) |

### Architecture (high level)

```
┌─────────────────────────────────────────────────────────────────┐
│  Web app (Next.js, port 3000)                                   │
└────────────┬──────────────────────────────┬─────────────────────┘
             │                              │
             ▼                              ▼
┌────────────────────────┐      ┌──────────────────────────────────┐
│  Off-chain             │      │  Anvil / EVM (chain 31337)       │
│  · Indexer (8787)      │◄────►│  · UniversityCore (hub)          │
│  · SQLite              │      │  · StudentRegistry               │
│  · IPFS / HTTPS JSON   │◄─────│  · Gradebook                     │
└────────────────────────┘      │  · FeeManager                    │
             ▲                  │  · Certification (diploma NFT)   │
             └──────────────────┴──────────────────────────────────┘
```

**Hub-and-spoke contracts:** `UniversityCore` orchestrates roles and cross-module workflows; spokes enforce their own rules (grades, fees, diplomas). Diplomas are soulbound NFTs; student enrollment is stored in `StudentRegistry` (no student NFT).

---

## Prerequisites

Install these **before** cloning:

| Tool | Version | Purpose |
|------|---------|---------|
| [Git](https://git-scm.com/) | any recent | Clone repo and submodules |
| [Node.js](https://nodejs.org/) | **20+** recommended | Frontend and indexer |
| npm | bundled with Node | Package installs |
| [Foundry](https://book.getfoundry.sh/getting-started/installation) | latest (`forge`, `cast`, `anvil`) | Compile, test, deploy contracts |
| `make` | — | Local dev shortcuts (preinstalled on macOS/Linux; on Windows use WSL) |
| `curl` | — | Health checks for Anvil |
| [MetaMask](https://metamask.io/) (or similar) | — | Connect wallets in the UI |

### Foundry installation

```bash
curl -L https://foundry.paradigm.xyz | bash
foundryup
forge --version
```

### Linux / WSL (indexer native module)

The indexer depends on `better-sqlite3`, which compiles native code. If `npm install` fails in `indexer/`, install build tools:

```bash
# Debian / Ubuntu / WSL
sudo apt update && sudo apt install -y build-essential python3
```

### Optional

- **IPFS** (CLI or pinning service) — required only when issuing real diploma JSON in production; for local dev you can host JSON under `frontend/public/` or use a public gateway after pinning elsewhere.
- **WalletConnect project ID** — optional; a default is bundled for local Anvil. Set `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` for production.

---

## Clone the repository

Use **recursive clone** so Foundry dependencies (`forge-std`, OpenZeppelin) are present:

```bash
git clone --recurse-submodules https://github.com/robivagner/UnivChain.git
cd UnivChain
```

If you already cloned without submodules:

```bash
git submodule update --init --recursive
```

Verify contracts compile:

```bash
make build
# or: cd blockchain && forge build
```

Run the test suite (optional but recommended):

```bash
make test
# 119+ tests — unit, integration, fuzz
```

---

## Install dependencies

Dependencies fall into three layers. You need **layers 1 and 2** before `make local`; layer 3 is installed automatically by the Makefile on first run.

### 1. System tools (once per machine)

Install everything listed under [Prerequisites](#prerequisites) above: **Git**, **Node.js 20+**, **npm**, **Foundry** (`forge`, `anvil`, `cast`), **make**, **curl**, and **MetaMask** for the UI.

On Linux/WSL, also install **build-essential** if the indexer’s `npm install` fails (see [Linux / WSL](#linux--wsl-indexer-native-module)).

### 2. Blockchain libraries (Solidity / Foundry)

Comes from **git submodules** (not npm). After clone:

```bash
git submodule update --init --recursive   # if you did not use --recurse-submodules
cd blockchain
forge build                               # compiles contracts + pulls in lib/ deps
```

This provides **OpenZeppelin Contracts** and **forge-std** under `blockchain/lib/`. No separate `forge install` step is needed when submodules are present.

### 3. Node packages (frontend + indexer)

| Package | Directory | Install command | When Makefile runs it |
|---------|-----------|-----------------|------------------------|
| Frontend (Next.js, wagmi, RainbowKit) | `frontend/` | `npm install` | `make frontend-install` or first `make frontend-dev` / `make dev` |
| Indexer (viem, better-sqlite3) | `indexer/` | `npm install` | `make indexer-install` or `make local` / `make dev` |

Install both explicitly (optional — `make dev` does this for you):

```bash
make frontend-install
make indexer-install
```

Or manually:

```bash
cd frontend && npm install && cd ..
cd indexer && npm install && cd ..
```

**Nothing else to install** for a standard local run: no Docker, no IPFS node, no separate database server (SQLite is embedded in the indexer).

---

## Quick start (local, ~2 minutes)

From the **repository root**:

```bash
make local    # Anvil + deploy + Mock USDC + sync addresses + indexer npm install
make dev      # indexer (8787) + Next.js (3000) in parallel
```

Then open [http://localhost:3000](http://localhost:3000).

| Service | URL |
|---------|-----|
| Web app | http://localhost:3000 |
| Anvil RPC | http://127.0.0.1:8545 (chain ID **31337**) |
| Indexer API | http://127.0.0.1:8787 |

`make local` does the following:

1. Stops any old Anvil instance and clears indexer SQLite data
2. Starts Anvil in the background
3. Deploys all contracts (admin = Anvil account **#0**)
4. Syncs addresses to `frontend/src/constants/contracts.ts` and `indexer/config.json`
5. Deploys **Mock USDC** and sets the registration fee on `UniversityCore`
6. Runs `npm install` in `indexer/` if needed (`frontend/` deps install on first `make dev`)

---

## Manual setup (step by step)

If you prefer control over each step:

```bash
make anvil              # start Anvil (31337)
make deploy             # deploy contracts to running Anvil
make sync-frontend      # write addresses + deployBlock to frontend & indexer
make setup-dev          # deploy + sync + Mock USDC + fee (or run after deploy)
make indexer-install    # npm install in indexer/
make frontend-install   # npm install in frontend/
make dev                # run indexer + frontend
```

Useful commands:

```bash
make help           # list all targets
make anvil-status   # is Anvil running?
make anvil-logs     # tail Anvil log
make anvil-stop     # stop background Anvil
make redeploy       # restart Anvil and redeploy (keeps indexer DB unless you clean it)
make clean-indexer-data   # reset pending-enrollment queue
make frontend-prod  # production build + start (no hot reload)
```

---

## Configure MetaMask for Anvil

The frontend only connects to **chain ID 31337** (local Anvil).

1. In MetaMask: **Add network** → custom network  
   - **RPC URL:** `http://127.0.0.1:8545`  
   - **Chain ID:** `31337`  
   - **Currency symbol:** `ETH`
2. **Import test accounts** from Anvil’s startup output (or use the well-known defaults):

| Account | Role (typical) | Private key (Anvil default #0) |
|---------|----------------|--------------------------------|
| #0 | Admin, deployer, default diploma issuer | `0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80` |
| #1 | Student | `0x59c6995e998f97a5a0044966f094538e9dc98e539dff6760c0eb669627aa7f95` |
| #2 | Professor | `0x5de4111afa1a4b94908b381fbff96658b098212da6308440e7e9e4d4367b6b1` |
| #3 | Extra issuer / student | `0x7c852118294e51e653712a8234c5bb839b534107f164e0ff9ecc4878500c763d` |

> **Security:** These keys are **public test keys**. Never use them on mainnet or with real funds.

Switch MetaMask to the **Anvil** network before using the app.

---

## Using the application (test walkthrough)

### 1. Student — request enrollment

1. Connect wallet (e.g. Anvil account **#1**).
2. Go to **Student** (`/pages/student`).
3. Click **Get Mock USDC (test)** — mints test tokens for the registration fee.
4. Submit **Request enrollment** (approves + pays fee to the protocol).
5. Status becomes “pending” until an admin accepts.

### 2. Admin — accept enrollment & grant roles

1. Connect wallet as account **#0** (deployer has `ADMIN_ROLE`).
2. Open **Admin** (`/pages/admin`).
3. **Pending enrollments** — loaded via indexer; accept or reject (reject refunds the fee).
4. On accept, provide a **matriculation hash** (e.g. `keccak256` of a student ID string).
5. **Grant roles:**
   - `PROFESSOR_ROLE` → professor wallet (e.g. account #2)
   - `DIPLOMA_ISSUER_ROLE` → issuer wallet (account #0 is issuer by default after deploy)

### 3. Professor — subjects & grades

1. Connect as the professor wallet.
2. Open **Professor** (`/pages/professor`).
3. Create subjects (or admin assigns subjects to professors).
4. Post **final grades** (1–10) for enrolled students.

Graduation requires enough **ECTS credits** and minimum **weighted average** (defaults: **180** credits, **5.00** average — see deploy script).

### 4. Diploma issuer — sign & mint diploma

1. Connect as a wallet with `DIPLOMA_ISSUER_ROLE`.
2. Open **Issuer** (`/pages/issuer`).
3. Enter student address; confirm eligibility (credits + average).
4. **Sign credential (EIP-712)** — builds [`univchain-diploma-1`](frontend/src/lib/diploma/README.md) JSON.
5. **Download** `credential.json`, pin to IPFS (or host over HTTPS).
6. Paste **metadata URI** (`ipfs://…`) and **Graduate & mint on-chain**.

See [`frontend/src/lib/diploma/README.md`](frontend/src/lib/diploma/README.md) for JSON layout and hash rules.

### 5. Verifier — check a diploma

1. Open **Verify** (`/pages/verify`).
2. Enter student address and/or diploma **token ID**.
3. The app checks on-chain validity, EIP-712 signature, and document hash when JSON is reachable.

### 6. Student — after graduation

Graduated students see their diploma summary and credential link on **Student portal** (`/pages/student`).

---

## Environment variables

### Local Anvil (defaults)

`make deploy` and `make local` set `PRIVATE_KEY` to Anvil account #0 automatically. No `.env` file is required for local work.

### `blockchain/.env` (Sepolia / remote)

Copy the example and edit:

```bash
cp blockchain/.env.example blockchain/.env
```

| Variable | Description |
|----------|-------------|
| `PRIVATE_KEY` | Deployer wallet (hex, no `0x` prefix in Foundry env) |
| `RPC_URL` | JSON-RPC endpoint (e.g. Alchemy / Infura Sepolia) |

Deploy to a remote network:

```bash
cd blockchain
source .env   # or export vars manually
forge script script/DeployUniversity.s.sol:DeployUniversity \
  --rpc-url "$RPC_URL" \
  --broadcast
```

Then sync addresses manually or extend `scripts/sync-frontend-addresses.mjs` for your chain ID. Details: [`blockchain/README.md`](blockchain/README.md).

### Frontend (optional)

| Variable | Default | Description |
|----------|---------|-------------|
| `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` | bundled dev id | [WalletConnect Cloud](https://cloud.walletconnect.com/) project |
| `NEXT_PUBLIC_IPFS_GATEWAY` | `https://ipfs.io/ipfs/` | Gateway for resolving `ipfs://` diploma URIs |
| `INDEXER_URL` | `http://127.0.0.1:8787` | Next.js API routes proxy to indexer |

Create `frontend/.env.local` only if you need to override defaults:

```env
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_project_id
INDEXER_URL=http://127.0.0.1:8787
```

### Indexer (optional)

| Variable | Default | Description |
|----------|---------|-------------|
| `INDEXER_PORT` | `8787` | HTTP API port |
| `INDEXER_SYNC_INTERVAL_MS` | `15000` | Poll interval for new blocks |

Contract addresses and RPC URL live in **`indexer/config.json`** (generated by `make sync-frontend`, gitignored).

---

## Generated / gitignored files

Do not commit these; they are recreated by `make` targets:

| Path | Created by |
|------|------------|
| `indexer/config.json` | `make sync-frontend` |
| `indexer/data/` | indexer runtime (SQLite) |
| `blockchain/broadcast/`, `blockchain/cache/` | Foundry |
| `blockchain/anvil.log`, `blockchain/.anvil.pid` | `make anvil` |
| `frontend/.next/`, `node_modules/` | npm |
| `blockchain/.env` | you (from `.env.example`) |

After **`make redeploy`** or a fresh **`make local`**, run **`make sync-frontend`** if you deployed without `setup-dev`, and use **`make clean-indexer-data`** if the admin queue shows stale requests.

---

## Development reference

### Smart contracts

```bash
cd blockchain
forge build
forge test
forge test --mt testFuzz_FullAcademicCycle -vvv   # verbose integration fuzz
forge coverage
```

### Frontend only

```bash
make frontend-install
make frontend-dev      # http://localhost:3000
make frontend-build
make frontend-start    # production server
```

### Indexer only

```bash
make indexer-install
make indexer-dev       # http://127.0.0.1:8787
make indexer-sync      # one-shot sync
```

Indexer endpoints:

- `GET /health`
- `GET /api/pending-enrollments`
- `POST /api/sync` — force resync (called after admin accept/reject)

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| `Anvil not reachable` | Run `make anvil` or `make local` |
| Frontend shows wrong / zero addresses | Run `make sync-frontend` after deploy |
| `Missing indexer/config.json` | Run `make sync-frontend` |
| Admin pending list empty after enroll | Ensure `make dev` is running (indexer + frontend); wait ~15s or POST `/api/sync` |
| MetaMask “wrong network” | Switch to chain **31337**, RPC `http://127.0.0.1:8545` |
| Enrollment token not configured | Run `make setup-dev` or full `make local` |
| `forge: command not found` | Install Foundry (`foundryup`) |
| Indexer `npm install` fails on `better-sqlite3` | Install `build-essential` (Linux/WSL) |
| Diploma verify fails JSON check | Ensure pinned file matches downloaded credential; URI must be publicly fetchable |
| Port 3000 / 8787 in use | Stop other processes or change ports (`INDEXER_PORT`, Next.js `-p`) |

---

## Further reading

- [`blockchain/README.md`](blockchain/README.md) — contract architecture, testing, Sepolia deployment  
- [`frontend/src/lib/diploma/README.md`](frontend/src/lib/diploma/README.md) — EIP-712 diploma JSON (`univchain-diploma-1`)  
- [`indexer/README.md`](indexer/README.md) — indexer API and SQLite behaviour  

---

## License

See repository license files. Smart contracts in `blockchain/src` are **MIT** unless noted otherwise in SPDX headers.
