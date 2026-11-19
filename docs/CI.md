# GitHub Actions and local verification

**Current alignment — 20 November 2026:** SonarQube Cloud is the static-analysis service; GitHub Actions remains the sole CI provider. The optional Ubuntu Sonar upload is conditional and was skipped in main run 44588050194. Automatic Analysis separately passed its quality gate for 5966da9; it did not report coverage. Current tests, coverage and evidence are in [submission verification](SUBMISSION_VERIFICATION.md). The November 5 execution below is historical. Locked CI installs now use `--ignore-scripts`; the test stage also runs two Node tooling security regression cases, and the workflow prepares combined LCOV after the suites.

For SonarQube findings, checksum false positives and the owner setup required to
import coverage, see [SonarQube Cloud checks](SONARQUBE.md).

Final guide, 5 November 2026. GitHub Actions is the sole CI provider. The application workflow runs on pushes and PRs to develop/main, using Node 24 and an Ubuntu/Windows matrix. Repository checks separately verify whitespace and relative Markdown links.

From the repository root, run `node scripts/ci.mjs all`. Stages are clean output preflight, locked npm installs, server syntax/client lint/production build, backend/frontend coverage suites, standalone scoring, real Playwright browser workflows, deliberate-failure detection, ten acceptance diagnostics and a validated evidence manifest. Actual commands are defined in scripts/ci.mjs. Browser tests use installed Edge by default on Windows, otherwise installed Playwright Chromium; set OEP_BROWSER_CHANNEL=chrome or msedge to select explicitly.

Run the classroom benchmark separately with `npm run test:performance --prefix server`. It uses a disposable real MongoDB replica set, real MongoStore sessions, 30 active students and a 30-second answer-load/save workload plus list/start/submit/results. It validates revisions, score and persisted records, and fails on errors or endpoint p95 over 2000 ms. Login/setup, external networking and sustained capacity are excluded. It is kept separate from hosted CI latency because hardware differs.

The latest local execution passed 106 backend, 54 frontend/component/HTTP-system, 5 scoring, 3 Edge and 3 Chrome workflows. Seven existing optional Jest security cases also passed using a temporary isolated runner that prevented the legacy .env.test override from selecting a persistent database. These seven are not part of the default CI command. Both production npm audits reported zero known advisories.

Generated outputs are server/client reports and coverage, client/dist and ci-evidence/run.json. They are ignored working outputs; the final retained [four reports and raw evidence](FINAL_CHECKPOINT_REPORT.md) are in docs/evidence/checkpoint-2026-11-04. Earlier evidence directories are dated historical records. Hosted CI runs after publication are separate observations; local success is not labeled a GitHub run.

Automation does not certify deployment/HTTPS, faculty acceptance of tooling deviations, team approvals or viva knowledge. [Final design changes](FINAL_DEVIATIONS.md) and the [submission checklist](FINAL_SUBMISSION_CHECKLIST.md) record those limits. Do not run destructive legacy tests against the configured application database.
