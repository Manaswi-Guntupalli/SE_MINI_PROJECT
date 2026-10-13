# Online Exam Portal — Agile Project Plan

**Version:** 0.4 · **Date:** 13 October 2026 · **Course:** UE24CS341A — Software Engineering  
**Status:** Working planning baseline; refine estimates and dates during sprint planning.

## 1. Problem statement and Release 1 scope

A web-based MCQ examination portal. Instructors create, manage and publish exams; students take timed exams and submit responses; the server automatically evaluates submissions and persists results for authorized viewing.

**In scope:** Authentication and Student/Instructor/Admin authorization; exam and question/option CRUD; validation and publication; timed attempts and saved responses; manual and server-enforced timeout submission; automatic +1/0 scoring and results for students and owning instructors.

**Out of scope:** Negative marking; AI generation/proctoring; reusable question banks; course/enrollment management; advanced analytics or CSV export; offline synchronization; native mobile apps.

**Stack:** React, Node.js/Express, MongoDB/Mongoose. GitHub Issues and Projects are the sole current planning system.

## 2. Team and working agreement

| Team member | Module responsibility |
|---|---|
| Tanusha Prakash | Instructor exam and MCQ management |
| Guntupalli Manaswi | Student exam attempt, response persistence, timer, submission |
| Vidimalla Guru Teja | Evaluation, score/result persistence and authorized results views |
| All three | Authentication and roles, data model, security, integration, tests, documentation, pull-request reviews, CI/CD |

Functional module ownership does not replace shared responsibility for integration and review. GitHub issue assignments are authoritative for specific work.

## 3. Agile approach

Use Scrum-inspired, time-boxed iterations and a Kanban workflow. Select stories with testable acceptance criteria, confirm dependencies and team capacity, implement small vertical slices, demonstrate and review completed increments, and improve the backlog each sprint.

**GitHub Project:** [Online Exam Portal — Release 1](https://github.com/users/Manaswi-Guntupalli/projects/3). Its views are a Kanban Board, Sprint Planning Table, and Roadmap (configure the latter two as needed). Project **Status** is the primary Kanban status. Labels `status:*` are a companion classification and must remain consistent; these two GitHub concepts do not automatically sync.

Workflow: **Todo → In Progress → In Review → Done**. Only move to Done when documented acceptance criteria and review/testing evidence are satisfied; close the corresponding GitHub issue. PRs target `develop`, and `main` is the stable release branch. Do not assume merging into `develop` will automatically close an issue.

**Iteration proposal (not committed deadlines):** Five one-week iterations starting 19 October 2026, subject to the team's class timetable and faculty deadlines. Sprint 1: shared foundation and first runnable vertical slice; Sprint 2: instructor drafts/questions/publication; Sprint 3: student eligibility/attempts/answer persistence; Sprint 4: timing, submissions, evaluation and results; Sprint 5: integration, hardening, CI/CD, evidence and demonstration. Carry testing/documentation into every sprint, not just the last.

## 4. Work Breakdown Structure and traceability

| Epic | GitHub | Child work | Primary area |
|---|---|---|---|
| OEP-1 Shared Foundation | [#10](https://github.com/Manaswi-Guntupalli/SE_MINI_PROJECT/issues/10) | Requirements, role matrix, domain model, MERN setup, MongoDB, authentication, Admin accounts | All |
| OEP-2 Exam Management | [#11](https://github.com/Manaswi-Guntupalli/SE_MINI_PROJECT/issues/11) | Create/edit exams, MCQs, publish, owned-exam dashboard | Tanusha |
| OEP-3 Exam Attempt | [#12](https://github.com/Manaswi-Guntupalli/SE_MINI_PROJECT/issues/12) | Available exams, start/resume, answer persistence, timer, submission | Manaswi |
| OEP-4 Results | [#13](https://github.com/Manaswi-Guntupalli/SE_MINI_PROJECT/issues/13) | Auto-evaluation and student/instructor results | Guru Teja |
| OEP-5 Testing & Security | [#14](https://github.com/Manaswi-Guntupalli/SE_MINI_PROJECT/issues/14) | Release 1 functional/security tests | All |
| OEP-6 CI/CD & DevOps | [#15](https://github.com/Manaswi-Guntupalli/SE_MINI_PROJECT/issues/15) | Docker, Jenkins, SonarQube, CI tests and deployment checks | All |
| OEP-7 Documentation | [#16](https://github.com/Manaswi-Guntupalli/SE_MINI_PROJECT/issues/16) | Proposal, SRS, field layout, RTM, project plan, architecture, design, validation specification | All |

**Estimate convention:** Sixteen implementation user stories total **79 story points**, using the initial Fibonacci-style 3/5/8 estimates: shared foundation 15; exam management 22; exam attempt 29; results 13. Six separate foundational tasks have 15 points in their descriptions. Do **not** add both parent-story and implementation-task estimates into sprint velocity or call 79 the entire project effort. Supporting tasks and documentation should receive effort estimates or capacity budgets during sprint planning; story points are relative complexity, **not person-months**.

**Effort and schedule:** The team should record capacity per sprint and any faculty-required person-month estimates separately, based on actual availability. Do not invent effort hours or a Gantt completion baseline before the team agrees. The Roadmap's date fields should reflect approved target dates, not arbitrary claimed commitments. Identify dependencies: roles/data model → authentication/exam models → publication → attempts/timer/persistence → finalization/evaluation → result views. Build tests and CI alongside implementation.

## 5. Design and reuse decisions

Implement project-specific React views, Express endpoints, MongoDB models and business rules. Reuse established maintained libraries for authentication/password hashing, server validation, date handling, testing and logging; do not implement cryptographic primitives manually. MongoDB/Mongoose is the single datastore. Persist published exam/question snapshots or enforce immutable published content, server-controlled attempt deadlines, idempotent submission/evaluation and restricted answer-key access.

## 6. Definition of Ready and Done

**Ready:** A documented actor/outcome, scope and acceptance criteria; dependencies understood; owner assigned; test approach and realistic sprint capacity agreed.

**Done:** Implementation and documentation match Release 1; role/ownership, timing, persistence and failure cases checked as appropriate; tests executed with real evidence (or explicit justified pending state for planning documents); teammate review; associated PR merged; GitHub project Status and issue state/labels reconciled; requirement traceability updated. Documentation-only deliverables require reviewed, accessible final artifacts rather than fabricated execution evidence.

## 7. Risks and controls

- **Clock tampering and timeout races:** Enforce deadline and idempotent finalization on the server; test retry/late-save behavior.
- **Answer-key and cross-account exposure:** Server-side authorization and negative permission tests.
- **Team integration drift:** Shared contracts, small reviewed PRs, integration tests in CI.
- **Incomplete estimates/dependencies:** Re-estimate and sequence during sprint planning; avoid assigning multiple stories beyond capacity.
- **Documentation drift:** Update SRS, RTM, Field Layout, design and tests when accepted scope or implementation changes.

See [GitHub Backlog Guide](GITHUB_BACKLOG.md) and the current [Project](https://github.com/users/Manaswi-Guntupalli/projects/3) for current status and sprint assignments.
