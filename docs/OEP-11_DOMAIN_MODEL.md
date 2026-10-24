# OEP-11 — Release 1 Domain Entities and Relationships

**Status:** Proposed design — pending team review, Field Layout/SAD reconciliation and agreement  
**Issue:** [OEP-11 / #20](https://github.com/Manaswi-Guntupalli/SE_MINI_PROJECT/issues/20)  
**Implementation:** [OEP-43 / #52](https://github.com/Manaswi-Guntupalli/SE_MINI_PROJECT/issues/52)

## Basis and boundaries

This proposal follows [Release 1 Scope and Permissions Agreement](RELEASE_1_AGREEMENT.md) and the existing `server/models/Exam.js` shape on `develop`. The agreement is itself marked pending team approval. This document specifies contracts; it does **not** claim that all Mongoose models, indexes, transactions, or tests are implemented.

Release 1 includes User, Exam, embedded Question and Option, Attempt, Response and an evaluation Result. It excludes retakes, reusable question banks, enrollment/course management, negative marking, AI proctoring, analytics and result-release modes.

**Notation:** `ObjectId` denotes a MongoDB/Mongoose identifier; `required` means required at the relevant lifecycle stage. Existing prototype `Exam.instructorId: String` must be reconciled with the intended User reference before implementation. Do not silently migrate existing data.

## Entity field layout

### User (collection `users`)

| Field | Type | Required / constraint |
|---|---|---|
| `_id` | ObjectId | Primary key |
| `loginIdentifier` | String | Required, trimmed/normalized, unique indexed; choose exact email/username convention in design review |
| `passwordHash` | String | Required, never returned in API responses |
| `role` | String enum | Required; exactly one of `Student`, `Instructor`, `Admin` |
| `isActive` | Boolean | Required, default `true` |
| `createdAt`, `updatedAt` | Date | Mongoose timestamps |

Account identifiers must use one consistent canonical normalization rule before the unique index is created; the exact field name and format remain a team decision. Accounts are Admin-provisioned. Changing role or active status must not delete or reassign historic exam/attempt/result references. The initial Admin must be provisioned securely, without committed default credentials.

### Exam (collection `exams`)

| Field | Type | Required / constraint |
|---|---|---|
| `_id` | ObjectId | Primary key |
| `title` | String | Required, nonblank, trimmed |
| `description` | String | Optional, default empty |
| `instructorId` | ObjectId reference to User | Required, owning Instructor; **current prototype uses String** |
| `startTime` | Date | Optional availability start gate; **current prototype requires it** |
| `duration` | Number | Required positive duration in minutes |
| `status` | String enum | `Draft` or `Published`, default `Draft` |
| `questions` | Array of Question subdocuments | Required to be nonempty and valid **at publication** |
| `createdAt`, `updatedAt` | Date | Mongoose timestamps |

Only the authenticated owning Instructor may manage a Draft. Publication validates every question/option and makes the entire published definition immutable, including answer keys; published exams cannot be edited or deleted. Server enforcement is required, not just UI disabling.

### Question (embedded in `Exam.questions`)

| Field | Type | Required / constraint |
|---|---|---|
| `_id` | ObjectId | Mongoose subdocument ID; validate uniqueness within its parent Exam |
| `questionText` | String | Required, nonblank, trimmed |
| `options` | Array of Option subdocuments | At least two nonblank options |
| `marks` | Number | Existing prototype field defaults to 1; **Release 1 scoring is fixed at 1**, so do not allow variable weights to affect scoring |

Exactly one Option per Question must have `isCorrect: true` before publication.

### Option (embedded in `Question.options`)

| Field | Type | Required / constraint |
|---|---|---|
| `_id` | ObjectId | Mongoose subdocument ID; validate uniqueness within parent Question |
| `text` | String | Required, nonblank, trimmed |
| `isCorrect` | Boolean | Required, default `false`; exactly one true per published Question |

Correctness flags/answer keys must be omitted from Student-facing payloads.

### Attempt (collection `attempts`)

| Field | Type | Required / constraint |
|---|---|---|
| `_id` | ObjectId | Primary key |
| `studentId` | ObjectId reference to User | Required; Student initiating attempt |
| `examId` | ObjectId reference to Exam | Required; Published exam |
| `startedAt` | Date | Required, server-generated |
| `deadlineAt` | Date | Required, fixed at start: `startedAt + duration minutes` |
| `status` | String enum | Required: `Active` at creation; `Submitted` after finalization |
| `submittedAt` | Date or null | Set once by server upon manual/timeout finalization |
| `submissionReason` | String enum or null | `Manual` or `Timeout`, assigned at finalization |
| `evaluationStatus` | String enum | Required; default `Pending`, later `Evaluated`; pending remains valid after evaluation failure |
| `createdAt`, `updatedAt` | Date | Mongoose timestamps |

**Unique compound index:** `{ studentId: 1, examId: 1 }`. Starting the same exam again returns the same Attempt and original deadline; no retakes. Deadline is server-authoritative; reject saves at or after deadline, including attempts made with a manipulated browser clock.

Finalization must atomically transition one Active Attempt to Submitted, use a consistent saved-response snapshot, reject later writes and return the same persisted outcome for retries/races. An ordinary status update alone is not sufficient to prevent concurrent Response saves; the implementation must enforce a write/finalization coordination protocol, with transactions or an equivalent tested strategy. The implementation and tests belong to OEP-43 and submission issues.

### Response (collection `responses`)

| Field | Type | Required / constraint |
|---|---|---|
| `_id` | ObjectId | Primary key |
| `attemptId` | ObjectId reference to Attempt | Required |
| `questionId` | ObjectId | Required; must belong to Attempt's Exam |
| `selectedOptionId` | ObjectId | Required for an answered Question; must belong to that Question |
| `createdAt`, `updatedAt` | Date | Mongoose timestamps |

**Unique compound index:** `{ attemptId: 1, questionId: 1 }`. An unanswered question has no Response document. A new valid save replaces the prior selected option, not a second Response. The server must verify that the Attempt belongs to the current Student, remains Active, is before its deadline, the Question belongs to the Attempt's Exam and the Option belongs to that Question.

### Result (separate collection `results`; design choice for review)

| Field | Type | Required / constraint |
|---|---|---|
| `_id` | ObjectId | Primary key |
| `attemptId` | ObjectId reference to Attempt | Required, unique indexed |
| `score` | Number | Required integer, 0 through maximum |
| `maximumScore` | Number | Required integer equal to count of published questions |
| `status` | String enum | `Evaluated` when persisted |
| `createdAt`, `updatedAt` | Date | Mongoose timestamps |

A separate Result is proposed to align with the existing OEP-48 result-model work. **Team approval is required** because OEP-11 explicitly permits either a separate Result or a result embedded in Attempt. Evaluation is +1 per correct answer, +0 otherwise, with no negative marking or variable weights. Persist Attempt submission before evaluation; if evaluation fails, keep the Attempt Submitted and evaluation Pending, then retry idempotently without duplicate Result rows.

## Cardinalities and relationship sketch

```text
User (Instructor) 1 -------- 0..* Exam
Exam              1 -------- 0..* Question [embedded]
Question          1 -------- 2..* Option   [embedded]
User (Student)    1 -------- 0..* Attempt
Exam              1 -------- 0..* Attempt
(Student, Exam)   1 -------- 0..1 Attempt  [unique pair]
Attempt           1 -------- 0..* Response
Question          1 -------- 0..* Response [across attempts]
(Attempt, Question) 1 -------- 0..1 Response [unique pair]
Attempt           1 -------- 0..1 Result   [after evaluation]
```

Questions and Options are **not** standalone reusable banks. Their identifiers are nested subdocument IDs within an Exam. Attempts and Responses refer to those IDs while validating membership against the immutable published Exam definition.

## Persistence constraints and implementation ownership

- Mongoose field validation and MongoDB unique indexes are both needed; validation alone cannot enforce concurrency-safe uniqueness. Indexes enforce pair uniqueness, but question/option membership requires explicit application validation against the parent Exam.
- Create and verify indexes in a fresh database, and write tests for duplicate Attempt/Response/Result writes. Enforce that the referenced User has the correct role and that the referenced Exam is Published when an Attempt starts.
- For submission races, coordinate atomic Attempt status transition with Response snapshot/finalization and idempotent Result creation. The exact transaction/locking strategy must be decided during OEP-43 implementation.
- Server derives ownership, student identity, deadlines, status, score and authorization from authenticated records; never trust these values from an unprivileged client.
- Existing prototype gaps requiring migration/design reconciliation: `Exam.instructorId` String versus User ObjectId, `Exam.startTime` required versus optional in Release 1, and `Question.marks` variable versus fixed +1/0 evaluation.
- This document does not implement schemas, migrations, APIs or tests. Those belong to OEP-43 and dependent feature stories.

## Team design-review checklist

- [ ] Confirm the canonical unique login identifier and normalization policy.
- [ ] Confirm `instructorId` reference type and migration path from the current String prototype.
- [ ] Confirm optional availability `startTime` and fixed 1-mark scoring semantics.
- [ ] Confirm separate Result collection versus embedded Attempt result.
- [ ] Confirm lifecycle/status names, deadline and response membership constraints.
- [ ] Confirm consistency strategy for atomic finalization and evaluation retry.
- [ ] Compare field names, types and relationships directly against the authoritative Field Layout, SRS and SAD; record and resolve any differences (these source artifacts have not been fully reconciled in this proposal).
- [ ] Record reviewer approval before marking OEP-11 Done or using it as the finalized OEP-43 contract.
