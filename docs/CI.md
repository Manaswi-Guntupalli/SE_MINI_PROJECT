# GitHub Actions application CI

This contribution implements the repository work for [#42](https://github.com/Manaswi-Guntupalli/SE_MINI_PROJECT/issues/42) and [#44](https://github.com/Manaswi-Guntupalli/SE_MINI_PROJECT/issues/44). GitHub Actions is the sole CI provider and executes the committed scripts; no local CI server setup is required. The existing repository/documentation workflow remains separate. **Application CI verifies the implemented prototype, not full Release 1 acceptance**; the [acceptance review](SPRINT_1_ACCEPTANCE_REVIEW.md) records missing authentication and other defects.

## Recorded tools and reproducible commands

Use Node **24.22.1** from `.node-version` (the scripts reject other major versions), npm and Git. Install development dependencies; tests cannot run with `NODE_ENV=production` or `npm ci --omit=dev`. Both application lockfiles are committed. No root `npm install` is required.

From the repository root:

```sh
node scripts/ci.mjs all
```

| Stage | Actual commands or behavior | Required result |
|---|---|---|
| preflight | Record Node/npm, platform and checked-out Git SHA; clear generated reports/coverage/manifest/dist from prior runs | Node 24 and Git available; no stale success evidence |
| install | `npm ci --prefix server --no-audit --no-fund` and same for client | Locked installs succeed |
| build | Server `node --check` on entry/app/controllers/models/routes; client ESLint and Vite production build | Syntax/lint/build succeed; `client/dist/index.html` exists |
| test | `npm run test:ci --prefix server` and same for client | Real Vitest suites pass; JUnit and V8 coverage emitted |
| verify-failure | Run a genuinely wrong Exam-schema assertion in an isolated temporary test file | Exact assertion fails and runner returns nonzero; verification wrapper confirms this |
| acceptance-report | `node scripts/audit-sprint1.mjs --report-only` | Emit honest diagnostic results; known feature failures are advisory |
| evidence | Validate nonempty passing JUnit reports and frontend build; record SHA/toolchain/lockfile hashes/coverage/acceptance counts | Evidence manifest saved |

Individual stages are available as `node scripts/ci.mjs <stage>`. The CommonJS backend has no transpilation step: its build stage is explicitly syntax validation, not a claimed compiled server artifact.

### Tests and database isolation

Vitest is selected for the existing Vite/React project and also runs the backend suites. React Testing Library exercises components; Supertest sends actual HTTP requests to Express; `mongodb-memory-server-core` starts **real MongoDB 8.0.17** on localhost with a random port and unique disposable data directory. It is not a mocked persistence test. The binary downloads on first use, so allow the first run time and network access; no MongoDB Windows service or Atlas credential is needed for CI.

Tests never read the application's `MONGO_URI`, never reset a team database, and remove their own temporary database files/processes. Linux tests disable Unix sockets for restricted containers. Allow localhost loopback for the isolated test process. MongoDB version pinning here is a test-environment choice, not a declaration of the eventual deployment database version.

The initial suite has **24 backend tests** (schema validation and HTTP/database integration) and **11 frontend component tests**. They cover real draft/MCQ/publish behavior, failure cases and UI interactions. The client HTTP layer is mocked; no claim of browser end-to-end, authentication, timer, evaluation, load, compatibility or full system/security coverage is made. Those features and their tests remain incremental work under #53.

The existing validation specification names Jest. This implementation uses Vitest, Supertest and React Testing Library to match the current Vite toolchain; document/review this tool deviation before final freeze. It is not a claim that a new team decision was already agreed.

### Reports and coverage

| Output | Location |
|---|---|
| JUnit XML | `server/reports/junit.xml`, `client/reports/junit.xml` |
| V8 coverage summary, LCOV and Cobertura | Each application's `coverage/` directory |
| Verified intentional assertion failure | `server/reports/negative-control.json` and `.log` |
| Acceptance findings with expected/actual values | `server/reports/sprint1-acceptance.json` |
| Commit, tools, lockfile hashes and measured coverage | `ci-evidence/run.json` |
| Frontend production assets | `client/dist/` |

Coverage is measured for `server/app.js`, controllers/models/routes and `client/src/App.jsx`. The server startup process and future unimplemented modules are outside this denominator. The initial local run measured **86.52% backend line coverage** and **72.41% App line coverage**. Reports preserve branch/function/statement metrics too. These are measurements for this scope, not a whole-product coverage promise or a substituted requirement threshold.

## GitHub Actions

`.github/workflows/application-ci.yml` runs automatically on repository pushes and PRs targeting `develop` or `main`; it can also be dispatched manually when available on the default branch. Ubuntu and Windows jobs use Node from `.node-version` and the committed CI stages. Required install/build/lint/test failures fail the job. There is no `continue-on-error` on those stages.

Reports, coverage and production assets upload on both success and failure, when generated. Artifacts are retained for 14 days; download required course evidence before expiry. The job summary explicitly lists failed acceptance diagnostics. Read it even when the prototype test job is green.

Open [GitHub Actions](https://github.com/Manaswi-Guntupalli/SE_MINI_PROJECT/actions), select **Application CI**, open the exact commit's run and inspect both OS jobs. The old **Repository checks** job only checks whitespace/Markdown links and is not application-test evidence.

## Passing and failure evidence

The local complete command has been executed with real MongoDB and real test reports. An intentional assertion failure is also verified with the same test runner; `node scripts/ci.mjs verify-failure-propagate` exits 1 and removes the temporary failing file. Run `node scripts/ci.mjs all` afterward to verify normal recovery. The wrapper's successful negative-control check is not by itself proof that an entire hosted CI run became red; use the actual run links recorded below/with the PR.

Executed hosted evidence for implementation commit `817f5aa2c4f7bb85a92338373abd4b667fe67930`:

| Run | Result | What was verified |
|---|---|---|
| [Application CI push 40068235351](https://github.com/Manaswi-Guntupalli/SE_MINI_PROJECT/actions/runs/40068235351) | SUCCESS on Ubuntu and Windows | Locked installs, lint/build, 24 backend + 11 frontend tests, coverage, real negative-control assertion, acceptance diagnostics and artifact upload |
| [Application CI PR 40068270152](https://github.com/Manaswi-Guntupalli/SE_MINI_PROJECT/actions/runs/40068270152) | SUCCESS | PR trigger executes the same pipeline |
| [Intentional failure 40068368568](https://github.com/Manaswi-Guntupalli/SE_MINI_PROJECT/actions/runs/40068368568) | Expected FAILURE on Ubuntu and Windows | Isolated proof commit `e831fa51cb31cf9547fc232a10dd52ceebf48b07` changed the real draft-default test's expected value to Published; the required test stage failed with 1 failed / 23 passed and exit 1; reports/coverage still uploaded |
| [Cleanup verification 40069198838](https://github.com/Manaswi-Guntupalli/SE_MINI_PROJECT/actions/runs/40069198838) and [PR run 40069202330](https://github.com/Manaswi-Guntupalli/SE_MINI_PROJECT/actions/runs/40069202330) | SUCCESS | Final pipeline code at `9755255eed635440a8f8b81ba9fd7a438a6a05af`, including generated-output cleanup, passes on both OSes |

The deliberate assertion change exists only on `test/OEP-35-ci-failure-proof`; it is not part of the implementation PR and must not be merged. The correct expectation remains on the reviewed implementation branch. The uploaded passing artifacts were downloaded and their saved JUnit, coverage, negative-control and acceptance values re-read; the failed run's XML was also re-read and contains exactly the intended failed assertion on each OS.

Permanent [verification metadata](evidence/ci-2026-10-24/verification.json), actual JUnit XML, coverage summaries, manifests and acceptance reports are retained under `docs/evidence/ci-2026-10-24/github-actions/` for both operating systems. The source run IDs and commit SHAs remain unchanged; historical reports are not relabelled as new executions.

The CI provider change is recorded in the [tooling decision](CI_TOOLING_DECISION.md). The current proposal, SRS, RTM, SAD and Test Plan name GitHub Actions consistently; earlier submitted versions remain in Git history. Current CI instructions require only GitHub Actions.

## Completion checks for the existing tasks

| Issue | Repository implementation | Evidence needed before calling the task fully complete |
|---|---|---|
| #42 | Native GitHub Actions workflow; automatic push/PR triggers; locked installs; build/lint stages; read-only permissions; real hosted pass/fail evidence | Teammate review/merge and documented course-tool substitution review |
| #44 | Native Actions workflow; genuine frontend/backend suites; required failures; saved/re-read JUnit/coverage artifacts; actual passing/failing hosted runs on both OSes | Teammate review/merge; full future system/security tests remain #53 |

This PR relates to the existing issues without auto-closing them. Issue/Project statuses and all scheduling fields are preserved. Green CI does not complete Tanusha's missing acceptance criteria or the final #53 system/security deliverable.

The current workflow builds and tests the prototype. Deployment automation and deployment/smoke evidence remain #45; CD is not claimed as implemented.
