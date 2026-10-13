# GitHub Agile backlog — Online Exam Portal Release 1

**Project board:** https://github.com/users/Manaswi-Guntupalli/projects/3  
**Product backlog:** https://github.com/Manaswi-Guntupalli/SE_MINI_PROJECT/issues  
**Primary source of truth:** GitHub only. Historical OEP identifiers are retained for document traceability, not Jira dependency.

## Scope baseline

React + Node.js/Express + MongoDB/Mongoose. Student, Instructor and Admin roles; draft exam and MCQ management; publication; timed student attempts and server-persisted responses; manual and automatic timeout submission; +1 correct / 0 incorrect or unanswered automatic scoring; student results and instructor-owned exam results.

**Excluded:** Negative marking; AI question generation/proctoring; reusable question banks; enrollment/courses; advanced analytics; CSV export; offline sync; native mobile apps.

## GitHub issue structure (audit 13 October 2026)

44 existing issues: **7 epics, 16 user stories, 21 tasks**. Every one of the 37 non-epic issues refers to one of the 7 epics in its issue description. The epic Markdown checklists account for all 37 exactly once.

| Epic | Parent issue | Children (GitHub issue numbers) | Story points (stories only) | Primary ownership |
|---|---|---|---:|---|
| OEP-1 Foundation | #10 | #17 #18 #19 #20 #21 #22 #23 #24 #51 #52 | 15 | Shared |
| OEP-2 Exam Management | #11 | #33 #34 #35 #36 #37 | 22 | Tanusha (`Tanusha181825`) |
| OEP-3 Exam Attempt | #12 | #38 #39 #40 #46 #47 | 29 | Manaswi (`Manaswi-Guntupalli`) |
| OEP-4 Evaluation & Results | #13 | #48 #49 #50 | 13 | Guru Teja (GitHub username to confirm) |
| OEP-5 Testing & Security | #14 | #53 | — | Shared |
| OEP-6 CI/CD & DevOps | #15 | #41 #42 #43 #44 #45 | — | Shared |
| OEP-7 Documentation | #16 | #25 #26 #27 #28 #29 #30 #31 #32 | — | Manaswi (#25–28), Tanusha (#29–32) |

All 16 user stories have written acceptance criteria and Fibonacci-style estimates. Their total is **79 points** (15 + 22 + 29 + 13). Six additional foundation tasks (#17–22) have 15 points as separate estimates; do not add these to story velocity or double count them. Fifteen support/documentation tasks do not currently have numeric points. Estimate these separately by agreed team capacity if needed rather than inventing retroactive story points.

**Important: Epic Markdown checklists are not equivalent to native GitHub sub-issue relations.** At this audit, native sub-issue relationships were missing for #24, #51, #52 under #10; #48–50 under #13; #53 under #14; #41–45 under #15; #25–32 under #16. Connect these existing issues through each epic's **Sub-issues → Add existing issue** UI. Do not create duplicates. Until linked, the native epic progress bar may be misleading.

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
- **02-Sprint Planning:** use existing `product backlog` Table view and rename when ready; add `Sprint` (Iteration), `Story Points` (Number), `Priority` (Single select), Assignees and Parent issue. Copy the 16 story-point estimates from descriptions to the numeric field without changing values. Avoid point totals for both stories and support tasks.
- **03-Project Roadmap:** Roadmap layout, Start Date and Target Date fields. Filter to `label:"type:epic"` and enter **team-approved** dates rather than assumed deadlines.

Five one-week sprints beginning 19 October 2026 were **proposed only**, not confirmed or already configured. Agree actual dates and capacity before configuring Iterations.

## Functional story owners

| Story issues | Functional module | Confirmed GitHub username |
|---|---|---|
| #33–37 | Exam/question management | `Tanusha181825` |
| #38–40 and #46–47 | Student exam attempts | `Manaswi-Guntupalli` |
| #48–50 | Evaluation & results | Vidimalla Guru Teja — GitHub handle not yet confirmed |
| #23, #24, #51 | Auth, roles, admin | Agree and assign as shared work |

Support infrastructure, data model, testing and documentation remain shared. A module owner is accountable for integration of its stories; other teammates participate in testing and reviews.

## Definition of Done

Acceptance criteria satisfied; security and correctness validated; real evidence preserved, including tests when implementation exists; teammate review completed; PR merged; project Status and issue state/labels aligned; RTM and dependent documents updated. No fabricated test results or completion evidence.

## Open setup actions

1. Add the 20 missing native sub-issue relationships through GitHub's Projects/Issues UI.
2. Confirm Guru Teja's exact GitHub username and assign #48–50; decide shared issue assignees.
3. Create/complete the Sprint Planning and Roadmap Project views and populate the numeric Story Points field and approved dates.
4. Review and merge the documentation migration PR into `develop`; do not bypass a requested teammate review.
5. Track implementation and executed test evidence separately from finished planning documents.

*This guide is current planning documentation, not a claim that unbuilt features, pipeline jobs, native hierarchy fixes or Project fields already exist.*
