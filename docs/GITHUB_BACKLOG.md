# GitHub-only Agile backlog and delivery workflow

**Source of truth:** [GitHub Issues](https://github.com/Manaswi-Guntupalli/SE_MINI_PROJECT/issues). Jira is not required for current project management. Historical `OEP-*` IDs are retained to preserve requirement traceability and references in existing course documents.

## Backlog structure

| Epic | GitHub issue | Responsible functional area |
|---|---|---|
| OEP-1 Shared Foundation | #10 | Shared by all three team members |
| OEP-2 Exam & Question Management | #11 | Tanusha |
| OEP-3 Student Exam Attempt | #12 | Manaswi |
| OEP-4 Evaluation & Results | #13 | Vidimalla Guru Teja |
| OEP-5 Testing & Security | #14 | Shared |
| OEP-6 CI/CD & DevOps | #15 | Shared |
| OEP-7 Documentation & Validation | #16 | Shared |

Each epic contains an explicit child-issue checklist. There are **7 epics, 16 stories and 21 tasks**, totaling 44 tracked GitHub issues.

## Workflow labels and views

Update the *single* workflow status label when work changes status. GitHub native issue state remains **Open** during To Do, In Progress and In Review; only close when Done.

| Label | Meaning | Direct view |
|---|---|---|
| `status:todo` | Not started / ready for planning | [To Do](https://github.com/Manaswi-Guntupalli/SE_MINI_PROJECT/issues?q=is%3Aissue+label%3Astatus%3Atodo) |
| `status:in-progress` | Work actively underway | [In Progress](https://github.com/Manaswi-Guntupalli/SE_MINI_PROJECT/issues?q=is%3Aissue+label%3Astatus%3Ain-progress) |
| `status:review` | Awaiting teammate review or acceptance | [In Review](https://github.com/Manaswi-Guntupalli/SE_MINI_PROJECT/issues?q=is%3Aissue+label%3Astatus%3Areview) |
| `status:done` | Criteria completed, validated and reviewed | [Done, including closed](https://github.com/Manaswi-Guntupalli/SE_MINI_PROJECT/issues?q=is%3Aissue+label%3Astatus%3Adone) |

Issue type filters:
- [All epics](https://github.com/Manaswi-Guntupalli/SE_MINI_PROJECT/issues?q=is%3Aissue+label%3Atype%3Aepic)
- [All user stories](https://github.com/Manaswi-Guntupalli/SE_MINI_PROJECT/issues?q=is%3Aissue+label%3Atype%3Astory)
- [All tasks](https://github.com/Manaswi-Guntupalli/SE_MINI_PROJECT/issues?q=is%3Aissue+label%3Atype%3Atask)

Area filters:
- [Shared Foundation](https://github.com/Manaswi-Guntupalli/SE_MINI_PROJECT/issues?q=is%3Aissue+label%3Aarea%3Afoundation)
- [Tanusha's functional module](https://github.com/Manaswi-Guntupalli/SE_MINI_PROJECT/issues?q=is%3Aissue+label%3Aarea%3Aexam-management)
- [Manaswi's functional module](https://github.com/Manaswi-Guntupalli/SE_MINI_PROJECT/issues?q=is%3Aissue+label%3Aarea%3Aexam-attempt)
- [Guru Teja's functional module](https://github.com/Manaswi-Guntupalli/SE_MINI_PROJECT/issues?q=is%3Aissue+label%3Aarea%3Aresults)

`area:*` labels indicate the module, **not** proof of an individual's assignment. Assign issues explicitly to GitHub teammates after agreeing on ownership.

## Working procedure

1. Pick a story/task from Issues, check dependencies, agree on ownership and assign the GitHub issue.
2. Set `status:in-progress` and create an issue-linked branch, e.g. `feature/OEP-31-answer-navigation`.
3. Make focused commits referencing the GitHub issue number and OEP key; add tests and documentation as required.
4. Open a pull request targeting `develop` using `Closes #<issue-number>` when appropriate. Set `status:review`.
5. Obtain teammate review; run checks and confirm acceptance criteria. Update `status:done` and close the issue once work is complete. Note that GitHub auto-close semantics depend on the merge target/default branch; verify closure explicitly for PRs into `develop`.
6. Update the parent epic's checklist. Track review/test evidence directly in the issue/PR.
7. Keep `main` as stable release branch and integrate feature work into `develop` before release.

## Optional visual board

To create a native GitHub Projects Kanban board, open the repository's **Projects** tab, create a new Board project, add existing issues and set the Status field columns to **To Do**, **In Progress**, **In Review**, **Done**. Filter on `repo:Manaswi-Guntupalli/SE_MINI_PROJECT`. The existing `status:*` issue labels are already usable even without a Projects board. **Project-field status and issue labels are separate; keep them aligned** (automation can be added later).

## Scope and quality

Release 1: Student/Instructor/Admin roles, MCQ creation and publication, timed attempts with persisted responses, submission, auto-evaluation and student/instructor results. Preserve MongoDB as the datastore. Do not add unsupported advanced features. Every implementation issue must satisfy its acceptance criteria and have genuine code, review and validation evidence before closing.

## Migration notes (13 October 2026)

All 44 existing GitHub issues were retained, classified by type, area and status, and connected to epic checklists. Pre-existing closed documentation issues remain closed. **Historical Jira snapshots may still be present in older documents or commit history, but GitHub is the authoritative tool from this point onward.** No Jira synchronization or automatic GitHub Projects field updates have been configured.
