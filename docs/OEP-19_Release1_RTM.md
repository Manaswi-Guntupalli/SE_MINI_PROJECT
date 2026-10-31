# OEP-19 Release 1 execution traceability

This executed supplement connects the [initial OEP-19 workbook](OEP-19_Initial_RTM.xlsx)
to OEP-44's real tests and reports. It preserves the workbook's proposed UT/IT/ST
IDs and review history: its 188 candidate scenarios are **not** collectively
declared executed. The identifiers below name actual executable tests. Existing
AC/UT/IT/UI identifiers retain their names; new OEP44 identifiers fill coverage gaps.
The [Release 1 agreement](RELEASE_1_AGREEMENT.md) reconciles PDF and Word SRS IDs.

For every row, the outcome is the matching assertions in the linked JSON/JUnit
reports, not an inferred pass from implementation presence. A passing manifest
requires no failed or skipped tests and a passing real-browser workflow.

| Primary ID | Word SRS requirement | Implementation | Executed test IDs / exact title selectors |
|---|---|---|---|
| FR-01 | AUTH-FR-01/02 | `server/routes/authRoutes.js`, `server/middleware/authMiddleware.js` | AC23-01/02/03/04; UI-AC23; OEP44-ST-01 |
| FR-02 | AUTH-FR-03, ADMIN-FR-01 | `server/routes/adminRoutes.js`, `server/middleware/authMiddleware.js` | AC24-01/02/05; AC51-01/02/03; OEP44-SEC-01; OEP44-ST-01 |
| FR-03 | EXAM-FR-01 | `server/controllers/examController.js` | UT-EXAM-01; IT-EXAM-02/03; AC33-01/02; UI-EXAM-03/04 |
| FR-04 | EXAM-FR-02/03 | `server/controllers/examController.js` | IT-EXAM-05/06; AC24-03; AC34-02; UI-EXAM-06/07 |
| FR-05 | QUES-FR-01/02 | `server/controllers/examController.js`, `server/models/Exam.js` | IT-MCQ-01/03/04; UT-MCQ-02; UI-MCQ-01/02 |
| FR-06 | QUES-FR-03 | `server/models/Exam.js`, `server/controllers/examController.js` | UT-MCQ-01/03; IT-MCQ-02; AC35-01/02; UI-AC35 |
| FR-07 | EXAM-FR-04 | `server/controllers/examController.js`, `server/models/Exam.js` | IT-PUBLISH-01/02/03/04; AC36-02; UI-PUBLISH-01/02; OEP44-ST-01 |
| FR-08 | Owned-exam dashboard narrative | `client/src/App.jsx`, `server/routes/examRoutes.js` | IT-EXAM-04; AC24-03; UI-EXAM-01/02/05 |
| FR-09 | ATT-FR-01 | `server/routes/studentRoutes.js`, `server/services/persistenceService.js` | AC36-01; RoleDashboard: “Student sees eligibility list”; OEP44-ST-01 |
| FR-10 | ATT-FR-02 | `server/services/persistenceService.js`, `server/models/Attempt.js` | AC36-01; OEP44-IT-01; OEP44-SEC-01; OEP44-ST-01 |
| FR-11 | ATT-FR-04 | `server/services/persistenceService.js`, `client/src/RoleDashboard.jsx` | OEP44-IT-01/02; persistence integration: “rejects expired writes”, “refuses early timeout”; OEP44-ST-01 |
| FR-12 | ATT-FR-03 | `server/services/persistenceService.js`, `client/src/RoleDashboard.jsx` | OEP44-IT-01; OEP44-FAIL-01; persistence integration: “changes one persisted selection”; OEP44-ST-01 |
| FR-13 | ATT-FR-05 | `server/routes/studentRoutes.js`, `server/services/persistenceService.js` | OEP44-IT-02; results workflow: “manual submission computes”; OEP44-ST-01 |
| FR-14 | ATT-FR-06 | `server/services/evaluationWorker.js`, `server/services/persistenceService.js` | OEP44-IT-02; OEP44-ST-02 (actual browser context closes before timeout); results workflow: “running worker finalizes and evaluates timeout without a browser” |
| FR-15 | EVAL-FR-01/02 | `server/services/evaluationService.js`, `server/models/Result.js` | scoring unit tests: all-correct/all-wrong/mixed/unanswered; results workflow: “manual submission computes”, “full evaluation is idempotent”; persistence integration rollback/concurrency tests; OEP44-ST-01 |
| FR-16 | RES-FR-01 | `server/routes/studentRoutes.js`, `client/src/RoleDashboard.jsx` | AC24-04; results workflow: “empty, pending, evaluated”, “API failures”; RoleDashboard persisted-result-state tests; OEP44-ST-01 |
| FR-17 | RES-FR-02 | `server/routes/examRoutes.js`, `client/src/App.jsx` | AC24-03/04; results workflow ownership/pending/error tests; App OEP-41 loading/pending/error/switching tests; OEP44-ST-01 |

## Security and persistence requirements

| Requirement | Test evidence |
|---|---|
| OEP-SR-001 password hashing | AC23-01, AC51-03; real bcrypt comparisons and no hash in API responses |
| OEP-SR-002 authentication/session protection | AC23-02/03/04; logout replay, session rotation, CSRF and cross-origin rejection |
| OEP-SR-003 current-role enforcement | AC24-01/02/05, AC51-01/02; stored role/deactivation rechecked |
| OEP-SR-004 ownership | AC24-03/04, OEP44-SEC-01; direct foreign exam/attempt/result operations denied |
| OEP-SR-005 answer confidentiality | AC36-01, OEP44-IT-01; student question payloads omit correctness flags |
| OEP-SR-006 backend validation | AC33-02, AC35-01/02, IT-MCQ-03/04, AC51-01; malformed IDs/types/options and forged marks rejected/ignored |
| OEP-NF-002 acknowledged-save durability | OEP44-IT-01, OEP44-ST-01; saved choices and deadline survive reload; failed saves retain the prior acknowledged choice |
| OEP-NF-004 scoped backend coverage | Measured V8 line coverage in `server-coverage.json`; evidence collector enforces at least 70% |
| OEP-NF-005 useful errors without internals | OEP44-FAIL-01; results API error tests; UI save/result failure states |

## Exact source suites and execution evidence

- [Authentication, role, ownership, Admin and authoring acceptance](../server/test/acceptance.test.mjs)
- [Draft/MCQ/publication API integration](../server/test/exam-api.test.mjs)
- [Schema units](../server/test/exam-model.test.mjs), [persistence units](../server/test/persistence-model.test.mjs)
- [Transactional persistence](../server/test/persistence-integration.test.mjs)
- [Evaluation/result/API/race/failure regressions](../server/test/results-workflow.test.mjs)
- [Scoring units](../server/tests/evaluationService.test.js)
- [Instructor component tests](../client/src/App.test.jsx), [Student/Admin component tests](../client/src/RoleDashboard.test.jsx)
- [Real HTTP React system test in jsdom](../client/src/system.test.jsx)
- [Real browser system test](../client/e2e/release1.spec.mjs)
- [Execution manifest](evidence/oep44-2026-10-29/execution.json), [backend assertions](evidence/oep44-2026-10-29/server-tests.json), [frontend assertions](evidence/oep44-2026-10-29/client-tests.json), [browser assertions](evidence/oep44-2026-10-29/browser.json)
- [Automated validation of executed mappings](evidence/oep44-2026-10-29/traceability.json)

OEP-44 does not assert completion of every proposed nonfunctional/process row in
the initial workbook. Load/latency, accessibility certification, production HTTPS,
all-browser compatibility, deployment and teammate review/contribution evidence
remain their own verification activities. Only the browser/version actually
recorded by Playwright is claimed here. CI integration ownership remains OEP-35.
