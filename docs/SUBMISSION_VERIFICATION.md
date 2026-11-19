# Final submission verification

Aligned 20 November 2026 after PRs #72 and #73 merged to main. Application baseline: [`5966da9`](https://github.com/Manaswi-Guntupalli/SE_MINI_PROJECT/commit/5966da9cbfd0d73844c9caa63aba345ca497b352). This update changes documents and retained evidence only; application/UI, dependencies and workflow configuration are unchanged.

## Verification results

| Check | Result |
|---|---|
| Complete local `node scripts/ci.mjs all` | Passed: backend 136, frontend 85, scoring 9, tooling security 2, Edge browser 3; **235 suite executions** |
| Frontend lint and production build; backend syntax/build | Passed |
| Acceptance diagnostic | 10 passed, zero failed |
| Failure detection | Deliberately incorrect assertion failed as expected; verification passed |
| Documentation parser regression cases | 3 passed |
| Production dependency audits | Backend and frontend: zero known advisories; raw `server-audit.json` and `client-audit.json` retained with the evidence |
| Sonar coverage preparation | Combined repository-relative frontend/backend LCOV generated successfully; no service upload claimed |
| Chrome named-browser rerun | All 3 workflows passed; separate from the 235 total |
| Scoped 30-user performance | 4440 requests, zero errors; p95 233.23 ms against 2000 ms |
| Backend V8 lines / branches | 91.35% / 78.72% |
| Frontend V8 lines / branches | 92.22% / 82.51% |
| Test Plan mappings | All 33 retained IDs mapped to fresh passing observations; original 32 SRS IDs retained |
| Existing hosted main CI | [44588050194](https://github.com/Manaswi-Guntupalli/SE_MINI_PROJECT/actions/runs/44588050194): Ubuntu and Windows passed on 5966da9 |
| SonarQube Cloud | Latest observed analysis revision 5966da9; quality gate **OK**, zero bugs, vulnerabilities, code smells and security hotspots |

The local suite ran on Windows x64 with Node 24.22.3 and isolated real MongoDB databases. Browser timestamps and manifest timestamps are UTC; the local review date is 20 November. Hosted status and local observations are distinct. See [raw evidence and manifest](evidence/submission-2026-11-20/execution.json).

## Required reports

- [Unit and integration report](evidence/submission-2026-11-20/UNIT_REPORT.md)
- [System validation report](evidence/submission-2026-11-20/SYSTEM_VALIDATION_REPORT.md)
- [Code coverage report](evidence/submission-2026-11-20/CODE_COVERAGE_REPORT.md)
- [Branch coverage report](evidence/submission-2026-11-20/BRANCH_COVERAGE_REPORT.md)
- [33-case execution mapping](evidence/submission-2026-11-20/test-plan-execution.json)

## Static analysis and its limits

Observed public service responses are retained: [analysis revision](evidence/submission-2026-11-20/sonar-analysis.json), [quality gate](evidence/submission-2026-11-20/sonar-quality-gate.json), [issue measures](evidence/submission-2026-11-20/sonar-measures.json), and [hosted job steps](evidence/submission-2026-11-20/hosted-jobs.json). The analysis is Automatic Analysis. The optional Actions Sonar upload was **skipped**; no coverage metric was returned by the service. V8 coverage above must not be presented as Sonar coverage. The observed gate conditions do not include a coverage threshold. The workflow does not explicitly wait for the Sonar quality gate.

Switching to optional CI analysis requires the owner setup in [SONARQUBE.md](SONARQUBE.md). It is not necessary to change the website to describe the verified existing analysis accurately. Static analysis supplements runtime security tests; neither is a penetration-test certification. Historical checksum false-positive treatment is narrowly documented in that guide.

## Submission boundaries

The [SRS, SAD and Test Plan](part-1/README.md) are Version 1.4 with matching PDFs. API, domain, field layout and design now agree on weighted marks. Earlier November 4/8 records, original proposal/PDF/XLSX and sprint recordings retain their actual dates; they are not rewritten as new executions.

The repository evidence supports the implemented core workflows in the tested scope. Each teammate must still understand and explain their contribution, confirm their own startup/walkthrough, and provide genuine review or course sign-off where required. Historical Project-point/review observations must be checked against current board state before claiming completion. Deployment/HTTPS, production capacity, Firefox, Docker and actual legacy production-data repair are not certified by these tests. The person-month/Gantt item remains deferred by the team; this alignment does not fabricate it or waive any course obligation.
