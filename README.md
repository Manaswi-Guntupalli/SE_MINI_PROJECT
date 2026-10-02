# Online Exam Portal

Software Engineering mini-project using an Agile, Scrum-inspired iterative process.

## Project tracking

- [Jira backlog — OEP](https://tanushaprakash.atlassian.net/jira/software/projects/OEP/boards/34/backlog)
- [Jira project](https://tanushaprakash.atlassian.net/jira/software/projects/OEP/summary)

Jira is the source of truth for user stories, tasks, status, acceptance criteria and dependencies. Include the relevant OEP issue key in branch names, commit messages and pull request titles. A GitHub upload does not by itself complete a Jira task.

## Release 1

Instructors create, manage and publish MCQ examinations. Students complete timed attempts, save/change answers, navigate questions and submit manually or automatically on timeout. The system evaluates responses, calculates scores and provides authorized Student/Instructor result views.

Included: authentication with Student, Instructor and Admin roles; exam/question/option management; publication; timed attempts; answer storage/navigation; manual/timeout submission; automatic evaluation/scoring; result viewing. Minimum Admin account/role administration is tracked in OEP-42.

Excluded: negative marking, AI question generation/proctoring, reusable question banks, course/enrollment management, advanced analytics, CSV export, offline synchronization and mobile applications.

## Confirmed technology stack

- React frontend
- Node.js / Express backend
- MongoDB / Mongoose
- Git and GitHub
- Jira
- Existing planned engineering tools: Jenkins, Docker and SonarQube

Application initialization is tracked in OEP-12; database setup in OEP-13. This repository's planning files are not evidence that the application is implemented or deployed.

## Team ownership

- Tanusha — Exam and Question Management
- Manaswi — Student Exam Attempt
- Gururaj — Evaluation and Results
- Foundation, security, testing and DevOps are coordinated across the team through Jira.

## Documentation ownership and branches

Keep project documents in `docs/`. The first four documents will be authored separately; workflow setup does not create their content.

| Jira task | Document | Owner | Working branch |
|---|---|---|---|
| [OEP-16](https://tanushaprakash.atlassian.net/browse/OEP-16) | Project Proposal / Synopsis | Manaswi | `docs/OEP-16-project-proposal` |
| [OEP-17](https://tanushaprakash.atlassian.net/browse/OEP-17) | Software Requirements Specification | Manaswi | `docs/OEP-17-srs` |
| [OEP-18](https://tanushaprakash.atlassian.net/browse/OEP-18) | Field Layout workbook | Manaswi | `docs/OEP-18-field-layout` |
| [OEP-19](https://tanushaprakash.atlassian.net/browse/OEP-19) | Initial Requirement Traceability Matrix | Manaswi | `docs/OEP-19-rtm` |
| [OEP-20](https://tanushaprakash.atlassian.net/browse/OEP-20) | Agile Project Plan | Tanusha | Existing `docs/project-plan` |
| [OEP-21](https://tanushaprakash.atlassian.net/browse/OEP-21) | Architecture | Tanusha | Existing `docs/architecture` |
| [OEP-22](https://tanushaprakash.atlassian.net/browse/OEP-22) | Software Design | Tanusha | `docs/OEP-22-software-design` |
| [OEP-23](https://tanushaprakash.atlassian.net/browse/OEP-23) | Initial Validation Specification / Test Plan | Tanusha | `docs/OEP-23-validation-plan` |

Existing documents under `docs/` are retained for their owners to review and align with the confirmed stack and SRS. Initial Field Layout/RTM versions describe the planned design; unavailable code/test results remain Pending and are updated after implementation.

## Git and review workflow

- `main`: stable release branch.
- `develop`: integration branch.
- Work branches: `docs/OEP-<number>-<topic>`, `feature/OEP-<number>-<topic>`, `fix/OEP-<number>-<topic>`, `test/OEP-<number>-<topic>`, `chore/OEP-<number>-<topic>`.
- Keep existing branches; they do not need renaming just to match the convention. Include OEP keys in their future commit messages and PR titles.

For each task:

1. Assign it to its agreed owner. Move it to In Progress when work starts.
2. Start from the current `develop` branch. Update an existing work branch with current `develop` before beginning.
3. Commit only the relevant work. Example: `OEP-16 Add project proposal`.
4. Open a pull request into `develop`. Example title: `OEP-16 Complete project proposal`.
5. Link the Jira task in the PR and complete the PR checklist.
6. When all task acceptance criteria are ready for review, move the Jira task to In Review.
7. A teammate reviews and approves significant work; address requested changes.
8. Merge the reviewed complete-task PR into `develop`.
9. Move Jira to Done only when the entire task meets its acceptance criteria. Until a native merge rule is installed and tested, update the status manually.
10. Promote reviewed releases from `develop` to `main` using a separate PR.

Use one complete-task PR per documentation task for the proposed merge-to-Done rule. Partial/draft uploads should remain In Progress and must not close the task. Later document maintenance uses its own task-specific PR so an initial document is not confused with completed implementation/testing.

## GitHub ↔ Jira integration setup status

The repository includes issue-key conventions and links. This does not prove the native GitHub for Atlassian/Jira app is installed or that automatic transitions are enabled.

A site admin must authorize the native integration for this repository. Then an OEP project admin can configure and test the documentation rule:

- Trigger: Pull request merged.
- Condition: project OEP, issue in OEP-16 through OEP-23, status In Review.
- Destination branch: `develop`.
- Action: transition to Done.
- Verify the first real reviewed complete-document PR in Jira's automation audit log.

Do not put Jira tokens or GitHub tokens in repository files. Connecting GitHub to ChatGPT is separate from connecting GitHub to Jira.

## Documentation maintenance

Keep Proposal, SRS, Field Layout, RTM, architecture, design and validation consistent. Add actual code/test evidence only when it exists. Do not infer that a document or linked PR proves a feature passes its tests.
