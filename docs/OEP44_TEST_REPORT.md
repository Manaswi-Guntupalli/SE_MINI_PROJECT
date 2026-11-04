# OEP-44 Release 1 functional and security verification

Task: [#53](https://github.com/Manaswi-Guntupalli/SE_MINI_PROJECT/issues/53).
The [validation plan](08_Validation_Plan.md) is implemented by executable tests,
with requirement/code/test mappings in the [OEP-19 execution RTM](OEP-19_Release1_RTM.md).
This is local execution evidence, not a claim that a hosted CI run or teammate
review has already happened. CI wiring remains OEP-35.

## Reproduce

Use Node **24.22.1** from `.node-version` and install the locked development dependencies:

```sh
npm ci --prefix server
npm ci --prefix client
```

The browser suite uses installed Edge on Windows when available. Otherwise install
Playwright's Chromium from the client directory (`npx playwright install chromium`;
on Linux CI use `npx playwright install --with-deps chromium`). `OEP_BROWSER_CHANNEL`
can explicitly select an installed Playwright browser channel.

Run the complete check from the repository root:

```sh
node scripts/verify-release1.mjs
```

The collector executes backend and frontend suites with V8 coverage and JSON/JUnit
reports, standalone scoring units, real-browser tests, lint with zero warnings,
production build, backend syntax checks and a real intentional-failure control.
It checks all 17 functional and six security requirement mappings against actual
passing assertions. It rejects failures, skipped tests, flaky browser results,
backend line coverage below 70%, or source changes during the run.

For focused runs:

```sh
npm test --prefix server
npm run test:security --prefix server
npm run test:scoring --prefix server
npm test --prefix client
npm run test:browser --prefix client
```

`test:security` now uses the isolated acceptance suites. The historical
`server/tests/security.test.js` Jest script is not part of this execution and is
not invoked: it depended on an externally configured test database. No claims are
made about running that legacy script.

## Execution environment and evidence

The [execution manifest](evidence/oep44-2026-10-29/execution.json) records the real
timestamps, Node version, Windows architecture, command arrays, exit codes, base
commit and SHA-256 of each tested source/config/lockfile. The base commit is the
already-pushed results fix; the per-file hashes identify OEP-44's tested working
snapshot before its commit. This avoids falsely attributing new tests to the old SHA.

The database is a fresh, real MongoDB **8.0.17 replica set**, with disposable local
storage. Tests do not read application `.env` or target `MONGO_URI`/Atlas/team data.
The browser fixture serves Vite at `127.0.0.1:4173` and Express at `127.0.0.1:5011`.
These ports must be free. Its accounts and connection metadata are test-only;
the generated connection file stays under ignored `client/reports/`.

The actual browser version is recorded in each Playwright result's
`browser-version` annotation. The executed Windows browser was Microsoft Edge
**156.0.4314.50**, at a **1366 × 768** viewport. jsdom tests are identified separately
and are not counted as real-browser execution.

| Check | Evidence |
|---|---|
| Backend: 89 passing tests | [JSON assertions](evidence/oep44-2026-10-29/server-tests.json), [JUnit](evidence/oep44-2026-10-29/server-junit.xml) |
| Frontend/component/HTTP system: 24 passing tests | [JSON assertions](evidence/oep44-2026-10-29/client-tests.json), [JUnit](evidence/oep44-2026-10-29/client-junit.xml) |
| Standalone scoring: 5 passing units | [Actual runner output](evidence/oep44-2026-10-29/scoring-output.txt) |
| Real browser: 2 passing system tests | [Playwright report](evidence/oep44-2026-10-29/browser.json), [JUnit](evidence/oep44-2026-10-29/browser-junit.xml), [end-state screenshot](evidence/oep44-2026-10-29/browser-admin.png) |
| Scoped backend and frontend coverage | [Backend V8 summary](evidence/oep44-2026-10-29/server-coverage.json), [frontend V8 summary](evidence/oep44-2026-10-29/client-coverage.json); exact percentage in manifest |
| Lint/build/syntax | Stage exit codes and timestamped output files referenced by the execution manifest |
| Assertion-failure detection | [Expected failing control](evidence/oep44-2026-10-29/negative-control.json); intentionally incorrect isolated assertion must return nonzero |
| Executed traceability | [Validated mappings](evidence/oep44-2026-10-29/traceability.json); no missing or failing mapped assertions |

Coverage includes the configured backend app/controllers/models/routes/middleware/
services and frontend `App.jsx`, `RoleDashboard.jsx`, `dateTime.js`. It excludes the
server startup wrapper, browser-fixture infrastructure and deployment configuration;
the reported percentage is not whole-repository coverage.

## Acceptance criteria audit

| #53 criterion | Verification |
|---|---|
| Authentication/logout, roles, ownership, direct unauthorized APIs | AC23-01..04; AC24-01..05; AC51-01..03; OEP44-SEC-01 |
| Draft CRUD, question/options, publication, eligibility and immutability | IT-EXAM, IT-MCQ, IT-PUBLISH, AC33/34/35/36, schema tests |
| Attempt creation/resume, deadline, save/change/navigation, reload, unanswered | OEP44-IT-01 and OEP44-ST-01; real reload checks the saved choices and unchanged deadline |
| Manual submission, browser-closed timeout, late writes, repeats and races | OEP44-IT-02 runs before/after deadline; OEP44-ST-02 closes its browser context, expires only its disposable DB fixture and waits for the real server worker |
| Scoring cases, nonnegative marks, persisted result, retry/idempotency | Scoring units; four manual-scoring variants; full-evaluation concurrency/retry and transactional rollback tests |
| Student/Instructor results and minimal Admin management | Result-ownership/pending/error tests; AC24/51; OEP44-ST-01 uses all roles |
| Validation/save/evaluation failures; integrated browser/server/DB | OEP44-FAIL-01; injected result write/status failures; UI error tests; OEP44-ST-01 aborts one save, verifies the error and reloads the previously acknowledged selection |
| Reproducible commands and actual results/defects | Evidence collector, raw assertions, commands, timestamps, hashes and defect record below |
| Test IDs mapped through OEP-19; suites ready for OEP-35 | Linked executed RTM and automated mapping checker; normal Vitest/JUnit plus standalone `test:browser` command |

## Defect record

**DEF-OEP44-001 — Unexpected answer-save failure exposed raw storage errors.**

- Reproduction: inject a failed `Response.findOneAndUpdate` during an authenticated
  answer-save HTTP request. `OEP44-FAIL-01` expects HTTP 500 and a safe retry message.
- Actual before fix: the route returned HTTP 400; its generic catch also sent the
  raw exception message to the client. [Original failing report](evidence/oep44-2026-10-29/defect-before.json)
  preserves the executed 400-versus-500 assertion failure.
- Fix: explicit parent/option validation errors carry HTTP 400. Unexpected storage
  failures return HTTP 500 with `Could not save answer. Please retry.`; private
  exception details are not sent. The transaction does not acknowledge or persist
  the failed selection.
- Verification: the same regression passes in the final backend report, including
  the safe-message, zero-response-write and active-attempt assertions. Existing
  invalid-parent and late-write tests remain passing. Status: **fixed and verified**.

The deliberately wrong negative-control assertion is expected to fail. It is
separate from normal suites and is not an application defect or a passed normal test.

## Scope and handoff

The integrated functional/security criteria of OEP-44 are the scope of these checks.
No blanket claim is made about the original RTM's 188 proposed cases, production
security certification, load/latency, all-browser compatibility, deployment or
teammate approval. Their separate tasks and acceptance evidence remain distinct.
The tests demonstrate the configured worker's behavior; the application must run
its server and required MongoDB replica set for browser-independent expiry.

For OEP-35, install the locked packages and Playwright browser on the runner, then
execute `node scripts/verify-release1.mjs` or the listed suites. Archive the dated
evidence directory and normal JUnit/coverage/browser reports, including failures.
Do not convert a local pass into a hosted CI claim. The team's final review/sign-off
can reference the exact commit and this evidence without rerunning against a shared DB.
