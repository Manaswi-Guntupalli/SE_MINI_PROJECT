# Shared foundation and persistence acceptance

Scope: Guru Teja's #20 (OEP-11), #22 (OEP-13), #51 (OEP-42) and #52 (OEP-43), integrated with Instructor branch `feature/auth-rbac-exam-ac` on `feature/OEP-43-persistence-models`. Prepared 25 October 2026. Team design agreement and independent PR review remain pending; this record does not claim those human actions.

## Criterion mapping

| Issue | Criteria and implementation evidence |
|---|---|
| #20 AC1 fields/types/IDs/cardinalities | DOMAIN_MODEL.md, OEP-18_Field_Layout.md and completed 07_Software_Design.md define all entities, types, required values and relationships. The original XLSX proposal is preserved and its embedding/naming differences explicitly reconciled. |
| #20 AC2 ownership/status/immutability | Exam uses authenticated ObjectId owner, Draft/Published lifecycle, complete Published validation, model save immutability and optimistic concurrency. Instructor acceptance tests and persistence integration verify rejected stale/Published writes. |
| #20 AC3 attempts/deadlines/results | Immutable Student/exam/start/deadline, unique one-attempt pair, submission timestamp/reason and Pending/Evaluated phase. Unique Result stores bounded score/maximum and derived associations. |
| #20 AC4 responses/membership | Separate Response unique Attempt/Question; guarded service verifies Exam/Question/Option membership before writes. Real replica-set tests cover foreign IDs and duplicate inserts. |
| #20 AC5 agreed design/scope | Implementation specification is ready for review. **Team agreement remains pending.** No enrollment, bank, negative-marking or analytics entities introduced. |
| #22 AC1 available database | Dedicated local replica set helper starts persistent loopback MongoDB on 27018; Atlas alternative documented. Existing 27017 database is untouched. |
| #22 AC2 Mongoose connection | db:check and server startup connect through Mongoose, verify transaction-capable topology and initialize all model indexes. |
| #22 AC3 environment URI | Ignored server/.env or process environment supplies MONGO_URI; committed .env.example has only a local sample/secret placeholder. |
| #22 AC4 no committed secrets | Local environment and database directory are ignored. Production bootstrap requires supplied environment credentials; no default production password. Dev seed is explicitly local-only and blocked in production. |
| #22 AC5 documentation | README and DATABASE_SETUP.md describe installation, replica-set initialization, startup, Compass URI, verification, Atlas, testing and troubleshooting. |
| #22 AC6 local verification | Run db:dev then db:check. The fresh local replica set and actual index initialization were exercised; final checks/counts below record the completed run. |
| #51 AC1 Admin-only UI/API | RoleDashboard exposes accounts to Admin; Admin router requires current authenticated Admin and CSRF on writes. Tests deny Student/Instructor/anonymous/inactive access. |
| #51 AC2 provisioning/unique role | Validated name/email/password and exactly one Student/Instructor/Admin role; normalized unique email index rejects duplicates. UI and API success/negative tests retained. |
| #51 AC3 password storage | bcrypt hashes; schema rejects plaintext-shaped hashes; ordinary queries/API omit hashes. Account create/bootstrap hash supplied password. |
| #51 AC4 role/status and existing sessions | PATCH allowlist changes role/active only; auth reloads User each request. Tests revoke privileges on existing sessions and preserve current data references. |
| #51 AC5 non-Admin escalation denied | Direct create/update requests from Student/Instructor are denied; unsupported fields/invalid roles rejected; own Admin access cannot be revoked through the management endpoint. |
| #51 AC6 historical associations | No account deletion endpoint; persistence integration verifies Exam/Attempt/Response/Result associations survive role/status changes. |
| #51 AC7 secure first Admin | bootstrapAdmin.js validates environment input, bcrypt-hashes password and refuses a repeat bootstrap once any Admin exists. AUTH_AND_EXAM_API.md documents use without committed default credentials. |
| #51 AC8 tests | Combined acceptance suite, role UI tests and additional foundation integration cases cover valid/duplicate/invalid, forbidden roles, current-session deactivation and bootstrap. |
| #52 AC1 reviewed model alignment | Canonical documented fields reconcile both branches; IDs/indexes agree with the current Field Layout. **Independent design review remains pending.** |
| #52 AC2 user/exam/question data | User role/active/email/hash, ObjectId owner, optional start, Draft/Published, embedded unique Question/Option IDs; single correct option enforced on publication/model validation. |
| #52 AC3 attempt/result persistence | Immutable authoritative timing and ownership, Active/Submitted and submission metadata, Pending/Evaluated, bounded unique Result with score/maximum. |
| #52 AC4 unique policies | Actual MongoDB indexes enforce unique email, Student/Exam, Attempt/Question and Result/Attempt; tests provoke duplicate-key errors. |
| #52 AC5 membership writes | startAttempt validates active Student/eligible Exam; saveResponse validates ownership and nested membership, not references alone. Foreign IDs leave no Response. |
| #52 AC6 atomic lifecycle/result | Transactions lock Attempt during answer/finalization/result writes; MongoDB time rejects expiry even with forged caller clocks. Concurrent retries preserve a single submission/result and immutable score; result/evaluation state are atomic. |
| #52 AC7 fresh setup/indexes | db:dev/db:check/server initialization and DATABASE_SETUP.md cover fresh transaction-capable development setup; all model indexes verified locally. |
| #52 AC8 targeted tests | persistence-model/integration suites cover actual unique indexes, invalid links, durable changed selections/deadlines/results, illegal lifecycle metadata, early timeout, expired writes, races and historical data. Instructor regressions run together. |
| #52 AC9 scope | No excluded domain entities; full Student answering/submission UI, automatic scoring and background timeout scheduler remain their own stories. |

## Integration contract

The resolved schemas use email/active/deadline/maximum across both branches. Response is separate; Result includes derived studentId/examId for existing protected queries. DeadlineAt/loginIdentifier/isActive/maximumScore are not parallel fields. No automatic destructive migration is run against historical developer data. See the documented crosswalk before migrating old experimental datasets.

The Instructor branch is retained as an ancestor in the integration merge; no force-push or replacement of its history is needed. The combined regression suite must pass before completing the local merge. Formal task closure still requires independent teammate agreement/review; no GitHub issue statuses are changed by this implementation.

## Verification

Use Node 24, locked dependencies and MongoDB's installed binary or the test helper's pinned download. Run `node scripts/ci.mjs build`, `node scripts/ci.mjs test`, `npm run audit:sprint1 --prefix server`, and the optional existing Jest security suite with an explicitly isolated test URI. JUnit/coverage reports are generated under each application's ignored reports/coverage directories. All automated database tests use isolated replica sets, never application MONGO_URI.

Final combined verification on Windows with Node **24.22.1** and MongoDB **8.2.1**:

| Check | Observed result |
|---|---|
| Required backend suites, including both branches and rollback/concurrency tests | **76 passed, 0 failed** |
| Frontend/system suites, including real-network Instructor, Student start and Admin create/role/deactivate workflow | **19 passed, 0 failed** |
| Existing Jest security suite against a named isolated test database | **7 passed, 0 failed** |
| Anonymous acceptance probes | **10 passed, 0 failed** |
| Frontend lint/build and backend syntax checks (including services/scripts) | Passed |
| CI deliberately failing assertion control | Correctly detected and returned nonzero |
| Backend line coverage, including persistence services | **88.40%** |
| Frontend line coverage | **85.35%** |
| Fresh local replica-set helper and db:check | Ready on 27018; all five model collections/indexes initialized |
| Standalone startup negative check | Safe explanatory error and exit 1; no listening API started |
| Running app smoke | Frontend/API 200; Admin login/account listing and Student login/eligible-list requests succeed |

The integrated working tree combines Instructor commit `53e8af7652aebc6ca883b26bbc2745b9c1454216` and persistence commit `76f79263fb1352e3129941bd447c80cd8a5ad4b4`. Team agreement, independent review/merge into develop and teammates' own startup records remain pending. The local integration merge preserves both histories rather than discarding either implementation.

Browser automation was unavailable in this environment; the real-network React system test uses jsdom with real HTTP/session/CSRF/Express/MongoDB and does not claim Chrome/Edge visual verification. The configured local replica set uses a fresh ignored data directory; the previous standalone database on 27017 was not modified or migrated.
