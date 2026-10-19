# Release 1 Scope and Permissions Agreement

**Prepared:** 19 October 2026 (Asia/Kolkata)
**Tasks:** [#17 / OEP-8](https://github.com/Manaswi-Guntupalli/SE_MINI_PROJECT/issues/17) and [#19 / OEP-10](https://github.com/Manaswi-Guntupalli/SE_MINI_PROJECT/issues/19)
**Review status:** Pending team agreement. This document records the existing Release 1 requirements for review; approval and implementation evidence are separate.

## Sources and review purpose

Review this agreement against the [Proposal](../OEP-16_Project_Proposal_Final.pdf), [17-requirement PDF SRS](OEP-17_SRS_Final.pdf), [Word SRS](part-1/Online_Exam_Portal_SRS.docx), [SAD](part-1/Online_Exam_Portal_SAD.docx), [Test Plan](part-1/Online_Exam_Portal_Test_Plan.docx) and [GitHub backlog](GITHUB_BACKLOG.md). The crosswalk below preserves both SRS identifier sets. It adds no duplicate implementation issues and does not renumber existing requirements.

The current [Project Plan](05_Project_Plan.md) and [Sprint Planning Table](https://github.com/users/Manaswi-Guntupalli/projects/3/views/3) define Sprint 1 as **19–23 October 2026** and Sprint 2 as **26–30 October 2026**. Earlier dates in historical documents are superseded by that delivery plan. GitHub Issues and Projects hold current work tracking; historical Jira/OEP references provide traceability.

The team reviews this proposed agreement through the linked PR. Scope agreement completes a planning decision; working functionality still needs its implementation, tests and review under the existing stories.

## Included functionality

The implementation stack is **MongoDB/Mongoose, Express, React and Node.js (MERN)**. Release 1 includes:

1. Authentication for active Student, Instructor and Admin accounts; login, logout and protected sessions.
2. Server-enforced role and resource-ownership authorization.
3. Minimum Admin account provisioning, single-role assignment and active/inactive account management, including secure initial Admin setup.
4. Instructor creation, editing and deletion of owned draft examinations, with title, optional description, optional availability start time and a positive duration.
5. Exam-specific MCQ questions/options with at least two nonblank options and exactly one correct option per question.
6. Validation and publication of owned exams; an Instructor dashboard listing owned draft/published exams and permitted actions.
7. Student discovery of eligible published exams, start/resume, saved answers and question navigation.
8. Server-authoritative deadlines, manual submission and automatic timeout finalization, including when the browser closes.
9. Automatic MCQ evaluation, persisted scores, Student own-result viewing and Instructor owned-exam result viewing.
10. The existing shared persistence, functional/security testing, documentation and delivery tooling tasks supporting those capabilities.

GitHub Actions is required in Sprint 1 under [#44](https://github.com/Manaswi-Guntupalli/SE_MINI_PROJECT/issues/44). Jenkins under [#42](https://github.com/Manaswi-Guntupalli/SE_MINI_PROJECT/issues/42) is additional required work. Docker, SonarQube, smoke testing and the sprint demo evidence remain within their existing tasks. A lower scheduling priority does not remove an item from Release 1.

## Excluded functionality

Negative marking; AI question generation or proctoring; reusable question banks; course/enrollment management; advanced analytics; CSV export; offline synchronization; native mobile applications; and multiple result-release modes are outside Release 1. Public self-registration, a retake subsystem and answer-key disclosure are not required by the minimal release. Future ideas must be recorded separately rather than silently added to implementation.

## Shared business rules

| Area | Required behaviour |
|---|---|
| Availability | Only published exams are discoverable/startable by Students. An optional availability start time gates a new attempt; it is not the attempt's duration origin. |
| One attempt | One attempt per Student/exam. Repeated start requests resume the same attempt and preserve its deadline; they do not create retakes. |
| Time | The server records the start and fixed deadline. Duration runs from attempt start. Refresh, browser time changes and reconnects cannot extend it. Saves at or after the deadline are rejected. |
| Publication | Publish only an owned valid draft with valid questions/options. Published examination definitions, questions, options and answer keys cannot be edited or deleted. |
| Answer persistence | Each question has one latest saved response. An acknowledged successful save must survive navigation/refresh. Loading, pending and failed saves must be shown honestly. |
| Manual submission | Submit the Student's own active attempt. Finish pending saves while time permits or explain that only successfully saved responses are included. Unanswered questions do not prevent submission. |
| Timeout | A server expiry mechanism finalizes expired attempts from their persisted responses even if the browser closes; document and test its processing interval under #47. |
| Finalization | Manual and timeout paths share one atomic active-to-submitted transition and a consistent saved-response snapshot. Repeated/racing requests return the same persisted outcome. Further writes are rejected. |
| Evaluation | Award **1** for each correct response and **0** for each incorrect/unanswered response. Maximum score is the number of published questions. There are no variable question weights or negative marks in Release 1. |
| Recovery | Persist submission before evaluation. Evaluation failure leaves the attempt submitted/evaluation-pending; server retry must not reopen answers or create duplicate results. |
| Result privacy | Students see their own results. Instructors see student identities/scores only for examinations they own. Pending evaluation and empty/error states are explicit. |
| Account history | Role/status changes retain historical exam, attempt and result associations. Current stored privileges control subsequent requests. |

## Requirement crosswalk and implementing issues

The PDF SRS defines **17 primary scope IDs**. The Word SRS decomposes the scope into **21 functional IDs**. All 21 appear below. FR-08 is stated explicitly as an owned-exam dashboard capability in the SRS narrative and #37; it has no separate functional table ID in the original Word SRS.

| Primary ID | Capability | Word SRS ID or narrative | Existing implementing issues |
|---|---|---|---|
| FR-01 | Login/logout | AUTH-FR-01, AUTH-FR-02 | [#23 / OEP-14](https://github.com/Manaswi-Guntupalli/SE_MINI_PROJECT/issues/23) |
| FR-02 | Role enforcement and Admin accounts | AUTH-FR-03, ADMIN-FR-01 | [#24 / OEP-15](https://github.com/Manaswi-Guntupalli/SE_MINI_PROJECT/issues/24), [#51 / OEP-42](https://github.com/Manaswi-Guntupalli/SE_MINI_PROJECT/issues/51) |
| FR-03 | Create exam | EXAM-FR-01 | [#33 / OEP-24](https://github.com/Manaswi-Guntupalli/SE_MINI_PROJECT/issues/33) |
| FR-04 | Edit/delete draft | EXAM-FR-02, EXAM-FR-03 | [#34 / OEP-25](https://github.com/Manaswi-Guntupalli/SE_MINI_PROJECT/issues/34) |
| FR-05 | Manage questions | QUES-FR-01, QUES-FR-02 | [#35 / OEP-26](https://github.com/Manaswi-Guntupalli/SE_MINI_PROJECT/issues/35) |
| FR-06 | Options and correct choice | QUES-FR-03 | [#35 / OEP-26](https://github.com/Manaswi-Guntupalli/SE_MINI_PROJECT/issues/35) |
| FR-07 | Publish valid exam | EXAM-FR-04 | [#36 / OEP-27](https://github.com/Manaswi-Guntupalli/SE_MINI_PROJECT/issues/36) |
| FR-08 | Owned-exam dashboard | SRS section 2.2 and this agreement | [#37 / OEP-28](https://github.com/Manaswi-Guntupalli/SE_MINI_PROJECT/issues/37) |
| FR-09 | Eligible published-exam listing | ATT-FR-01 | [#38 / OEP-29](https://github.com/Manaswi-Guntupalli/SE_MINI_PROJECT/issues/38) |
| FR-10 | Start/resume one attempt | ATT-FR-02 | [#39 / OEP-30](https://github.com/Manaswi-Guntupalli/SE_MINI_PROJECT/issues/39) |
| FR-11 | Timer enforcement | ATT-FR-04 | [#46 / OEP-37](https://github.com/Manaswi-Guntupalli/SE_MINI_PROJECT/issues/46) |
| FR-12 | Saved answers/navigation | ATT-FR-03 | [#40 / OEP-31](https://github.com/Manaswi-Guntupalli/SE_MINI_PROJECT/issues/40) |
| FR-13 | Manual submission | ATT-FR-05 | [#47 / OEP-38](https://github.com/Manaswi-Guntupalli/SE_MINI_PROJECT/issues/47) |
| FR-14 | Timeout submission | ATT-FR-06 | [#46 / OEP-37](https://github.com/Manaswi-Guntupalli/SE_MINI_PROJECT/issues/46), [#47 / OEP-38](https://github.com/Manaswi-Guntupalli/SE_MINI_PROJECT/issues/47) |
| FR-15 | Evaluation and persisted scores | EVAL-FR-01, EVAL-FR-02 | [#48 / OEP-39](https://github.com/Manaswi-Guntupalli/SE_MINI_PROJECT/issues/48) |
| FR-16 | Student own result | RES-FR-01 | [#49 / OEP-40](https://github.com/Manaswi-Guntupalli/SE_MINI_PROJECT/issues/49) |
| FR-17 | Instructor owned-exam results | RES-FR-02 | [#50 / OEP-41](https://github.com/Manaswi-Guntupalli/SE_MINI_PROJECT/issues/50) |

[#52](https://github.com/Manaswi-Guntupalli/SE_MINI_PROJECT/issues/52) provides shared MongoDB models/constraints. [#53](https://github.com/Manaswi-Guntupalli/SE_MINI_PROJECT/issues/53) covers integrated functional/security verification. Those supporting tasks do not replace the feature owners' own acceptance checks.

## Permissions matrix

Every account has exactly one of Student, Instructor or Admin. Every protected operation requires an authenticated, active account. Active accounts may log in/out; anonymous users may attempt login, while inactive accounts cannot authenticate successfully.

| Protected operation | Student | Instructor | Admin | Anonymous or inactive |
|---|---|---|---|---|
| List eligible published exams | Allowed | Denied | Denied | Denied |
| Start/resume an attempt | Own eligible exam attempt | Denied | Denied | Denied |
| Read/save/navigate answers | Own active attempt; before deadline | Denied | Denied | Denied |
| Manually submit | Own active attempt; finalization rules apply | Denied | Denied | Denied |
| View Student results | Own results only | Denied through Student workflow | Denied | Denied |
| Create exam | Denied | Allowed; owner comes from session | Denied | Denied |
| List/read Instructor exams | Denied through authoring workflow | Owned exams only | Denied | Denied |
| Edit/delete exam or questions/options | Denied | Owned draft only | Denied | Denied |
| Read private authoring definitions | Denied | Owned exam only | Denied | Denied |
| Publish exam | Denied | Owned valid draft only | Denied | Denied |
| View exam-wide results | Denied | Owned exam only | Denied | Denied |
| List/provision accounts | Denied | Denied | Allowed | Denied |
| Change roles or active status | Denied | Denied | Allowed; retain history | Denied |

Admin is an account-administration role. It does not inherit Instructor or Student permissions. A role change does not transfer historic ownership to another user or make old resources public.

### Enforcement and confidentiality

The Express backend enforces the matrix for direct URLs and manually constructed API requests as well as normal UI use. Hidden buttons are only a user-interface convenience. Resolve the account from the authenticated session, then verify its current stored active status and role, the requested object's ownership, membership of nested objects and permitted lifecycle state before returning protected data or making a change.

Students can access only attempts/results whose student ID matches their session account. Instructors can manage exams/questions/options and view results only when the exam owner matches their session account. A question must belong to the requested exam and a selected option to the requested question. Validate identifiers and payloads; a valid foreign ID is still unauthorized.

Use role-specific response projections. Student exam/attempt payloads omit correct-option IDs, correctness flags, answer keys and private authoring metadata. No API returns password values/hashes, session-store secrets or database credentials. Correct-answer disclosure is not a required result feature. Ignore or reject client-supplied owner/student identity, role, active status, deadline, submitted status or score outside the explicitly authorized account operation; derive protected values on the server.

Only Admins provision accounts and change roles/status under #51. Enforce a unique validated login identifier and exactly one permitted role. Use the shared password/session helpers from #23, preserve historical references and document a secure initial Admin procedure without a committed default credential. Deactivation/demotion must remove affected access on subsequent requests, including requests using an existing session.

### Authentication and shared API conventions

- Use the single server-managed authenticated session mechanism required by #23 and the PDF SRS. Successful login establishes a session; logout invalidates it on the server and clears the browser cookie. Replaying a logged-out session fails.
- Session cookies are HttpOnly and, in HTTPS deployment, Secure, with a documented SameSite policy. State-changing authenticated requests receive CSRF protection. If development uses separate origins, document an explicit credential-aware CORS allowlist.
- Return safe JSON errors. The SAD uses 400 for invalid input, 401 for missing/invalid authentication, 403 for forbidden access, 404 for missing resources and 409 for lifecycle conflicts. Avoid protected resource details in errors; keep handler behaviour consistent and test it.
- Send timestamps in UTC ISO 8601 form; display availability with its timezone. The attempt contract returns its server-recorded start/deadline and server time as needed by the timer.
- #23/#24 and #51 consume this same matrix. Before implementation, Tanusha and Guru record the session-store choice, cookie/CSRF configuration, local origins and exact shared request/response shapes in their implementation PRs. These configuration choices remain pending; no team agreement is invented here.

## Planned positive and negative checks

Use controlled fixtures: two active Students S1/S2, two active Instructors I1/I2, an Admin A1 and inactive accounts. I1 owns draft D1 and published exam P1; I2 owns D2/P2. Each Student has their own attempt/result. Use valid foreign IDs so ownership tests exercise authorization rather than only invalid-input handling.

Every case below is **Not Executed**. These are reviewable specifications for #23/#24/#51 and incremental work under #53. Each future execution record must include the tested commit, fixture/preconditions, actual outcome and evidence link. Existing Test Plan IDs remain unchanged.

| Case ID | Requirement(s) and issues | Action | Expected result |
|---|---|---|---|
| TC-RBAC-01 | AUTH-FR-01; #23 | Log in separately as each active role with valid credentials | Authenticated session for the correct account; only that role's workflow available |
| TC-RBAC-02 | AUTH-FR-01; #23 | Use a wrong password, unknown login or inactive account | Safe rejection; no usable authenticated session |
| TC-RBAC-03 | AUTH-FR-02, OEP-SR-002; #23 | Log out and reuse the old cookie against a protected API | Server session invalid; protected access rejected |
| TC-RBAC-04 | OEP-SR-002, OEP-SR-003; #23/#24 | Call protected APIs without a session or with an invalid session | No protected data returned and no state changed |
| TC-RBAC-05 | ATT-FR-01, ATT-FR-02; #38/#39 | S1 lists exams and starts/resumes an eligible published exam; try a draft/future exam | Eligible start/resume succeeds once; draft/future start rejected; deadline preserved |
| TC-RBAC-06 | AUTH-FR-03, OEP-SR-003; #24 | S1 directly calls exam create/edit/delete, question and publish APIs | Each Instructor-only action denied without mutation |
| TC-RBAC-07 | OEP-SR-004; #24/#39/#40/#47 | S1 reads, saves or submits S2's valid attempt ID | All operations denied; S2's answers/state remain unchanged |
| TC-RBAC-08 | RES-FR-01, OEP-SR-004; #49 | S1 requests own result, then S2's valid result ID | Own result allowed; foreign result denied |
| TC-RBAC-09 | EXAM-FR-01, EXAM-FR-02, EXAM-FR-03, QUES-FR-01, QUES-FR-02, QUES-FR-03; #33/#34/#35 | I1 creates and manages an owned valid draft and its questions/options | Valid changes persist with I1 ownership |
| TC-RBAC-10 | OEP-SR-004; #24/#34/#35 | I1 uses D2 or its question/option IDs in edit/delete requests | Foreign operations denied; no data changed |
| TC-RBAC-11 | EXAM-FR-04, QUES-FR-03; #36 | I1 publishes an owned valid draft, then tries incomplete data or a foreign draft | Only the owned valid draft publishes |
| TC-RBAC-12 | FR-04, FR-05, FR-06, FR-07; #34/#35/#36 | Owner tries editing/deleting a published definition, question, option or answer key | Mutation rejected; published content and historical references intact |
| TC-RBAC-13 | FR-08, RES-FR-02, OEP-SR-004; #37/#50 | I1 lists owned exams and requests P1 results, then P2 results | Owned dashboard/results allowed; foreign results denied |
| TC-RBAC-14 | AUTH-FR-03, ADMIN-FR-01; #24/#51 | I1 calls account listing, provisioning or role/status mutation | Admin-only operations denied |
| TC-RBAC-15 | ADMIN-FR-01; #51 | A1 provisions valid accounts with each permitted single role and changes active status | Authorized validated changes persist; no password/hash returned |
| TC-RBAC-16 | ADMIN-FR-01, OEP-SR-003; #24/#51 | S1/I1 sends a role/active-status update or privileged account-creation payload | No self-escalation, account mutation or privileged account created |
| TC-RBAC-17 | AUTH-FR-03; #24 | A1 calls Student attempt/result and Instructor authoring/result workflows using Admin role alone | Denied; no implicit inheritance |
| TC-RBAC-18 | AUTH-FR-03, ADMIN-FR-01; #23/#24/#51 | Change an account's role or deactivate it, then reuse its existing session | Next request uses current stored privileges; removed permissions fail |
| TC-RBAC-19 | ADMIN-FR-01; #51/#52 | Change role/status of an account linked to exams/attempts/results | Historical associations remain intact and private |
| TC-RBAC-20 | ADMIN-FR-01, OEP-SR-001; #23/#51 | Follow initial Admin setup and inspect tracked config/API responses | Admin can be provisioned; no default credential, plaintext password or hash exposed |
| TC-RBAC-21 | OEP-SR-005; #24/#39/#40 | Inspect all Student exam/attempt response bodies, including nested options and errors | No correct-option ID, correctness flag, answer key or private authoring data |
| TC-RBAC-22 | AUTH-FR-01/02, OEP-SR-002; #23 | Inspect cookie attributes and attempt a state-changing request without valid CSRF protection | Documented cookie protections present; unauthorized state change rejected |
| TC-RBAC-23 | OEP-SR-004, OEP-SR-006; #24/#35/#40/#52 | Send malformed IDs or an option/question from a different parent object | Safe rejection, no disclosure and no inconsistent persisted state |
| TC-RBAC-24 | ATT-FR-03, ATT-FR-04, ATT-FR-05, ATT-FR-06; #40/#46/#47 | Save on an owned submitted/expired attempt; repeat/race submission and timeout | No late answer change; one durable finalization/outcome |
| TC-RBAC-25 | ADMIN-FR-01, OEP-SR-006; #51 | A1 creates a duplicate login, invalid role or incomplete account | Validated rejection; no duplicate/partial account |
| TC-RBAC-26 | AUTH-FR-03, OEP-SR-004, OEP-SR-006; #24/#33/#39/#40 | Supply forged owner/student/role/deadline/score fields through ordinary feature APIs | Server derives protected fields or rejects payload; no privilege or score manipulation |

## Existing quality targets

The Word SRS targets remain unchanged: OEP-NF-001 requires the 95th percentile of non-file API requests to be at most 2 seconds at up to 30 concurrent active users, excluding client network delay; OEP-NF-002 requires acknowledged-save durability; OEP-NF-003 covers current major Chrome/Edge versions at 1366×768 or higher; OEP-NF-004 requires at least 70% line coverage for scoped backend business logic by Sprint 2 end; OEP-NF-005 requires useful errors without sensitive internals. OEP-SR-001..006 retain password hashing, authentication, RBAC, ownership, answer confidentiality and backend validation requirements. These are acceptance targets awaiting execution evidence.

## Team agreement and completion evidence

| Team member | GitHub account | Review evidence |
|---|---|---|
| Guntupalli Manaswi | Manaswi-Guntupalli | Prepared at the assignee's request; final agreement pending |
| Tanusha Prakash | Tanusha181825 | Requested through the PR; agreement pending |
| Vidimalla Guru Teja | Guruteja2319 | Requested through the PR; agreement pending |

Each member should confirm the included/excluded scope, +1/0 rules, primary-ID crosswalk and permission matrix against the cited documents. Resolve changes in the PR and retain actual review/comment permalinks and dates. Any changed decision must be carried into the affected source documents and implementation contracts before approval.

For #17, completion requires all three members' recorded agreement and consistent scope/rules/traceability across Proposal, SRS and backlog. For #19, completion requires the reviewed matrix, ownership/confidentiality rules, account/session behaviour and concrete check mapping to agree with #23/#24/#51. The PR is ready for human review; both issues remain open until their remaining agreement/review criteria are met. Merging this documentation does not certify application functionality, execute these planned tests or complete #18's real team workflow verification.
