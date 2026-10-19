# Online Exam Portal — Software Engineering Mini Project

A web-based multiple-choice examination system for instructors, students and administrators.

## Team
- Tanusha Prakash (PES1UG24CS494) — Exam and Question Management
- Guntupalli Manaswi (PES1UG24CS548) — Student Exam Attempt
- Vidimalla Guru Teja (PES1UG24CS528) — Evaluation and Results

All members contribute to shared authentication, access control, MongoDB integration, security, testing, GitHub reviews, CI/CD and documentation.

## Technology baseline
- Frontend: React
- Backend: Node.js and Express
- Database: MongoDB (Mongoose)
- Quality and delivery: Git, GitHub Actions, Jenkins, Docker, SonarQube

These are the agreed technology choices, not a claim that every component is already implemented.

## Project management — GitHub only
**[Online Exam Portal — Release 1 Project Board](https://github.com/users/Manaswi-Guntupalli/projects/3)** · [Kanban view](https://github.com/users/Manaswi-Guntupalli/projects/3/views/1)
**GitHub Issues is the authoritative product backlog:** https://github.com/Manaswi-Guntupalli/SE_MINI_PROJECT/issues

- [Epics](https://github.com/Manaswi-Guntupalli/SE_MINI_PROJECT/issues?q=is%3Aissue+label%3Atype%3Aepic)
- [User stories](https://github.com/Manaswi-Guntupalli/SE_MINI_PROJECT/issues?q=is%3Aissue+label%3Atype%3Astory)
- [Implementation and documentation tasks](https://github.com/Manaswi-Guntupalli/SE_MINI_PROJECT/issues?q=is%3Aissue+label%3Atype%3Atask)
- [In progress](https://github.com/Manaswi-Guntupalli/SE_MINI_PROJECT/issues?q=is%3Aissue+label%3Astatus%3Ain-progress)
- [In review](https://github.com/Manaswi-Guntupalli/SE_MINI_PROJECT/issues?q=is%3Aissue+label%3Astatus%3Areview)
- [Completed](https://github.com/Manaswi-Guntupalli/SE_MINI_PROJECT/issues?q=is%3Aissue+label%3Astatus%3Adone)

The OEP identifiers are retained as stable historical identifiers and correspond to the already-created GitHub issues. Work planning, ownership, progress, and evidence should now be managed in GitHub, **not Jira**. See [GitHub Backlog Guide](docs/GITHUB_BACKLOG.md) for the complete epic/story/task mapping, estimates, ownership, sprint and roadmap configuration, and outstanding setup checks.

## Development workflow
- `main`: stable release branch
- `develop`: integration branch
- `feature/*`: features and stories
- `docs/*`: documentation
- `fix/*`: bug fixes
- `test/*`: tests
- `chore/*`: tooling, configuration and DevOps

Create a branch for the linked GitHub issue, commit with the issue reference, open a pull request targeting `develop`, request teammate review, verify tests and then merge. Keep the GitHub Project Status and the issue's status label consistent; close the issue only when its acceptance criteria are met. The Project Status and labels are separate GitHub fields.

Follow the [development workflow and verification guide](docs/DEVELOPMENT_WORKFLOW.md) for the exact steps, review/merge responsibilities and #18 evidence checklist. Repository setup is verified; independent teammate review and actual team workflow demonstrations remain pending.

The assigned developer raises the PR and the repository owner reviews and merges it. [GitHub Actions](.github/workflows/repository-checks.yml) runs repository checks on PRs and pushes. Application install/build/test stages must be added as the MERN code and real test suites become available under [#44](https://github.com/Manaswi-Guntupalli/SE_MINI_PROJECT/issues/44); repository checks do not establish application correctness. Jenkins is additional tooling, not a substitute for the required GitHub Actions automation.

## Two-sprint delivery plan

| Sprint | Dates in 2026 | Existing child issues | Required outcome |
|---|---|---|---|
| Sprint 1 | 19–23 October | #17–#37, #42, #44, #51, #52 (25) | Secure instructor workflow, GitHub Actions, reviewed developer PRs, one-minute working-product video uploaded to the repo |
| Sprint 2 | 26–30 October | #38–#41, #43, #45–#50, #53 (12) | Complete student/evaluation/results workflow, real testing and smoke evidence, two-minute working-product video, final documentation and development freeze |

See the saved [Sprint Planning Table](https://github.com/users/Manaswi-Guntupalli/projects/3/views/3), [estimate review](docs/ESTIMATE_REVIEW.md) and [deliverable checklist](docs/GITHUB_BACKLOG.md#deliverables-part-2-checklist). The eight completed documentation issues remain closed; their Sprint 1 placement records prerequisites. Sprint 3 is retained as an unused Project iteration and has no Release 1 items assigned.

## Scope
Release 1 covers account roles, instructor exam and MCQ management, published timed student attempts, server-side answer persistence, submission, automated scoring and result visibility. Negative marking, AI proctoring, offline synchronization, advanced analytics and mobile apps are excluded.

## Documentation
Documentation lives in [docs/](docs/). The project is planned and delivered iteratively using Agile practices.
