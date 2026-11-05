# Final unit and automated integration report

Date: 4 November 2026 (Asia/Kolkata). Base commit `463cde555490738bcaa5fde661e3910e29f8f7ab`; test/evidence additions relative to the application baseline are identified in [source-manifest.json](source-manifest.json). Application tracked contents were verified identical to merged main `13ec9982bff073be048c54d51b59cb3d761672a2`. This is a local execution record, not a hosted CI run or team approval.

PASS: **106 backend**, **54 frontend/component/HTTP-system**, and **5 standalone scoring** tests, with no failed/skipped cases. Backend totals include API integration, persistence, security and model/service cases; the frontend total includes component and real HTTP-system tests, so these totals are not all isolated unit tests.

Commands: `node scripts/ci.mjs all` includes `npm run test:ci --prefix server`, `npm run test:ci --prefix client`, and `npm run test:scoring --prefix server`. The same run passed clean locked installs, syntax, lint, build, intentional-failure detection, and acceptance diagnostics.

Supplemental legacy security: **7/7 original Jest cases passed**. A temporary runner supplied a disposable MongoDB URI and a Jest setup intercepted only dotenv configuration so the old `.env.test` override could not redirect the run to a persistent database. Product handlers and assertions were unchanged. This older suite is outside the default CI command; its security behaviors are also covered by the current backend suite.

Raw evidence: [backend JUnit](server-junit.xml), [frontend JUnit](client-junit.xml), [scoring and CI output](ci-output.txt), [legacy security assertions](legacy-security.json), [legacy security output](legacy-security-output.txt), [negative control](negative-control.json), [acceptance diagnostics](acceptance-diagnostics.json). The intentional failing control is expected and must not be counted as a product failure.

Export note: trailing console-table padding was removed from text logs for repository whitespace checks. Test outcomes and numeric results were unchanged; structured JUnit/JSON results are retained.
