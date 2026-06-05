# UnivChain indexer

Off-chain service that incrementally scans chain events and serves fast read APIs for the admin and professor portals.

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
- `GET /api/pending-enrollments` — admin enrollment queue
- `GET /api/professor/grades?professor=0x…` — indexed grades for a professor wallet
- `GET /api/professor/subjects?professor=0x…` — subjects assigned to a professor
- `GET /api/student/transcript?student=0x…` — graded subjects for a student
- `POST /api/sync` — run indexer immediately (after admin or professor writes)

The Next.js app proxies these at:

- `/api/admin/pending-enrollments`
- `/api/professor/grades`
- `/api/professor/subjects`
- `/api/student/transcript`

## Data

SQLite database: `data/univchain.db` (gitignored).

Indexed tables:

- **enrollment_requests** — from `StudentEnrollmentRequested` / accept / reject events
- **subjects** — from `SubjectAdded` and `SubjectActivityChanged` on Gradebook
- **student_grades** — from `GradePosted` on Gradebook (updates on grade changes / retakes)

On redeploy (UniversityCore or Gradebook address change), indexed rows are reset automatically.

The indexer keeps **separate scan cursors** for enrollment events and Gradebook events. If you upgrade the indexer after subjects/grades were already on-chain, the Gradebook cursor starts from `deployBlock` and backfills historical `SubjectAdded` / `GradePosted` logs on the next sync — no manual DB wipe required.

To force a full re-index from scratch: `make clean-indexer-data` then restart the indexer.
