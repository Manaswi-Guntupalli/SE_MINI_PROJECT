# Instructor and foundation acceptance record

> Retained Instructor-branch verification record. For the subsequent reconciled Instructor/persistence implementation, current test totals and the four shared-foundation issues, see [PERSISTENCE_ACCEPTANCE.md](PERSISTENCE_ACCEPTANCE.md). The original counts below describe the earlier Instructor-only verification.

Scope: only GitHub #21, #23, #24, #33, #34, #35, #36 and #37 shown in the requested task image. Checked on 25 October 2026 against the implementation changes based on `712205d2e382f65cceb524676576ac173383bbad`, prepared for branch `feature/auth-rbac-exam-ac` and PR #59. Independent review and merge remain pending. This record supersedes the earlier prototype findings without rewriting their history.

## Acceptance mapping

| Issue and criteria in issue order | Implementation and verification |
|---|---|
| #21 AC1 runnable React/Express | Both applications run locally; health check, builds and SYS-INSTRUCTOR-01 exercise the integration. |
| #21 AC2 dependencies/scripts/lockfiles | Existing client/server manifests and committed lockfiles retained. Required Node 24 used for verification. |
| #21 AC3 onboarding/environment | README now includes locked installs, environment setup, MongoDB URL, startup, development users and verification. Both environment templates contain placeholders/configuration only. Server rejects missing database/weak placeholder session configuration. Production development seeding is blocked. |
| #21 AC4 every teammate reproduces startup | **Pending human evidence** from Tanusha, Manaswi and Guru Teja on their own machines; no execution is claimed for them. |
| #21 AC5 reviewed PR | **Pending teammate review and merge**. PR #59 had no submitted review when inspected; these changes are prepared for that existing PR. |
| #23 AC1 active/invalid/inactive login | AC23-01 plus SYS-INSTRUCTOR-01: active login succeeds; invalid/malformed/missing credentials and inactive accounts fail safely. |
| #23 AC2 hashed passwords, no disclosure | bcrypt hashing and default-excluded passwordHash; explicit public account projections. AC23-01 and AC24-05 verify hash storage and API non-disclosure. |
| #23 AC3 session/cookies/CSRF | MongoDB session store outside tests; HttpOnly, SameSite=Lax, Secure in production; two-hour expiry; credential-aware exact-origin CORS; CSRF token on every authenticated write. Documented in AUTH_AND_EXAM_API.md. AC23-02/04 verify rotation, cookie attributes, old-token rejection and origin/CSRF enforcement. Production HTTPS configuration still needs deployment smoke verification. |
| #23 AC4 login/logout/session replay | Sessions regenerate and save at login; logout destroys the server session and expires the cookie. AC23-02/03 verify old-cookie rejection. UI waits until CSRF initialization completes, preventing a first-action race found by the real-network system test. |
| #23 AC5 protected access/current account | Middleware reloads role/active status for each request. AC24-01 verifies existing-session revocation after role/status change. |
| #23 AC6 verification | Durable acceptance tests plus UI-AC23 and SYS-INSTRUCTOR-01 cover authentication, rejections, protected access, refresh and logout. |
| #24 AC1 server matrix | Authenticated role middleware covers every mounted management, Student and Admin route. AC24-01 through AC24-05 exercise allowed and denied roles. |
| #24 AC2 Student restrictions | Student cannot manage exams or roles; attempt/results reads filter by authenticated owner. AC24-02/04/05. |
| #24 AC3 Instructor restrictions | All exam/question/publication/result operations require owned exam; Admin account operations denied. AC24-03/04 and IT-EXAM-04. |
| #24 AC4 Admin-only accounts, no workflow inheritance | Admin account list/create/role/status update APIs and UI; Admin denied Instructor/Student workflows. AC24-02/04/05 and role UI tests. No account deletion; historical references remain. |
| #24 AC5 anonymous/inactive/current sessions | Authentication runs before role/ownership checks. AC23-01/03/04, AC24-01 and ten anonymous acceptance probes. |
| #24 AC6 guessed identifiers | Every Instructor read/write/publish/result route checks ownership; Student foreign attempt/result IDs return 404. AC24-03/04. |
| #24 AC7 answer-key secrecy | Explicit Student question/option projections omit correctness and answer keys. AC36-01 checks actual listing/start payloads; Student own-attempt read uses the same projection. |
| #24 AC8 tests | Positive, denied-role, denied-owner, invalid-session, inactive-session and direct API cases retained in required Vitest suites. |
| #33 AC1 Instructor/session owner | createExam uses req.user._id and server-controlled Draft status. AC33-01 ignores forged owner/status; AC24-02 denies other roles. |
| #33 AC2 fields | Trimmed nonblank title, optional text description, optional offset-qualified ISO start, finite positive duration in minutes, including fractions. AC33-01/02, IT-EXAM-03. |
| #33 AC3 validation/no partial insert/UI errors | Invalid input rejected before insert; errors displayed by UI. AC33-02, UI-EXAM-04 and SYS-INSTRUCTOR-01. Raw database errors removed. |
| #33 AC4 draft persistence/dashboard | IT-EXAM-02/04, UI-EXAM-02/03 and SYS-INSTRUCTOR-01 verify stored draft and owner list. |
| #33 AC5 timestamps/start semantics | React converts browser local time to UTC and converts back using date components; labels include browser timezone. UI-AC33 tests round-trip edits. Student start persists server time/deadline from duration; availability never starts the countdown. AC36-01. |
| #33 AC6 Student draft confidentiality | Drafts are absent from Student listing and denied by start; management reads require Instructor. AC24-02 and AC36-01. |
| #34 AC1 owner-only draft writes | AC24-03, IT-EXAM-05/06. |
| #34 AC2 validated durable edits | Shared field validation and an allowlist; owner/status/questions cannot be mass assigned. IT-EXAM-05, AC34-01, UI-AC33 and SYS-INSTRUCTOR-01. |
| #34 AC3 associated content cleanup | Embedded questions/options are removed with the draft. IT-EXAM-06. |
| #34 AC4 publication immutability | All write/delete routes guard Draft; optimistic concurrency rejects stale saves and version-conditional deletion cannot remove a newer publication. IT-PUBLISH-04, AC34-02, AC36-02. |
| #34 AC5 historical attempts/results | Published exam management cannot alter or remove stored attempts/results. AC34-02 verifies retained fixture references and score; there is no management path that updates attempts/results. |
| #34 AC6 safe errors/no unauthorized change | Missing/malformed ID, wrong owner, forbidden update fields, published and stale-write errors covered by IT-EXAM-07, AC24-03, AC34-01/02 and AC36-02. |
| #35 AC1 owned Draft through UI/API | Shared Instructor/ownership/Draft guards; AC24-02/03, IT-PUBLISH-04. |
| #35 AC2 publication validity | Nonblank question required; incomplete options allowed only in Draft. Publication checks at least two nonblank options and exactly one correct. IT-MCQ-02/03, AC35-01. |
| #35 AC3 option CRUD/correctness/incomplete drafts | UI add/remove/replace/clear/reselect controls; removing the selected option clears selection rather than silently assigning another. UI-AC35, IT-MCQ-01/02, AC35-02. |
| #35 AC4 correct-option membership | Correctness is embedded in each option; externally supplied option IDs are rejected. Removing correctness requires replacement before publish. AC35-02. |
| #35 AC5 deletion/membership | Embedded deletion removes options; foreign question ID rejected. IT-MCQ-01/04 and IT-EXAM-06. |
| #35 AC6 published immutability | IT-PUBLISH-04 and concurrent AC36-02 verify question/option writes cannot overwrite publication. |
| #35 AC7 server validation/negative tests | Validates option object/text/boolean shapes and allowable update fields. AC24-03, AC35-01/02 and IT-MCQ-03/04 cover unauthorized writes, invalid membership and missing/multiple correct options. |
| #36 AC1 owner-only Draft publish | AC24-02/03, IT-PUBLISH-03. |
| #36 AC2 complete content validation | Dedicated publish validator checks all issue fields; generic draft PUT cannot set publication or questions. AC34-01, AC35-01/02, IT-PUBLISH-01/02. |
| #36 AC3 detailed invalid errors/Draft retained | Validator returns errors array and performs no save on failure. AC35-01 and IT-PUBLISH-01/02. |
| #36 AC4 persistence/repeat | IT-PUBLISH-03 verifies stored status, repeat rejection and one exam. |
| #36 AC5 frozen content | IT-PUBLISH-04, AC34-02 and AC36-02 cover sequential and concurrent writes. |
| #36 AC6 matching Student eligibility/start | One shared Published/optional-start predicate for list and start; drafts/future excluded, null/past included. Unique Student/exam index preserves one attempt/deadline under concurrent starts; expired attempts cannot restart. AC36-01 and SYS-INSTRUCTOR-01. |
| #36 AC7 valid/invalid/unauthorized/repeat tests | IT-PUBLISH-01 through 04, AC24-02/03, AC35-01/02 and AC36-01/02. |
| #37 AC1 owner list and details | Owned query; dashboard shows title/status/duration/start and timezone. IT-EXAM-04, UI-EXAM-02 and SYS-INSTRUCTOR-01. |
| #37 AC2 working status-restricted actions | Draft create/edit/delete, dynamic question/options and publish controls; Published actions hidden and server-enforced. UI-MCQ-01/02, UI-AC35, UI-PUBLISH-01/02 and system workflow. |
| #37 AC3 foreign identifiers denied | AC24-03 and IT-EXAM-04. |
| #37 AC4 explicit states/reload | Loading, empty and error states; failed load does not also claim an empty list. UI-EXAM-01/04/05, role UI tests and SYS-INSTRUCTOR-01 session restoration and persisted publication after remount. |

## Scope boundaries and human gates

The Student availability/start and protected attempt/result reads are supporting contracts needed for these eight issues. Answer saving, navigation, manual/timeout submission and automatic evaluation are separate backlog work and are not certified here. Tests seed result fixtures to check permissions and historical retention; no evaluation result is fabricated. Production deployment, HTTPS cookie smoke checks and a full Release 1 browser exam/submission/results flow are not claimed.

Formal Done remains pending the required independent teammate review/merge and #21's teammate startup evidence. No issue state, Project status or external PR was changed. Local browser automation reported no available browsers; SYS-INSTRUCTOR-01 uses a jsdom DOM with real XMLHttpRequest, Express sessions/CSRF and a real isolated MongoDB process. It is a real-network integration test, not a Chrome/Edge execution or visual QA claim.

## Reproduction and evidence

Use Node 24 and run `node scripts/ci.mjs build`, `node scripts/ci.mjs test`, and `npm run audit:sprint1 --prefix server` from the repository root after locked installs. The client system test also starts isolated MongoDB, so install server dependencies before client tests. Set MONGOMS_SYSTEM_BINARY and MONGOMS_SYSTEM_BINARY_VERSION_CHECK=false when using a locally installed mongod rather than the pinned automatic download. Tests never connect to the application's configured MongoDB database.

Final execution on Windows with Node **24.22.1** and installed MongoDB **8.2**:

| Check | Observed result |
|---|---|
| Backend Vitest, including acceptance/concurrency cases | **56 passed, 0 failed** |
| Frontend component and real-network system tests | **19 passed, 0 failed** |
| Existing Jest security regression suite, separate test database | **7 passed, 0 failed** |
| Existing anonymous acceptance probes | **10 passed, 0 failed** |
| Frontend lint and production build | Passed |
| Backend JavaScript syntax checks | Passed |
| CI negative control | Real intentionally incorrect assertion produced the required nonzero exit; proof succeeded |
| Backend line coverage, including middleware | **86.43%** |
| Frontend line coverage, including role dashboard/date helpers | **85.35%** |

The system test uses a longer DOM wait for real bcrypt/network/database work; no arbitrary sleeps or mocked HTTP responses are used. The regression caught and now covers the login/CSRF readiness race. Temporary test MongoDB processes/databases are isolated from the running website.

JUnit output: server/reports/junit.xml and client/reports/junit.xml. Coverage: each application's coverage/ directory. Anonymous probe details: server/reports/sprint1-acceptance.json. Test IDs above are stable evidence mappings. Generated reports are ignored outputs; this checked-in record preserves the observed counts without claiming those results came from the unchanged base commit.
