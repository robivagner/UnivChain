# UnivChain: A Decentralized University Management System

## Local development (Anvil)

From the repo root (requires [Foundry](https://book.getfoundry.sh/) and Node.js):

```bash
make help          # list targets
make local         # fresh Anvil + deploy + sync + Mock USDC; clears indexer/data (SQLite)
make anvil         # start Anvil only (chain 31337, port 8545)
make deploy        # deploy to a running Anvil
make sync-frontend # copy addresses + deployBlock into frontend + indexer/config.json
make dev           # indexer (8787) + Next.js (3000) in parallel
make indexer-dev   # enrollment indexer only
make frontend-dev  # Next.js only
```

`make deploy` uses Anvil account **#0** (see `anvil` startup output). After a fresh deploy, run `make sync-frontend` so `frontend/src/constants/contracts.ts` and `indexer/config.json` stay aligned.

### Indexer

The `indexer/` service scans `StudentEnrollmentRequested` (and related) events incrementally, stores state in SQLite, and exposes `GET /api/pending-enrollments`. The admin UI loads the queue via Next.js `/api/admin/pending-enrollments` (proxy to the indexer).

Start after `make local`:

```bash
make dev   # recommended: indexer + frontend
```

Copy `blockchain/.env.example` to `blockchain/.env` when deploying to Sepolia or other networks.