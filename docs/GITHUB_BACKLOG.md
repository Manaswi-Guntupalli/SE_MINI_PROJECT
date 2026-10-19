# GitHub Agile backlog — Online Exam Portal Release 1

**Project board:** https://github.com/users/Manaswi-Guntupalli/projects/3

**Product backlog:** https://github.com/Manaswi-Guntupalli/SE_MINI_PROJECT/issues

**Primary source of truth:** GitHub only. Historical OEP identifiers are retained for document traceability, not Jira dependency.

## Scope baseline

React + Node.js/Express + MongoDB/Mongoose. Student, Instructor and Admin roles; draft exam and MCQ management; publication; timed student attempts and server-persisted responses; manual and automatic timeout submission; +1 correct / 0 incorrect or unanswered automatic scoring; student results and instructor-owned exam results.

**Excluded:** Negative marking; AI question generation/proctoring; reusable question banks; enrollment/courses; advanced analytics; CSV export; offline sync; native mobile apps.

See the [Release 1 scope and permissions agreement](RELEASE_1_AGREEMENT.md) for #17/#19: optional availability start time, one resumable attempt per Student/exam, immutable published content, the complete requirement crosswalk and the same permissions used by #23/#24/#51. Multiple result-release modes are outside the minimal release. Agreement remains pending team review.

## GitHub issue structure (audit 13 October 2026)

44 existing issues: **7 epics, 16 user stories, 21 tasks**. All 37 non-epic issues are linked exactly once through native GitHub Sub-issue relationships under their correct epics. The original 17 relationships were preserved and the 20 missing links completed. Markdown checklists supplement the native relationships.

| Epic | Parent issue | Children (GitHub issue numbers) | Story points (stories only) | Primary ownership |
|---|---|---|---:|---|
| OEP-1 Foundation | #10 | #17 #18 #19 #20 #21 #22 #23 #24 #51 #52 | 15 | Shared |
| OEP-2 Exam Management | #11 | #33 #34 #35 #36 #37 | 22 | Tanusha (`Tanusha181825`) |
| OEP-3 Exam Attempt | #12 | #38 #39 #40 #46 #47 | 29 | Manaswi (`Manaswi-Guntupalli`) |
| OEP-4 Evaluation & Results | #13 | #48 #49 #50 | 13 | Guru Teja (`Guruteja2319`) |
| OEP-5 Testing & Security | #14 | #53 | — | Shared |
| OEP-6 CI/CD & DevOps | #15 | #41 #42 #43 #44 #45 | — | Shared |
| OEP-7 Documentation | #16 | #25 #26 #27 #28 #29 #30 #31 #32 | — | Manaswi (#25–28), Tanusha (#29–32) |

All 37 child issues have saved native Story Points: the existing 22 estimates remain unchanged (94 points), and the 15 previously missing estimates were reviewed and saved (73 points). The total child backlog is 167 points. See [Estimate Review](ESTIMATE_REVIEW.md) for the 15 values and their rationale. Estimates were authorized by Manaswi after asking the assistant to review and choose appropriate values; no separate team-wide agreement is claimed.

**Estimate accounting:** The 16 implementation user stories retain their 79-point subtotal; foundation/support/documentation tasks are separate child work. Do not add epic estimates or treat these mixed-work planning totals as achieved velocity. The eight closed documents represent historical work, not new Sprint 1 delivery. Feature/model-specific tests belong to their implementation criteria; #53 covers the broader cross-module/system/security test scope and #44 owns CI wiring rather than authoring those suites again.

## Board status and issue state

[Kanban](https://github.com/users/Manaswi-Guntupalli/projects/3/views/1): columns Todo, In Progress, In Review, Done. The project **Status** field controls columns; issue labels `status:todo`, `status:in-progress`, `status:review`, `status:done` are distinct and are not automatically synchronized.

At the 13 October 2026 snapshot: Todo 35, In Progress 1 (#18/OEP-9), In Review 0, Done 8 (#25–32). Snapshot counts will change as work progresses. Eight documentation tasks are completed/closed based on the team's confirmation, but their artifacts can be improved as later implementation decisions evolve. Epic #16 remains open for ongoing documentation work; initial checklist completion is not final Release 1 completion.

1. Pick a ready issue with agreed owner and dependencies.
2. Update Project Status and companion issue label; use `feature/OEP-<key>-description` or `docs/*` branch names.
3. Implement work and genuine tests; reference issue number in commits and PR.
4. Open PR to `develop`, move issue to In Review, and request teammate review.
5. After acceptance, review and checks, move to Done, close the issue and update its parent checklist. GitHub PRs merged into `develop` may not auto-close the issue; verify.
6. Move tested releases from `develop` to `main` when appropriate.

## Project fields and views

- **01-Kanban Board:** group cards by native Status with four columns.
- **Product Backlog:** retain the existing backlog table.
- **Sprint Planning Table:** [saved view](https://github.com/users/Manaswi-Guntupalli/projects/3/views/3) with Title, Assignees, Status, Priority, Story Points and Sprint visible. Native Priority values are exactly 19 High, 16 Medium and 2 Low. Low means lower scheduling urgency; every child remains in Release 1.
- **Roadmap:** optional visualization, not a required Part-2 deliverable. Add only if useful with approved dates; this guide does not claim one exists.

Exactly two delivery sprints cover all 37 children:

| Sprint | Dates in 2026 | Issues | Count | Planning points |
|---|---|---|---:|---:|
| Sprint 1 | 19–23 October | #17–#37, #42, #44, #51, #52 | 25 | 99 (29 historical documentation; 70 remaining) |
| Sprint 2 | 26–30 October | #38–#41, #43, #45–#50, #53 | 12 | 68 |

Sprint 3 is preserved as an unused iteration (2–8 November) with no Release 1 issues assigned. All seven parent epics retain their existing fields.

## Functional story owners

| Story issues | Functional module | Confirmed GitHub username |
|---|---|---|
| #33–37 | Exam/question management | `Tanusha181825` |
| #38–40 and #46–47 | Student exam attempts | `Manaswi-Guntupalli` |
| #48–50 | Evaluation & results | `Guruteja2319` |
| #23, #24 | Auth and roles | `Tanusha181825` |
| #51, #52 | Admin and shared persistence models | `Guruteja2319` |
| #41, #42, #44 | Docker, Jenkins, CI/GitHub Actions | `Manaswi-Guntupalli` |
| #43, #45 | SonarQube and deployment/smoke | `Guruteja2319` |
| #53 | Cross-module functional/security testing | All three members |

Support infrastructure, data model, testing and documentation remain shared. A module owner is accountable for integration of its stories; other teammates participate in testing and reviews.

## Definition of Done

Acceptance criteria satisfied; security and correctness validated; real evidence preserved, including tests when implementation exists; teammate review completed; PR merged; project Status and issue state/labels aligned; RTM and dependent documents updated. No fabricated test results or completion evidence.

## Deliverables Part-2 checklist

This schedule follows the supplied **Mini-Project Deliverables Part-2** guideline. Checked entries describe verified setup, not implemented application features.

- [x] Existing GitHub Project contains the repository backlog: 7 epics and 37 native children, with no duplicate issues.
- [x] Existing FR/NFR and security acceptance criteria are retained in the backlog. Implementation and execution traceability must be updated against the submitted SRS/SAD/Test Plan as work progresses.
- [x] All 37 children have owners, native Story Points and the exact requested Priority values.
- [x] All 37 are assigned to the two delivery sprints above. Eight completed documentation issues remain closed/Done.
- [x] GitHub Actions is explicitly included under Sprint 1 issue [#44](https://github.com/Manaswi-Guntupalli/SE_MINI_PROJECT/issues/44), separate from Jenkins [#42](https://github.com/Manaswi-Guntupalli/SE_MINI_PROJECT/issues/42). The [repository workflow](../.github/workflows/repository-checks.yml) checks PRs and pushes. Application-test stages and actual test reports remain pending until code/suites exist.
- [ ] Optional dry run, 12–16 October; do not claim it was completed without evidence. Backlog changes remain permitted on 19 October.
- [ ] During Sprint 1, implement its assigned work against the submitted SRS, SAD and Test Plan; have each assigned developer raise their PR and the repository owner review and merge it.
- [ ] By 23 October, record a **one-minute actual working-product video** and upload it to the repository. A planned video or mockup does not satisfy the guideline.
- [ ] Record and explain deviations from submitted documents during the final demo. Update affected requirements, architecture/design, RTM and tests through reviewed changes.
- [ ] During Sprint 2, complete its remaining assigned work and preserve genuine system, functional/security and deployment-smoke evidence under #53/#45; continue incremental CI integration under #44.
- [ ] By 30 October, record a **two-minute actual working-product video**, complete documentation, and freeze the development cycle. The Sprint 2 guideline explicitly requires the recording; keep it in the repo with the other delivery evidence.

## Evidence and completion rules

Keep real recordings, test reports and deviation notes together in a documented repository location chosen by the team; do not add empty recordings or fabricated result files. Link evidence from the relevant existing issues/PRs and RTM. The repository currently contains documentation, not the MERN application. The repository-check workflow does not establish application-test success or complete #44. Jenkins/Docker/SonarQube, the application features, demo videos, final evidence and freeze must be completed during delivery. Preserve existing issue states until their real acceptance criteria are met.

The older five-iteration proposal is superseded by the supplied two-sprint guideline. This guide reports the current planning baseline and separates setup from outstanding delivery work.
