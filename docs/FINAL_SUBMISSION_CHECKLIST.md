# Final checkpoint and peer review checklist

Prepared 5 November 2026 against the supplied Mini Project Demo FAQ and evaluation checklist. This is a review candidate, not an assertion of faculty acceptance. No extra feature, Docker/Sonar project, Gantt chart or public deployment was added solely for these PDFs. Earlier approved course obligations still require an explained/accepted disposition where relevant.

The application baseline is main `13ec9982bff073be048c54d51b59cb3d761672a2`, promoted through PR 70, with the integrated implementation from PR 71. Finalization changes are limited to the repeatable benchmark, evidence, required documents/diagrams/videos and accurate current instructions. Business logic and UI source are unchanged. [Specifications](part-1/README.md), [four reports](FINAL_CHECKPOINT_REPORT.md), [deviations](FINAL_DEVIATIONS.md) and [videos](videos/README.md) form the submission index.

| Item | Required criterion | State | Evidence or exact remaining action |
|---|---|---|---|
| 1 | IEEE style SRS | Ready for review | Current SRS has the required specification structure; final peer acceptance remains genuine. |
| 2 | SRS introduction and description | Done | Purpose, scope, audience, operating environment, interfaces and constraints. |
| 3 | Measurable FRs and NFRs | Done | 21 functional, five nonfunctional IDs; classroom latency, persistence, browsers, coverage and safe errors. |
| 4 | UML use case diagram | Done | Actors, system boundary and associated use cases in SRS and docs/diagrams. |
| 5 | Security objectives and requirements | Done | Two objectives and six security requirements. |
| 6 | IEEE style Test Plan | Ready for review | 15 sections retained with actual execution and explicit limits. |
| 7 | Test Plan sections 3 4 5 | Done | Test scope, exclusions, strategy and criteria completed. |
| 8 | Test Plan security section 5.1 | Done | Authentication, roles, ownership, confidentiality, CSRF and validation. |
| 9 | SRS test traceability | Done | All 32 requirement IDs map to test references and real evidence. |
| 10 | Minimum 7 to 10 FR and NFR cases | Done | Original 16 explicit cases retained; 33 referenced IDs now mapped and documented. |
| 11 | IEEE style SAD | Ready for review | Architecture/design, interfaces, security, rationale and traceability completed. |
| 12 | Architecture components pattern traceability security | Done | Layered MERN components and actual data/worker/security boundaries. |
| 13 | Two UML sequences API errors | Done | Two lifeline/message sequences plus current endpoint/payload/status table. |
| 14 | GitHub Project linked to repo | Done | Project 3 linked in README; native issues and sprint view exist. |
| 15 | FR and NFR backlog | Done | Existing backlog retained; final Test Plan adds actual performance/browser execution evidence. |
| 16 | Story Points on backlog items | Owner action | 34 current planned release children had native points at audit. Optional #67 has an existing retrospective 8-point body estimate but its native Project field was blank; set it consistently if included in assessed backlog. Do not invent velocity. |
| 17 | Individual story ownership | Done | Existing Tanusha, Manaswi and Guru assignments retained. |
| 18 | Two planned sprints | Done | Original planned dates preserved; later validation dates are explicit. |
| 19 | Actions on pushes and PRs | Done | Application Ubuntu/Windows and repository workflows exist; verify this review branch checks after push. |
| 20 | Code aligned with SRS SAD | Ready for review | No new business behavior; documents now describe the integrated release. Explain final deviations. |
| 21 | Assigned members raised PRs | Done with provenance | Actual member PRs listed below; Manaswi UI source integrated through Tanusha PR 71, not falsely attributed. |
| 22 | Formal peer and owner review | Owner action | Approve this final PR after real review. Earlier approvals on 55/56/58 do not substitute for missing code/release reviews. |
| 23 | Sprint 1 one minute video in repo | Prepared | 60-second faithful cut; original full source retained, dates not backdated. |
| 24 | Sprint 2 complete and freeze | Owner action | Feature scope frozen for this review candidate by finalization request; owner must accept exact final commit after checks/review. |
| 25 | Document deviations | Done | FINAL_DEVIATIONS.md explains actual changes and any earlier tooling exception requiring evaluator acceptance. |
| 26 | Final project documents | Ready for review | Updated Word documents and current contracts/index; original PDF/XLSX and dated reports explicitly historical. |
| 27 | Sprint 2 two minute video in repo | Prepared | 120-second actual current product recording with captions and duration/source record. |
| 28 | Original cases updated | Done | IDs retained; expected behavior refinements documented; 33 case mappings are not mislabeled independent new runs. |
| 29 | Tests executed according to plan | Done for declared local scope | CI/security plus Chrome/Edge, classroom performance and coverage evidence. Production/network/load exclusions explicit. |
| 30 | Unit report in docs | Done | Final UNIT_REPORT with JUnit and scoring output. |
| 31 | System validation report in docs | Done | Real HTTP/browser results, 30-user benchmark and exact versions. |
| 32 | Code coverage report in docs | Done | Backend lines 89.93%; frontend lines 89.95%; raw summary/Cobertura. |
| 33 | Branch coverage report in docs | Done | Backend 76.12%; frontend 83.33%; raw reports retained. |
| 34 | Working core use cases | Done on recorded execution | 178 tests passed plus ten diagnostics; requester also reported successful complete walkthrough. |
| 35 | Team explains deviations | Each member | Read and explain FINAL_DEVIATIONS; repository artifacts cannot certify an oral answer. |
| 36 | Accessible readable version controlled code | Ready for review | Public repo; review branch preserves main, source history and existing functionality. |
| 37 | Individual contribution explanation | Each member | Show own actual issues, PRs and source, using the provenance table below. |
| 38 | Agile SDLC understanding | Each member | Explain actual estimates, sprint plan and integration blockers; planning points are not claimed completed velocity. |
| 39 | Architecture API test justification | Each member | Explain sessions/CSRF, ownership, immutable publication, deadlines, revisions, transactions, worker retry and +1/0 scoring. |

## Actual contribution and review provenance

| Member | Real contribution examples | Review evidence and boundary |
|---|---|---|
| Tanusha Prakash / Tanusha181825 | Auth/roles, Instructor authoring; PR 59; final cross-branch integration and stale-answer security fix in PR 71 | PRs 59/71 merged, but no submitted approval was found at audit. User confirmed the full manual walkthrough. This is not all members' startup evidence. |
| Guntupalli Manaswi / Manaswi-Guntupalli | Scope/workflow/CI PRs 55/56/58; Student/shared lavender UI source in PR 66 and branch feature/issue-65-shared-portal-ui; testing/final release preparation | Guru approved 55/56/58. PR 66 source was reconciled into 71; do not claim 66 itself merged or create fake coauthor/review records. |
| Vidimalla Guru Teja / Guruteja2319 | Persistence and evaluation/results work in PRs 63/68/69 and corresponding commits | Genuine submitted approvals on 55/56/58 are visible. No submitted approvals found on 63/68/69 at audit. |

PR 70 is merged to main. It and PR 71 had no submitted approvals at the last read. A current genuine review can assess the final tree; it cannot backdate missing historical reviews. The owner should confirm that this satisfies the assessor's review expectation.

## Reviewer completion steps

1. Read the three specifications, deviations, current reports and both videos; check this PR's exact diff and Actions results.
2. Run the existing startup steps and core workflow on each teammate's own machine/account, recording only actual outcomes. Each person must understand their own code/PRs.
3. Reconcile issue/Project state after acceptance: results stories 48/49/50 remain open; epics 12/13/14 and task 53 are now closed but some status labels/checklists still say Todo. Use actual acceptance evidence and update native Project Status and labels consistently. The branch does not silently mutate project fields or impersonate reviewers.
4. Confirm #67's optional native points disposition using its existing retrospective estimate; keep historical planned totals separate from current work/velocity.
5. Submit a genuine review, resolve any findings, then owner accepts/merges this PR and records the exact release commit/date as the final freeze. No final acceptance signature is generated here.
6. Rehearse the three viva areas: individual contribution; real Agile planning/points/blockers; architecture/API/test rationale. Explain permitted AI use and documented deviations accurately.

Repository deliverables are prepared for review. Remaining people-owned actions above cannot be completed by changing files or marking all items Done. The issue states and review observations are dated snapshots; verify them when signing off.
