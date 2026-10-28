# MongoDB development setup

OEP-13 (#22) and OEP-43 (#52) use MongoDB through Mongoose. Transactional answer/finalization/result writes require a replica set or Atlas. A standalone server on 27017 cannot satisfy these contracts.

## Local setup

Prerequisites: Node 24, npm and an installed MongoDB `mongod` binary. From the repository root:

```powershell
npm ci --prefix server
npm ci --prefix client
Copy-Item server/.env.example server/.env
npm run db:dev --prefix server
```

The helper discovers the standard MongoDB Windows installation, otherwise uses `mongod` on PATH. Set `MONGOD_BINARY` to an explicit binary path if needed. It starts only a dedicated loopback listener on **27018**, initializes replica set **oep-dev**, and persists data/logs under ignored `server/.local-mongodb/`. It does not alter the MongoDB Windows service, the earlier standalone 27017 data, or another replica set. Keep its terminal running. Ctrl+C stops the helper's own child process; restarting reuses the same files. If the port is occupied, identify that process rather than starting a second helper or deleting database files.

In `server/.env`, use:

```dotenv
MONGO_URI=mongodb://127.0.0.1:27018/online_exam_portal?replicaSet=oep-dev
PORT=5000
SESSION_SECRET=replace_with_a_long_random_secret
NODE_ENV=development
CLIENT_ORIGIN=http://localhost:5173
TRUST_PROXY=0
```

Generate a real secret with `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` and replace the placeholder locally. `.env` and local database files are ignored by Git. Never commit credentials or paste a production URI into logs/issues. MongoDB Compass may use the same local URI. This unauthenticated loopback-only development replica set is not a production deployment.

From another terminal, run:

```powershell
npm run db:check --prefix server
npm run seed --prefix server
npm start --prefix server
```

`db:check` verifies connectivity, topology and index creation for User, Exam, Attempt, Response and Result; it prints model/index names, not credentials. The server performs the same readiness/index checks before accepting traffic. The development seed creates/resets only the documented demo accounts; use it only in the named development database. It refuses production mode. For a fresh real deployment, provision the first Admin through the secure [bootstrap procedure](AUTH_AND_EXAM_API.md), not the demo seed.

Start the client separately with `npm run dev --prefix client -- --host localhost --port 5173 --strictPort`. Open http://localhost:5173; API health is http://localhost:5000/. The exact frontend origin must match CLIENT_ORIGIN.

## Atlas and existing deployments

An authorized Atlas cluster may supply a credential-bearing MONGO_URI through process environment or ignored `.env`; configure its own user/network access outside Git. Use a replica-set/transaction-capable deployment, least-privilege application credentials and TLS. Do not point tests at it. A single-node replica set suffices for local transactions but provides no production high availability. Production HTTPS/session proxy checks remain deployment work.

Old experimental persistence documents using loginIdentifier/isActive/deadlineAt/maximumScore or embedded responses are not migrated automatically. Use a backed-up, explicitly reviewed migration before reusing those datasets. The new local helper uses a different port/data directory so the previous database is preserved.

## Tests and troubleshooting

Backend and real-network frontend tests start their own disposable real MongoDB replica sets and never use application MONGO_URI. With MongoDB installed on this Windows machine:

```powershell
$env:MONGOMS_SYSTEM_BINARY='C:\Program Files\MongoDB\Server\8.2\bin\mongod.exe'
$env:MONGOMS_SYSTEM_BINARY_VERSION_CHECK='false'
npm test --prefix server
npm test --prefix client
```

Otherwise the test helper downloads its pinned binary on first run. For `ECONNREFUSED`, start the database first and verify the URI port. For transaction-number/standalone errors, use the replica-set URI above. For index conflicts or duplicate existing data, back up and inspect the data; do not drop records or indexes merely to force startup. For stale schema names, use the canonical [Field Layout](OEP-18_Field_Layout.md) and migration review. Teammates must record their own setup verification; this document does not claim runs on their machines.
