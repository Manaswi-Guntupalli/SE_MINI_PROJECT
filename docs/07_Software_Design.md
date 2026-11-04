# Release 1 software design

Version 0.2, 25 October 2026. Integrated Instructor and persistence implementation baseline, **pending independent team review**. The initial Part 1 SAD and original XLSX remain historical proposals. This design, [Domain model](DOMAIN_MODEL.md) and [current Field Layout](OEP-18_Field_Layout.md) specify the reconciled contracts for #20/#22/#51/#52 and the Instructor stories.

## Modules and interfaces

React App handles login/session restoration and Instructor draft/question/publication management. RoleDashboard supplies separate Student availability/start and Admin account views. Express auth middleware resolves current stored User state, role middleware enforces the permitted workflow, and controllers check resource ownership. Mongoose models hold shared persistence data; persistenceService supplies transaction-safe writes. MongoDB must support replica-set transactions. server.js connects, checks topology and initializes all indexes before listening.

| Module | Principal interfaces | Rules |
|---|---|---|
| Auth | login/logout/me/csrf-token | bcrypt password verification; regenerate/save session on login; invalidate on logout; HttpOnly/SameSite=Lax/Secure production cookie; CSRF on authenticated writes. |
| Instructor | owned exam CRUD, nested question CRUD, publish, owned results | Session-derived owner; allowed Draft fields only; validated publication; immutable Published content; version-guarded writes/deletes. |
| Student publication handoff | eligible exams, start/resume, own attempt/result reads | Same eligibility predicate for listing/start; one server-timed Attempt; safe projections exclude correctness. |
| Admin | account list/create and role/active update | Admin only; exactly one permitted role, unique normalized email, bcrypt-only password persistence; no deletion of historical accounts. |
| Persistence | startAttempt/saveResponse/finalizeAttempt/persistResult | Validate associations and lifecycle; database time controls expiry; transactions serialize save/submit and atomically persist result/evaluation state. |

Exact HTTP shapes and errors are in [AUTH_AND_EXAM_API.md](AUTH_AND_EXAM_API.md). Runtime schema names are email/active/deadline/maximum; Responses and Results are separate collections. See Field Layout for required values, identifiers and unique indexes.

## Instructor sequence

1. Browser authenticates, receives session cookie, and obtains a CSRF token before enabling the dashboard.
2. Create sends title/description/optional UTC start/duration. Server derives owner and persists Draft, then owner list reloads.
3. Owner edits Draft questions/options. Incomplete options may persist; removal of the correct option clears selection.
4. Publish validates all content, then saves with the loaded version. A stale edit/publication fails instead of overwriting a newer version. Deletion similarly conditions on Draft and version.
5. Published definitions remain read-only; Student payloads omit answer keys. Availability start gates eligibility, not countdown start.

## Attempt and persistence sequence

1. Eligible active Student starts/resumes a Published Exam. A unique Student/exam index permits one Attempt. Start/deadline are derived on the server; resume never replaces them.
2. The response service verifies active Student, owned Active Attempt, published Exam, Question membership and selected Option membership. The same transaction locks the Attempt with an incrementing counter, upserts one Response per Attempt/Question, then rechecks MongoDB time before completing. Invalid membership/expiry rolls back all writes.
3. Manual/Timeout finalization conditionally updates only Active. MongoDB `$$NOW` supplies the timing predicate and submission timestamp. Manual requires deadline in the future; Timeout requires expiry. Repeated/racing finalization preserves the first stored outcome.
4. Result persistence locks the Submitted Attempt, validates score bounds and maximum against the immutable question count, creates one Result, and marks evaluation successful in the same transaction. Duplicate retries return the existing Result. Failure leaves Submitted/Pending and never reopens answer writes.
5. Account role/deactivation changes affect subsequent authorized requests but never rewrite historical Exam/Attempt/Response/Result associations.

Only the persistence boundary accepts feature-service writes. Raw MongoDB updates bypass Mongoose validation and are not a supported runtime interface. Student answer navigation/submission UI, scoring calculation and background browser-closed expiry scheduling remain separate feature stories; these persistence mechanisms support them without claiming they are implemented here.

## Failure and security behavior

Return safe 400/401/403/404/409 errors for invalid data, missing session, wrong role/ownership, missing resources and stale state. Do not return raw database errors, password hashes or answer keys. Recheck current role/active status on protected requests. Admin cannot grant their own account another workflow through self-demotion, and non-Admins cannot reach account endpoints. Retain historical references rather than deleting accounts.

All timestamps are UTC in storage/API; the UI explicitly labels and converts its browser timezone. All tests use separate disposable replica sets. Requirements are mapped to concrete tests in [PERSISTENCE_ACCEPTANCE.md](PERSISTENCE_ACCEPTANCE.md) and the retained [Instructor acceptance record](INSTRUCTOR_ACCEPTANCE.md). Test execution is evidence of implementation behavior; team agreement/review and production HTTPS checks remain distinct human/deployment gates.
