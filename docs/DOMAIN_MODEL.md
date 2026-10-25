# Release 1 domain model

Implementation baseline for OEP-11 (#20), OEP-18 and OEP-22, reconciled on 25 October 2026. **Team review and agreement pending.** This specification and the [current Field Layout](OEP-18_Field_Layout.md) describe the integrated Instructor and persistence branches. The original XLSX and Part 1 Word documents remain historical proposed designs; their embedding/naming choices are mapped below rather than silently claimed to be approved.

## Entities and relationships

| Entity | Storage and identifier | Relationships and cardinality |
|---|---|---|
| User | users collection; BSON ObjectId `_id` | One account has exactly one role and active status; an Instructor owns 0..many Exams; a Student owns 0..many Attempts. Email is the unique normalized login identifier. |
| Exam | exams collection; BSON ObjectId `_id` | Exactly one owning User; 0..many embedded Questions while Draft; at least one complete Question when Published. |
| Question | Embedded in exactly one Exam; ObjectId `_id` | Contains 0..many Options while Draft, at least two on publication. No reusable question bank. |
| Option | Embedded in exactly one Question; ObjectId `_id` | Holds text and correctness flag; exactly one correct Option per published Question. All embedded identifiers within an Exam are unique. |
| Attempt | attempts collection; ObjectId `_id` | Exactly one Student and one Exam. Unique `(studentId, examId)` enforces one attempt. Contains start/deadline/submission/evaluation state; 0..many Responses and 0..one Result by reference. |
| Response | responses collection; ObjectId `_id` | Exactly one Attempt and one embedded Question from that Attempt's Exam. Unique `(attemptId, questionId)`. Selected Option must belong to that Question. No record means unanswered. |
| Result | results collection; ObjectId `_id` | Exactly one submitted Attempt; unique `attemptId`. Student/exam identifiers are derived from Attempt for authorized result queries. Score and maximum are integers using the fixed +1/0 scoring contract. |

Separately stored Response and Result collections retain Guru Teja's tested persistence design and provide database unique constraints. The original workbook proposed embedding both in Attempt; its conceptual 0..many/0..one cardinalities are unchanged. Choosing the separate collections is recorded here for review, not represented as a completed team decision. MongoDB references alone do not enforce membership: application writes must use the guarded persistence service.

## Canonical naming and cross-branch reconciliation

| Earlier persistence name/shape | Integrated contract | Reason |
|---|---|---|
| User.loginIdentifier | User.email | Existing login/Admin UI uses an email identifier; trim/lowercase and unique index retained. |
| User.isActive | User.active | Same name across authentication middleware, Admin UI/API and persistence. |
| Attempt.deadlineAt | Attempt.deadline | Retains Instructor/Student start API and UI contract; immutable server timestamp. |
| Attempt.status=Evaluated | status=Submitted plus evaluationStatus=Evaluated | Submission and evaluation are independent phases; failure/retry never reopens answers. |
| Embedded Attempt.responses | Response collection | One response per attempt/question enforced by actual unique index; own-attempt read returns a separate responses array. |
| Result.maximumScore | Result.maximum | Existing result projections/tests use maximum; service derives Student/exam references from Attempt. |
| Prototype Exam.instructorId string | ObjectId ref User | Owner is the authenticated Instructor, never a caller-provided string. |
| Required startTime | Nullable optional startTime | Release 1 availability gate is optional; eligible Student start begins the duration. |

These are implementation choices, not automatic data migrations. Existing databases containing the old experimental schema require a backed-up, reviewed data migration before reuse. The documented local replica set starts in a separate data directory/port and does not rewrite the earlier standalone database.

## Lifecycle and constraints

Exam: Draft → Published only through complete validation. A Draft may have incomplete options. Published title/configuration/questions/options/answer key are immutable; changes require a new Draft. Controllers reject deletion of Published exams. Version-conditional deletion and optimistic concurrency serialize edits/publication. Model validation also rejects incomplete Published documents and duplicate embedded IDs; model save rejects modification of existing Published definitions. Production code must not bypass this contract with raw collection writes.

Attempt: Active/Pending → Submitted/Pending → Submitted/Evaluated. Immutable owner/exam/start/deadline cannot be reset by Mongoose updates or resumption. Active cannot carry submission metadata or evaluation success. Submitted requires timestamp/reason. Manual finalization is permitted before the deadline; Timeout finalization at/after it. A repeated finalization returns the first saved timestamp/reason. MongoDB `$$NOW`, evaluated at the conditional write, controls timing; caller-supplied clocks are ignored.

`startAttempt` checks an existing active Student and a Published eligible Exam and atomically creates/resumes one Attempt. `saveResponse` checks current active Student, Attempt ownership/Active/deadline, Published Exam and nested membership. Transactional counter updates serialize it against finalization and concurrent answer writes. Expiry is rechecked after response upsert; failure rolls back. Missing Responses remain unanswered.

`finalizeAttempt` conditionally freezes the Attempt in a replica-set transaction. `persistResult` requires Submitted state, valid integer score bounds and maximum equal to published question count. It derives associations from Attempt and atomically creates the unique Result with the evaluation-status update. Concurrent retries return the same result without changing its score. If evaluation fails the submitted Attempt remains Pending for retry. These persistence contracts support the separate submission/evaluation feature stories; they do not claim a background timeout scheduler or an implemented scoring engine.

Role/status updates modify only the User record. Exam, Attempt, Response and Result identifiers remain intact. There is no account deletion endpoint. Current-session authorization reloads the User on every protected request, so demotion/deactivation immediately removes affected permissions. Admin does not inherit Instructor/Student workflows. No enrollment, reusable banks, negative marking or analytics entities are introduced.

## Interfaces and verification

Runtime paths: `server/models/`, `server/services/persistenceService.js`, protected auth/exam/student/admin routes and React role dashboards. See [API/session contract](AUTH_AND_EXAM_API.md), [database setup](DATABASE_SETUP.md) and [software design](07_Software_Design.md). The server initializes all model indexes before listening and refuses standalone MongoDB.

Required regression tests include actual database duplicate-key checks (not just index declarations), foreign membership, immutable deadlines, concurrent answer/finalization and result retries, expiry with forged caller time, invalid lifecycle/Published data, Admin provisioning/role revocation and historical retention. See [acceptance mapping](PERSISTENCE_ACCEPTANCE.md). Independent team agreement is a human gate; neither test results nor a merge commit supply it.
