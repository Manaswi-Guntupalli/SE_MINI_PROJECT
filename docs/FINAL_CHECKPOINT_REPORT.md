# Online Exam Portal final checkpoint test report

**Release 1 · 8 November 2026**

**Reviewed branch** `docs/final-checkpoint-review` · [`8fa07c1`](https://github.com/Manaswi-Guntupalli/SE_MINI_PROJECT/commit/8fa07c13eaad24e3c3051b44e786462d7d4aeffc)

**Evidence** [Application CI run 42503466775](https://github.com/Manaswi-Guntupalli/SE_MINI_PROJECT/actions/runs/42503466775) · [Ubuntu job](https://github.com/Manaswi-Guntupalli/SE_MINI_PROJECT/actions/runs/42503466775/job/128801057189) · [Windows job](https://github.com/Manaswi-Guntupalli/SE_MINI_PROJECT/actions/runs/42503466775/job/128801057548)

Both jobs passed on the exact reviewed commit using Node.js 24.22.1, locked npm dependencies and disposable MongoDB replica sets. Server syntax checks, frontend lint and the production build also passed. The tables below use the job logs and generated reports from this run.

## Unit and integration results

| Suite | Ubuntu | Windows | Scope |
|---|---:|---:|---|
| Backend Vitest | 120 passed | 120 passed | Models, actual HTTP handlers, MongoDB transactions, authentication, ownership, authoring, attempts, results and Admin access |
| Frontend Vitest | 79 passed | 79 passed | React components, request ordering, retry states, session isolation and HTTP workflow checks |
| Standalone Node scoring | 9 passed | 9 passed | Assigned marks, zero for wrong or blank answers, default marks, fractional totals and unsafe input |
| Playwright system workflows | 3 passed | 3 passed | Browser, HTTP and database workflows |
| **Total executions per runner** | **211 passed** | **211 passed** | **Zero failed or skipped in these four suites on each runner** |

Each runner also passed ten acceptance diagnostics. The separate negative control deliberately expected a Draft exam to be Published. Its one assertion failed as intended and the check confirmed that CI detects a failing test. The diagnostics and negative control sit outside the 211 suite executions.

## System validation and updated test cases

| Executed scenario | Verified result | Test Plan reference |
|---|---|---|
| Playwright `OEP44-ST-01` | Login, authoring/publication, saving and changing a Student answer, navigation and reload, scoring, result privacy and Admin operations worked through the real application. | TC-EXAM-04, TC-NF-REL-01, TC-RES-01, TC-ADMIN-01 |
| Playwright `OEP44-ST-02` | The server finalized and evaluated a timed-out attempt after the browser closed. | TC-SUB-02 |
| Playwright `AC40-ORDER / AC47-DRAIN` | Delayed saves, navigation and immediate submission retained the latest choice through the saved result. | TC-ATT-03, TC-SUB-01 |
| Weighted results integration | Question marks survived creation, editing and publication. The manual fixture earned **5/10.5** and the timeout fixture **2.5/10.5**. Repeated evaluation kept a single result and both authorized views showed the persisted totals. | TC-QUES-01, TC-EVAL-01, TC-EVAL-02, TC-RES-01, TC-RES-02 |
| Legacy result repair | Dry run identified a legacy result without writing. Apply corrected it once, a repeat apply made no further correction, and inconsistent data was skipped. | TC-EVAL-02 |
| BUG-01 and BUG-02 | Late Instructor requests stayed isolated to their original session. Concurrent cross-Admin changes preserved an active Admin. | TC-AUTH-03, TC-ADMIN-01 |
| BUG-03, BUG-04 and BUG-05 | Attempt restoration and retry worked independently of the exam list. Older Admin list responses were ignored. Dismissing a failed load preserved the unavailable state until a successful retry. | TC-ATT-02, TC-ADMIN-01, TC-NF-ERR-01 |

The [Version 1.3 Test Plan](part-1/Online_Exam_Portal_Test_Plan.docx), Section 13, contains all 33 retained case IDs and maps them to all 32 [SRS requirements](part-1/Online_Exam_Portal_SRS.docx). Thirty-one cases use current CI evidence, including coverage. All named JUnit references in those mappings were found in both runner artifacts. The other two cases point to the November 4 classroom benchmark and named-browser baseline. The 33 case IDs organize requirements and evidence, so several cases can point to one executable test.

The Test Plan records the [earlier run on `d3a2c82`](https://github.com/Manaswi-Guntupalli/SE_MINI_PROJECT/actions/runs/42502182343). The [comparison with the reviewed commit](https://github.com/Manaswi-Guntupalli/SE_MINI_PROJECT/compare/d3a2c82fc0989225f04bd57a2b85e3b715eacbe3...8fa07c13eaad24e3c3051b44e786462d7d4aeffc) shows that only the Word Test Plan changed. This report records the fresh run on `8fa07c1`, including that run’s own coverage measurements.

## Code and branch coverage

| Runner | Backend lines | Backend branches | Frontend lines | Frontend branches |
|---|---:|---:|---:|---:|
| Ubuntu | **91.96%** (652/709) | 78.01% (433/555) | 92.16% (588/638) | 82.40% (520/631) |
| Windows | **91.25%** (647/709) | 78.37% (435/555) | 92.16% (588/638) | 82.40% (520/631) |

V8 measured the files selected by each project's coverage configuration. Both runners exceeded the 70% scoped backend line target for TC-NF-COV-01. Line coverage counts executed source lines. Branch coverage counts executed alternatives within decision points.

## Earlier local browser and performance evidence

| Case | November 4 result | Scope |
|---|---|---|
| TC-NF-COMP-01 | Chrome 156.0.8078.80 and Edge 156.0.4314.58 each passed 3 of 3 workflows at 1366 × 768. The main workflow also checked a 390 × 844 Student view. | Named desktop browser runs on the earlier local baseline |
| TC-NF-PERF-01 | 30 signed-in Students, 20 questions, 2,420 measured requests, zero errors and **469.02 ms p95** against the **2,000 ms** limit | Local classroom workload after login, with a 30-second load/save phase plus list, start, submit and results |

The November 8 CI reran the three system scenarios in the configured runner browsers. The November 4 data supplies the paired named-browser and latency measurements. The classroom benchmark excludes login/setup, external network latency and sustained production capacity.

- [November 4 unit and integration report](evidence/checkpoint-2026-11-04/UNIT_REPORT.md)
- [November 4 system validation and performance report](evidence/checkpoint-2026-11-04/SYSTEM_VALIDATION_REPORT.md)
- [November 4 code coverage report](evidence/checkpoint-2026-11-04/CODE_COVERAGE_REPORT.md)
- [November 4 branch coverage report](evidence/checkpoint-2026-11-04/BRANCH_COVERAGE_REPORT.md)

## Raw evidence and reproduction

| Evidence in the November 8 Actions artifacts | File or location |
|---|---|
| Commit, Node version, runner and coverage summary | `ci-evidence/run.json` |
| Backend and frontend assertions | `server/reports/junit.xml`, `client/reports/junit.xml` |
| Browser assertions and screenshots | `client/reports/browser-junit.xml`, `client/reports/browser.json`, `client/reports/browser-artifacts/` |
| Coverage detail | `server/coverage/`, `client/coverage/` |
| Failure detection and acceptance diagnostics | `server/reports/negative-control.json`, `server/reports/sprint1-acceptance.json` |
| Standalone scoring test output | Ubuntu and Windows job logs, **Run backend integration and frontend component suites** |

Download the Ubuntu and Windows archives from the linked run while available. The workflow retains them for 14 days. The dated November 4 reports and raw files are committed in the repository.

From the repository root, use the Node version in `.node-version` and run the following stages. The browser binary is installed after the locked dependencies.

```bash
node scripts/ci.mjs preflight
node scripts/ci.mjs install
node client/node_modules/@playwright/test/cli.js install chromium
node scripts/ci.mjs build
node scripts/ci.mjs test
node scripts/ci.mjs browser
node scripts/ci.mjs verify-failure
node scripts/ci.mjs acceptance-report
node scripts/ci.mjs evidence
```

On Linux CI, browser installation also uses `--with-deps`. Use `OEP_BROWSER_CHANNEL=chrome` or `msedge` with the corresponding installed browser for named-channel checks. Run the classroom benchmark separately with `npm run test:performance --prefix server`. See the [workflow](../.github/workflows/application-ci.yml) and the [test stage runner](../scripts/ci.mjs).

These results cover the application checks in the stated environments. Team sign-off, course acceptance, production HTTPS and deployment validation require separate evidence. The [deviations record](FINAL_DEVIATIONS.md) describes the reviewed implementation and earlier scope decisions.
