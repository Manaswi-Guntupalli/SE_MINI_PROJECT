# Application CI and Jenkins

This contribution implements the repository work for [#42](https://github.com/Manaswi-Guntupalli/SE_MINI_PROJECT/issues/42) and [#44](https://github.com/Manaswi-Guntupalli/SE_MINI_PROJECT/issues/44). GitHub Actions and Jenkins execute the same committed scripts. The existing repository/documentation workflow remains separate. **Application CI verifies the implemented prototype, not full Release 1 acceptance**; the [acceptance review](SPRINT_1_ACCEPTANCE_REVIEW.md) records missing authentication and other defects.

## Recorded tools and reproducible commands

Use Node **24.22.1** from `.node-version` (the scripts reject other major versions), npm and Git. Install development dependencies; tests cannot run with `NODE_ENV=production` or `npm ci --omit=dev`. Both application lockfiles are committed. No root `npm install` is required.

From the repository root:

```sh
node scripts/ci.mjs all
```

| Stage | Actual commands or behavior | Required result |
|---|---|---|
| preflight | Record Node/npm, platform and checked-out Git SHA | Node 24 and Git available |
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

`.github/workflows/application-ci.yml` runs automatically on repository pushes and PRs targeting `develop` or `main`; it can also be dispatched manually when available on the default branch. Ubuntu and Windows jobs use Node from `.node-version` and the same stages as Jenkins. Required install/build/lint/test failures fail the job. There is no `continue-on-error` on those stages.

Reports, coverage and production assets upload on both success and failure, when generated. Artifacts are retained for 14 days; download required course evidence before expiry. The job summary explicitly lists failed acceptance diagnostics. Read it even when the prototype test job is green.

Open [GitHub Actions](https://github.com/Manaswi-Guntupalli/SE_MINI_PROJECT/actions), select **Application CI**, open the exact commit's run and inspect both OS jobs. The old **Repository checks** job only checks whitespace/Markdown links and is not application-test evidence.

## Configure the existing Windows Jenkins installation

The earlier `OEP-33-Jenkins-Readiness` job proved local Git/Python/checkout/documentation checks and a deliberate batch failure. Keep its retained evidence. It does **not** execute these new MERN tests.

1. In the same Windows account/environment Jenkins runs under, verify `node --version`, `npm --version` and `git --version`. Node must be 24; use the recorded version. If Node was installed while Jenkins was running, restart Jenkins to refresh PATH. Keep the Java installation already used to run Jenkins.
2. Ensure the **Pipeline** and **Git** plugins are installed. No NodeJS, Docker, coverage, JUnit or GitHub webhook plugin is required by this Jenkinsfile; XML/coverage files are archived directly.
3. Create a new **Pipeline** job named `OEP-33-MERN-CI`. Use a dedicated workspace; the Jenkinsfile cleans that job's workspace before checkout. Preserve the old readiness job.
4. Configure **Definition: Pipeline script from SCM**, **SCM: Git**, repository URL `https://github.com/Manaswi-Guntupalli/SE_MINI_PROJECT.git`. The public repository needs no credential for read-only checkout. Never paste a PAT or MongoDB URI into the script, console or repository. If the repository later becomes private, select a least-privilege Jenkins-stored credential by ID.
5. Before merge, set **Branch Specifier** to `*/chore/OEP-33-OEP-35-application-ci`. After the reviewed PR merges, change it to `*/develop`. Set **Script Path** to `Jenkinsfile`; save. Do not paste it into an inline job: `checkout scm` needs the configured SCM context.
6. Choose **Build Now** for the first run. The Jenkinsfile then defines `VERIFY_FAILURE_PATH`; its default is false. The first run also registers polling every five minutes while Jenkins is running. No public localhost webhook or tunnel is necessary. Polling triggers on source changes, not merely because the clock reaches a poll interval.
7. Check the checkout SHA, locked installs, frontend lint/build, both suites and archived artifacts. `npm ci` and the first MongoDB binary download can take several minutes. Keep the successful application run and its console output.
8. Choose **Build with Parameters**, set **VERIFY_FAILURE_PATH=true**, and build. It must fail at **Prove failing tests are detected**, with the deliberately wrong `Draft` versus `Published` assertion recorded in `negative-control.json`. Later normal stages are skipped and available reports are still archived. Keep this intentionally red run as evidence; it is not a product defect.
9. Run again with **VERIFY_FAILURE_PATH=false** and verify recovery to SUCCESS. Keep this green run too. Record the three build numbers, checked-out commit and console/artifact links in the PR. Do not leave the failure parameter true for normal builds.
10. Once the first passing run is configured, a later committed repository change must be picked up by SCM polling (or a manually started checkout of that new commit). Confirm its new SHA in the build log. This establishes the real-change criterion for #42.

Jenkins archives reports/coverage/dist/evidence in `post { always { ... } }` and keeps 15 builds by default. Use **Keep this build forever** on the course-evidence runs or export them before normal retention removes them. JUnit XML can optionally be published into Jenkins' test UI if the team later installs the JUnit plugin; it is already retained as a downloadable artifact.

## Passing and failure evidence

The local complete command has been executed with real MongoDB and real test reports. An intentional assertion failure is also verified with the same test runner; `node scripts/ci.mjs verify-failure-propagate` exits 1 and removes the temporary failing file. Run `node scripts/ci.mjs all` afterward to verify normal recovery. The wrapper's successful negative-control check is not by itself proof that an entire hosted CI run became red; use the actual run links recorded below/with the PR.

Executed hosted evidence for implementation commit `817f5aa2c4f7bb85a92338373abd4b667fe67930`:

| Run | Result | What was verified |
|---|---|---|
| [Application CI push 40068235351](https://github.com/Manaswi-Guntupalli/SE_MINI_PROJECT/actions/runs/40068235351) | SUCCESS on Ubuntu and Windows | Locked installs, lint/build, 24 backend + 11 frontend tests, coverage, real negative-control assertion, acceptance diagnostics and artifact upload |
| [Application CI PR 40068270152](https://github.com/Manaswi-Guntupalli/SE_MINI_PROJECT/actions/runs/40068270152) | SUCCESS | PR trigger executes the same pipeline |
| [Intentional failure 40068368568](https://github.com/Manaswi-Guntupalli/SE_MINI_PROJECT/actions/runs/40068368568) | Expected FAILURE on Ubuntu and Windows | Isolated proof commit `e831fa51cb31cf9547fc232a10dd52ceebf48b07` changed the real draft-default test's expected value to Published; the required test stage failed with 1 failed / 23 passed and exit 1; reports/coverage still uploaded |

The deliberate assertion change exists only on `test/OEP-35-ci-failure-proof`; it is not part of the implementation PR and must not be merged. The correct expectation remains on the reviewed implementation branch. No earlier documentation-only Jenkins/Actions result is represented as an application pipeline result. The assistant cannot reach Manaswi's Windows `localhost` Jenkins from the remote workspace; that installation's configuration/build remains unverified until its actual console/artifact evidence is available.

## Completion checks for the existing tasks

| Issue | Repository implementation | Evidence needed before calling the task fully complete |
|---|---|---|
| #42 | Versioned Jenkinsfile; SCM polling; recorded build/install scripts; required test integration; nonzero failures; safe read-only checkout; retained artifacts | Actual configured Jenkins passing run for a repository change, intentional failing run and recovery; teammate review |
| #44 | Native Actions workflow; genuine frontend/backend suites; required failures; JUnit/coverage artifacts; isolated failure verification | Actual Actions passing/failing run evidence and teammate review/merge |

This PR relates to the existing issues without auto-closing them. Issue/Project statuses and all scheduling fields are preserved. Green CI does not complete Tanusha's missing acceptance criteria or the final #53 system/security deliverable.
