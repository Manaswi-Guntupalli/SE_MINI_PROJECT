# Final system validation report

Date: 4 November 2026 (Asia/Kolkata). Base commit `463cde555490738bcaa5fde661e3910e29f8f7ab`; test/evidence additions relative to the application baseline are identified in [source-manifest.json](source-manifest.json). Application tracked contents were verified identical to merged main `13ec9982bff073be048c54d51b59cb3d761672a2`. This is a local execution record, not a hosted CI run or team approval.

PASS: all **3 end-to-end workflows on Edge 156.0.4314.58** and all **3 on Chrome 156.0.8078.80**, initial viewport **1366 x 768**, with the workflow also checking a 390 x 844 Student view. Each channel uses a fresh disposable MongoDB replica set and real HTTP application.

The workflows exercise instructor authoring/publication, student saved-answer changes/navigation/reload/retry, submission/scoring/privacy/results, Admin, and browser-close/server-timeout recovery. Exact individual case names and assertions are retained in `client/e2e/release1.spec.mjs` and the raw reports.

**TC-NF-PERF-01 / OEP-NF-001: PASS for the declared local active-user workload.** Thirty separately authenticated students run a 30-second mixed attempt-load/versioned-save workload plus list/start/submit/results, using real MongoStore sessions and a 20-question exam. 2420 measured requests, zero HTTP/workflow errors, overall p95 **469.02 ms**; every measured endpoint p95 is below 2,000 ms. All 30 saved responses, submissions and scored results were verified.

Login/setup is outside this active-user latency measurement. This does not certify simultaneous login throughput, production networking/hosting, large datasets or sustained capacity. It is the reproducible classroom-scale representative-endpoint check in the Test Plan. Reproduce with `npm run test:performance --prefix server`.

PASS: both production dependency audits report zero known advisories on this execution date; this does not prove absence of all vulnerabilities.

Raw evidence: [Edge](browser-edge.json), [Chrome](browser-chrome.json), [performance](performance.json), [server audit](server-production-audit.json), [client audit](client-production-audit.json), [CI manifest](ci-run.json). The requester previously reported completing the manual walkthrough successfully; that is user-reported evidence, not a fresh independently observed manual run. The Word Test Plan case-ID mapping, current documents/UML and required videos are now prepared; see the [final submission checklist](../../FINAL_SUBMISSION_CHECKLIST.md) for genuine review, board reconciliation, owner freeze acceptance and member viva actions.
