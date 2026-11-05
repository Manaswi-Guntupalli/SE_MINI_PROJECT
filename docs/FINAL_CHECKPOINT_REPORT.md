# Current local checkpoint code evidence — 4 November 2026

The application source matches the release merged to main through PR #70. The only new code is the local repeatable performance-test script and its npm command; no UI or business behavior was changed. These reports were executed locally before review-branch publication; no new business behavior is introduced.

- [Unit and automated integration report](evidence/checkpoint-2026-11-04/UNIT_REPORT.md)
- [System validation, Chrome/Edge and performance](evidence/checkpoint-2026-11-04/SYSTEM_VALIDATION_REPORT.md)
- [Code coverage](evidence/checkpoint-2026-11-04/CODE_COVERAGE_REPORT.md)
- [Branch coverage](evidence/checkpoint-2026-11-04/BRANCH_COVERAGE_REPORT.md)

Reproduce normal checks using Node 24: `node scripts/ci.mjs all`. Run performance separately with `npm run test:performance --prefix server`; use `OEP_BROWSER_CHANNEL=chrome` or `msedge` for `npm run test:browser --prefix client` (PowerShell: `$env:OEP_BROWSER_CHANNEL="chrome"`). Browser channels run separately with isolated fixture data. All test databases are disposable; the team `.env` database is not seeded or reset.

These results close the code-evidence gaps for the stated local workload; they do not finalize the original Word Test Plan table or certify formal submission. The updated [SRS/SAD/Test Plan](part-1/README.md), [design changes](FINAL_DEVIATIONS.md) and [videos](videos/README.md) now accompany these reports. The [final checklist](FINAL_SUBMISSION_CHECKLIST.md) records the remaining genuine review, issue/board reconciliation, owner release acceptance and member viva actions. Older dated evidence is historical, not the current test totals.
