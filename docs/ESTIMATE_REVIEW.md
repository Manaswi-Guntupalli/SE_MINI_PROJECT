# Review of the 15 missing estimates

**Date:** 13 October 2026. **Source:** existing GitHub issue acceptance criteria, calibrated against the unchanged 2/3/5/8-point estimates in the backlog.

No numeric estimates or team agreement were recorded in these 15 issue descriptions/comments. Manaswi subsequently instructed the assistant to review the work, choose appropriate estimates and assign them. The values below are assistant-reviewed, user-authorized planning estimates; they are not represented as a separate three-person agreement. The earlier proposal was reconsidered against each task's actual scope.

| Issue | Work | Points | Review rationale |
|---|---|---:|---|
| #25 | Proposal / synopsis | 2 | Bounded problem, objectives, scope, team and review; comparable to scope confirmation. |
| #26 | SRS | 5 | Seventeen functional requirements plus NFR/security, business rules, error cases and cross-story traceability. |
| #27 | Field Layout | 3 | Structured field/type/index/lifecycle workbook coordinated with the existing domain design. |
| #28 | RTM | 3 | Map requirements to issues, design and test IDs; maintain pending/evidence entries without authoring the tests. |
| #29 | Agile Project Plan | 3 | Bounded WBS, ownership, tooling and two-sprint schedule; person-month/capacity inputs need actual availability. |
| #30 | High-level architecture | 3 | MERN module interactions, interfaces and security/persistence boundaries; detailed behavior stays in design. |
| #31 | Software design | 5 | Data/API/UML design, lifecycle and atomic/idempotent finalization with save/submit race protection. |
| #32 | Validation specification | 5 | Functional, security and NFR strategy with requirement-mapped IDs and negative cases; execution stays in #53. |
| #41 | Docker configuration | 5 | MERN service builds, networks, persistent volumes, clean-start verification and troubleshooting. |
| #42 | Jenkins pipeline | 5 | Triggers, reproducible install/build stages, secure credentials and real success/failure evidence. |
| #43 | SonarQube | 3 | Bounded sources/exclusions/gate configuration and actual analysis using the application/pipeline. |
| #44 | CI tests and GitHub Actions | 5 | PR/push automation, real frontend/backend test wiring, failure propagation and retained reports. |
| #45 | Deployment and smoke tests | 5 | Admin/runtime setup, restart persistence, role-based end-to-end smoke workflow and recovery evidence. |
| #52 | MongoDB models and constraints | 8 | Cross-module schemas/indexes, valid associations, atomic lifecycle rules and targeted persistence tests. |
| #53 | Functional/security test execution | 13 | Broad unit/integration/system/security coverage, browser-closed expiry, concurrency races, negative authorization cases, defect/retest and RTM evidence. |

The 15 values total **73 points**. Existing 22 estimates total **94** and are unchanged; all 37 children total **167**. Sprint 1 has 99, including 29 for already-closed documentation (#25–#32), leaving 70 for its open work. Sprint 2 has 68. No parent-epic points are added.

These relative estimates do not determine duration or prove available capacity. Historical document points record their original scope and are not new Sprint 1 velocity. Model/feature-specific tests, broader test authoring (#53) and test-suite wiring (#44) have distinct scope; do not bill the same work twice. Revisit uncertainty and capacity with all three members during planning, without silently changing priorities or completed documentation states.
