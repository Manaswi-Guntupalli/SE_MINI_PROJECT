# Sprint 1 acceptance review

Reviewed on 24 October 2026 against `develop` commit `0e0582ecdb5b97c101666de7a60d10359013f0be` and the existing GitHub issue acceptance criteria. Tanusha's [PR #57](https://github.com/Manaswi-Guntupalli/SE_MINI_PROJECT/pull/57) is merged, but **the instructor prototype does not yet meet all Sprint 1 acceptance criteria**. Authentication, authorization and several exam rules remain incomplete. This review does not change issue states, assignments, estimates, priorities or epic relationships.

## Evidence and scope

Three checks were performed: inspect the merged source and issue criteria; execute HTTP requests against Express with an isolated real MongoDB process; cross-check persistence, UI tests and the submitted documentation. Test data never uses a team member's MongoDB/Atlas database. The frontend component tests mock HTTP and are not end-to-end browser tests.

The CI contribution adds 24 backend tests and 11 frontend tests for the implemented behavior, plus a separate ten-probe acceptance diagnostic. **The diagnostic currently has seven failures and three passes.** Passing prototype tests do not establish authenticated or authorized behavior. `npm run audit:sprint1 --prefix server` exits nonzero while the acceptance failures remain. CI records this diagnostic as advisory, explicitly reports the failures, and continues to fail required install/build/lint/test stages normally.

Reproduce from the repository root with Node 24:

```sh
node scripts/ci.mjs all
npm run audit:sprint1 --prefix server
```

The first command produces CI evidence; the second currently exits 1 because the release acceptance criteria fail. Reports are generated under `server/reports/`, `client/reports/`, and each application's `coverage/`. See [CI instructions](CI.md) for retained run evidence.

## Reproduced defects

| Probe | Affected GitHub issues | Expected | Observed on the reviewed implementation |
|---|---|---|---|
| AC-AUTH-01 | #23, #24, #33 | Anonymous create denied | POST `/api/exams` returns 201 and inserts an exam |
| AC-AUTH-02 | #24, #35, #37 | Anonymous management reads denied | GET by exam ID returns 200 with `isCorrect` answer flags |
| AC-AUTH-03 | #24, #34 | Anonymous edits denied | PUT by exam ID returns 200 and saves the edit |
| AC-OWNER-01 | #33, #34 | Server-controlled authenticated owner preserved | PUT can change `instructorId` to an arbitrary supplied value |
| AC-PUBLISH-01 | #34, #36 | Incomplete exam cannot become published | Generic PUT with `status: "Published"` publishes an exam containing no questions |
| AC-VALIDATION-01 | #33 | Valid title/duration accepted without optional start time | POST without `startTime` returns 400; schema and UI require it |
| AC-VALIDATION-02 | #33, #34, #36 | Duration must be finite and positive | POST with duration `"Infinity"` returns 201 |

Positive diagnostic controls pass: blank title rejected; dedicated publish endpoint rejects an empty draft; question creation rejects multiple correct answers. These controls do not cancel the failures above. Safe errors are also incomplete: controllers return raw database/cast error messages.

## Foundation acceptance criteria

### #21 Initialize MERN project

| Criterion | Finding |
|---|---|
| React client and Express server initialized and runnable | Present. Frontend production build succeeds; Express is exercised through HTTP integration tests. This is not proof every teammate can start both processes. |
| Dependencies, scripts and lockfiles recorded | Present in both directories. This CI contribution adds real test scripts and a recorded Node version. |
| Installation/startup documentation and environment templates | Missing in the reviewed merge. Client README is the Vite template; no committed application `.env.example` was found. CI setup is documented separately by this contribution. |
| Every teammate reproduces startup and frontend/backend connectivity | Not evidenced by a teammate execution record. Client API URL is hardcoded to localhost:5000. |
| Reviewed PR and domain modules | PR #57 merged, but no submitted GitHub review was returned at review time. Only exam routes/model/controller exist; accounts, attempts and results modules are absent. |

**Verdict: partial; do not certify complete startup/onboarding acceptance.**

### #23 Authenticate users

No login/logout route, User model, password-hashing dependency, server session store, session cookie policy or CSRF protection is implemented in the reviewed application. The frontend hardcodes `INSTRUCTOR_ID = "tanusha"` instead of deriving identity from a session. Therefore valid/invalid/inactive login, password storage, session creation/invalidation, protected access and their tests cannot be accepted. Anonymous API access is independently reproduced above.

**Verdict: not implemented in this merge.**

### #24 Role and ownership authorization

Exam routes have no authentication or authorization middleware. Student/Instructor/Admin permissions, authenticated ownership, active-account checks and subsequent-request role changes are absent. Anyone who knows an exam identifier can read management data and correct answers, modify a draft or supply a different owner. Filtering a list by an instructor ID supplied in the URL is not an ownership check. Attempt/result and Admin endpoints are not yet implemented, so their permission cases are unverified rather than passed. Denied-role/session/ownership test cases cannot be claimed from the prototype suites.

**Verdict: not implemented; blocks secure acceptance of #33–#37 and student integration.**

## Exam management acceptance criteria

### #33 Create examination

| Criterion | Finding |
|---|---|
| Authenticated Instructor only; server stores authenticated owner | FAIL: anonymous creation succeeds and owner comes from request data. |
| Nonblank title; optional description/start; finite positive duration | PARTIAL: blank title and nonpositive duration rejected; start is incorrectly required; infinity accepted. UI labels duration in minutes. |
| Server validation, no partial invalid insert, visible UI errors | PARTIAL: blank-title request inserts nothing and UI surfaces errors; full validation and safe errors are incomplete. |
| New draft persists and appears in owner dashboard | PARTIAL: draft save/reload and dashboard refresh tested; authenticated ownership absent. |
| Consistent timestamps, visible timezone, start/attempt semantics | PARTIAL: MongoDB stores a Date, but UI uses `datetime-local` without a clear timezone label; student start/deadline behavior is absent. |
| Drafts hidden and not startable by Students | FAIL for confidentiality: unrestricted exam reads expose drafts; no student start flow exists to verify. |

### #34 Edit or delete draft examination

| Criterion | Finding |
|---|---|
| Owner-only writes, including direct API requests | FAIL: anonymous edit succeeds; no owner check. |
| Same validated title/duration/start rules and durable changes | PARTIAL: normal draft edits persist; finite/optional-start rules fail; unrestricted `Object.assign` permits owner/status changes. |
| Draft deletion safely handles question/option records | PASS for current embedded model: deleting a draft removes its embedded questions/options. |
| Published exam/questions/options/keys immutable and not deletable | PARTIAL: ordinary sequential published write/delete routes reject changes; generic draft PUT bypasses the publication gate. Atomic behavior under concurrent edit/publication has not been proven. |
| Attempts/results cannot be invalidated | UNVERIFIED: these modules/data relationships are absent. |
| Missing/invalid/non-owner/published operations produce safe errors without unauthorized changes | PARTIAL: missing ID and published guards tested; authorization fails and errors expose internal cast/validation details. |

### #35 Manage MCQ questions and answer options

| Criterion | Finding |
|---|---|
| Owner of draft only, through UI and API | FAIL: draft guard exists, owner/role guard does not. |
| Nonblank question/options; >=2 options and exactly one correct to publish | PARTIAL: basic validation and correct-count cases tested; full publication validation can be bypassed by generic exam update. |
| Edit/delete/replace options and correct answer; incomplete drafts allowed | PARTIAL: whole-option replacement/edit works through API; UI fixes four options and offers no individual option add/remove control. Question endpoints require exactly one correct immediately rather than allowing an incomplete draft question. |
| Correct option belongs to question; removing it requires replacement before publish | PARTIAL: correctness is embedded per option; multiple/zero correct rejected on question save. Full draft option-removal workflow and permitted incompleteness are missing. |
| Question deletion handles options and maintains membership | PASS for embedded data; foreign question ID in another exam is rejected. |
| Published content immutable | PARTIAL: normal sequential question writes are rejected after publish; concurrency and all indirect paths are not established. |
| Input/ownership validation and negative tests | PARTIAL: current tests cover persisted CRUD, blank options, invalid question membership, zero/multiple correct and published guards. Unauthorized writes currently succeed; no passing authorization evidence exists. |

### #36 Publish examination

| Criterion | Finding |
|---|---|
| Owner-only existing draft publication | FAIL: no owner/role guard. |
| Complete valid title/duration/questions/options/answer membership | PARTIAL: dedicated route checks question presence and correct-answer counts; infinity and alternate PUT publication bypass remain. |
| Invalid/incomplete exam rejected and stays Draft | PARTIAL: empty/invalid dedicated publish calls preserve Draft; generic PUT publishes an empty exam. |
| Publication durable; repeated publish does not duplicate | PASS for dedicated route: status reload verified; repeated request returns 400 and count stays one. |
| Freeze content and answer key | PARTIAL: sequential published write guards pass; concurrent state transitions are not tested/atomic by inspection. |
| Student listing/start eligibility consistent with optional start | UNVERIFIED: student listing/start not implemented; optional-start schema currently disagrees with criteria. |
| Valid, invalid, unauthorized and repeated tests | PARTIAL: valid/invalid/repeated tests added; unauthorized acceptance fails. |

### #37 View owned examinations

| Criterion | Finding |
|---|---|
| Authenticated owned list with title/status/duration/start | FAIL overall: hardcoded identity, URL-controlled instructor filter and no auth. List shows title/status but omits required duration/start details. |
| Working status-restricted create/edit/delete/questions/publish | PARTIAL: main UI interactions tested; published management buttons hidden, but server authorization and option controls are incomplete. |
| Guessed foreign URL/API cannot expose management data | FAIL: unrestricted GET returns the exam and correct-answer flags. |
| Explicit empty/loading/failure; changes visible on reload | PARTIAL: empty state, alert errors, mutation refresh and persistence exist; no distinct loading state. |

**Verdict for #33–#37: useful prototype functionality is implemented; none can be accepted in full yet.** Existing closed states were preserved as requested. These findings belong in the existing issues/implementation follow-up rather than duplicate issues.

## Documentation assigned to Tanusha

The eight historical documentation issues were closed by team confirmation before Sprint 1. Their state is preserved. The following observations distinguish the linked Markdown outlines from the fuller Part 1 Word submissions; absent content in an outline is not proof it is absent from every artifact.

| Issue | What is present | Remaining acceptance evidence or correction |
|---|---|---|
| #29 Project plan | `05_Project_Plan.md` covers Agile rationale, tools, reuse, WBS, ownership, scope and two sprint dates. | Required person-month estimates and an actual Gantt are not recorded; plan explicitly defers capacity estimates. Do not invent team agreement or equate story points to person-months. Record teammate review. |
| #30 Architecture | Part 1 SAD has a MERN component diagram, module responsibilities, API boundaries and security intent. Linked `06_Architecture.md` is a short truncated outline with an unclosed fence. | Session mechanism is explicitly deferred in SAD; server expiry finalization and persisted deadline/answer flow need detail. Correct document team names and establish teammate review/scope consistency. |
| #31 Software design | SAD includes API sketches and two interaction diagrams. Linked `07_Software_Design.md` stops at a planned folder tree with an unclosed fence. | Ownership/index constraints, exact data design, active/submitted/evaluated lifecycle, save/submit races, atomic/idempotent finalization and durable scoring are not specified sufficiently to implement/test. Field-layout/SRS consistency and review require evidence. The diagrams labelled sequence diagrams are flow-style illustrations rather than UML lifelines. |
| #32 Validation specification | Part 1 Test Plan defines functional/security/NFR approaches, unit/API/UI/system strategy and requirement-mapped planned test IDs. Results correctly remain Not Executed. Markdown plan is truncated and lacks this fuller material. | Review approval rows are blank; names include Gururaj instead of Vidimalla Guru Teja. Keep original planned results unaltered; record newly executed prototype tests separately with their actual scope. Reconcile the planned Jest tool with this PR's Vitest execution before final documentation freeze. |

The SAD and Test Plan on `develop` still use Gururaj (and SAD revision history also Manasvi). The README has the correct team. Existing documentation PRs #55/#56 and #57's merge are separate from formal acceptance; merging alone does not demonstrate every criterion.

## Integration order and review corrections

1. **Tanusha/shared foundation:** finish #21 onboarding and #23/#24 authentication/session/role/ownership contracts. Coordinate User/model integration with Guru Teja's foundation work; do not use the client-supplied instructor string as identity.
2. **Tanusha exam module:** allowlist draft-edit fields; prevent owner/status mass assignment; enforce finite duration, optional/timezone-labelled start, publication completeness and immutable content; complete option/dashboard/loading/error behavior.
3. **Manaswi CI:** integrate the actual available suites through #42/#44, retain truthful reports and failing-test evidence, and obtain teammate review. The pipeline does not supply missing application security.
4. **All three:** rerun the acceptance audit after fixes, turn fixed criteria into required regressions with authenticated fixtures, then execute real instructor-to-student system/permission checks under #53. Student/evaluation integration depends on the stable protected exam contract.

PR #57's description says `Closes #24` through `#28`, which are different GitHub issues (authorization and documentation). The implemented OEP-24–OEP-28 stories map to **GitHub #33–#37**. Correct the cross-references during team review; this audit does not edit that merged PR or any issue status. No submitted GitHub review was returned for #57 at audit time; obtain or attach the actual teammate review rather than treating the automated checks as one.
