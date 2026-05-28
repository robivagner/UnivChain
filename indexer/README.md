# UnivChain indexer

Off-chain service that incrementally scans enrollment events and serves the admin pending queue.

## Setup

After deploying contracts:

```bash
make sync-frontend   # writes config.json from Foundry broadcast
npm install          # or: make indexer-install
```

`config.json` is gitignored; it is generated with contract addresses and `deployBlock`.

## Run

```bash
make indexer-dev     # API on http://127.0.0.1:8787, sync every 15s
npm run sync         # one-shot sync
```

Endpoints:

- `GET /health`
- `GET /api/pending-enrollments`
- `POST /api/sync` — run indexer immediately (used after admin accept/reject)

The Next.js app proxies this at `/api/admin/pending-enrollments`.

## Data

SQLite database: `data/univchain.db` (gitignored).

On redeploy (UniversityCore address change), indexed rows are reset automatically.
