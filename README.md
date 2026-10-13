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
- Quality and delivery: Git, GitHub, Jenkins, Docker, SonarQube

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

## Scope
Release 1 covers account roles, instructor exam and MCQ management, published timed student attempts, server-side answer persistence, submission, automated scoring and result visibility. Negative marking, AI proctoring, offline synchronization, advanced analytics and mobile apps are excluded.

## Documentation
Documentation lives in [docs/](docs/). The project is planned and delivered iteratively using Agile practices.
