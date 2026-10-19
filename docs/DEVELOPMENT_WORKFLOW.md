# Git and GitHub Development Workflow

**Issue:** [#18 / OEP-9](https://github.com/Manaswi-Guntupalli/SE_MINI_PROJECT/issues/18)

**Verified:** 19 October 2026 (Asia/Kolkata)

The repository setup is available for the team to use. This guide explains the branch, commit, PR, review and completion steps, and records the evidence against #18. Independent teammate review and the team's own workflow demonstration remain pending; automated preparation does not establish those human actions.

## Branches and issue references

| Branch | Purpose |
|---|---|
| `main` | Stable release branch; promote reviewed integration work through a release PR |
| `develop` | Shared integration branch; ordinary feature, fix, test and documentation PRs target this branch |
| `feature/<topic>` | Application features, models and infrastructure implementations |
| `docs/<topic>` | Requirements, design, workflow and other documentation |
| `fix/<topic>` | Corrections to existing behaviour |
| `test/<topic>` | Test additions and test maintenance |
| `chore/<topic>` | Repository configuration and tooling |

Include the existing OEP key in a descriptive branch name and the GitHub issue number in commits/PRs. They are different identifiers: for example, **OEP-12 is GitHub #21**, and **OEP-9 is GitHub #18**. Reuse the existing issue; do not create a duplicate task for workflow practice.

Examples for real work are `feature/OEP-12-mern-scaffold` (#21), `docs/OEP-11-domain-model` (#20), and `docs/OEP-9-workflow-verification` (#18). Choose a new name for a new contribution; if a branch already exists, inspect and continue it rather than overwriting it.

## Start a contribution

Each person uses their own GitHub account and local Git identity. Accept an authorized repository invitation if needed, then clone once:

```bash
git clone https://github.com/Manaswi-Guntupalli/SE_MINI_PROJECT.git
cd SE_MINI_PROJECT
```

For an existing clone, open that folder instead. Before switching branches:

```bash
git status --short
git fetch origin
```

If the status lists unfinished changes, identify and preserve them before switching. Do not discard another task's work to get a clean folder. Once clean:

```bash
git switch develop
git pull --ff-only origin develop
```

Create a branch for the actual task. This example is for Tanusha's #21 scaffold contribution and should be used only for that work:

```bash
git switch -c feature/OEP-12-mern-scaffold
```

Use the appropriate `docs/`, `fix/`, `test/` or `chore/` name for other tasks. If authentication fails, verify the account and repository access and use GitHub's supported Git authentication flow. Never share a password/token or put credentials in repository files, command examples, comments or screenshots.

## Make and verify the change

Implement the linked issue's acceptance criteria. Keep the contribution focused; coordinate shared interfaces before changing a teammate's work. In VS Code Source Control, stage only the intended files using each file's **+** action. Inspect the staged diff:

```bash
git diff --cached --stat
git diff --cached
git diff --cached --check
```

For documentation, also run the existing repository check from the repository root:

```bash
python scripts/check_documentation.py
```

Use `python3` or `py` if that is the installed Python command. For application work, run the real install/build/test commands documented by the scaffold and package scripts, then record their actual results. Repository checks alone do not test the application. If a command or environment is unavailable, state that explicitly in the PR.

The existing ignore rules exclude dependencies, local environment secrets, logs and generated output while allowing environment example templates. `.gitattributes` treats PDF, DOCX and XLSX artifacts as binary. Still inspect staged files: ignore rules do not remove secrets already tracked by Git. Stop and address any accidental secret exposure through the repository owner without copying the secret into an issue.

Commit with the issue reference, then push the current branch. For the #21 example:

```bash
git commit -m "feat(OEP-12): initialize MERN scaffold (#21)"
git push -u origin feature/OEP-12-mern-scaffold
```

Use the actual issue, message and branch for your contribution. Do not push ordinary work directly to `main` or `develop`.

## Open the PR and request review

1. Open [Pull requests](https://github.com/Manaswi-Guntupalli/SE_MINI_PROJECT/pulls) and select **New pull request**.
2. Select **base `develop`** and your task branch as **compare**. A release PR is the separately reviewed route from `develop` to `main`.
3. Inspect **Files changed**. Remove unintended changes before requesting review.
4. Fill the existing [PR template](../.github/PULL_REQUEST_TEMPLATE.md): GitHub issue/OEP key, sprint, change, dependencies, actual checks and remaining criteria.
5. Use **Relates to #18** or an equivalent non-closing reference for partial work. Use closing language only when all issue criteria will really be satisfied, and verify the saved issue state after merge.
6. Request an independent teammate's review. Manaswi reviews teammate contributions; Manaswi's own contributions receive Tanusha's or Guru's review.
7. Wait for repository checks and relevant application checks. Investigate failures and push corrections to the same PR branch. Recheck significant changes after feedback.

The author opens the PR from their own account; assistance is attributed when used. A requested review is not an approval. Copilot/assistant comments and passing CI do not establish independent human teammate review.

## Review and merge

The reviewer opens **Files changed**, checks the issue criteria and actual changes, runs relevant checks where available, and submits **Review changes → Approve**, **Request changes** or a substantive review comment. Authors cannot approve their own PRs. Resolve requested changes and obtain renewed review when the changes warrant it.

Manaswi, as repository owner, merges accepted PRs after independent review and successful relevant checks. Avoid merging a partial implementation as if it completed its whole issue. Ordinary document/feature PRs target `develop`; the existing default-branch PR template installation was a repository-configuration exception, not a release promotion.

At this audit, `main` and `develop` report no branch protection. Review-before-merge is the documented team workflow; server-enforced required-review rules are not claimed to be enabled.

After a merge, update the local integration branch when the working folder is clean:

```bash
git switch develop
git pull --ff-only origin develop
```

If a shared file changed while your PR was open, bring the current `develop` into your task branch, resolve conflicts while retaining both intended contributions, rerun relevant checks and obtain review of the resolution. Do not force-push over another person's work or choose one side blindly.

## Issue and Project completion

The native Project **Status**, the issue's `status:*` label and the issue's open/closed state are separate. When work starts, use In Progress and `status:in-progress`; when ready for review, use In Review and `status:review`. After the criteria, checks and review are satisfied, record the evidence, close the issue as Completed and use Done plus `status:done`. A merge alone does not satisfy incomplete acceptance criteria or synchronize every field automatically.

Preserve assignees, story points, priorities, sprints and epic/sub-issue links while updating progress. Do not reopen the eight completed documentation tasks for routine maintenance. Do not close a parent epic because one child completes.

## Verified evidence for issue 18

This is a 19 October snapshot. Refresh the pending rows with actual evidence as the team works.

| Acceptance criterion | Evidence | State |
|---|---|---|
| Use `main` and `develop` | Both branch refs exist; audited heads `7101211` and `a5d9a02` respectively | Verified |
| Document five branch prefixes | README Development workflow and this guide | Verified |
| Use PRs before merging work | Workflow setup [PR #4](https://github.com/Manaswi-Guntupalli/SE_MINI_PROJECT/pull/4) and default-branch template [PR #5](https://github.com/Manaswi-Guntupalli/SE_MINI_PROJECT/pull/5) are merged; they are the existing #18 setup PRs | Verified setup examples |
| Obtain teammate review for significant work | No submitted Tanusha/Guru review was found across the eight existing PRs at audit; this guide's PR and [PR #55](https://github.com/Manaswi-Guntupalli/SE_MINI_PROJECT/pull/55) provide real review opportunities | Pending independent teammate review |
| Explain workflow in README | Existing Development workflow section now links this operational guide | Verified |

Additional setup evidence: the PR template has identical content on `main` and `develop`; the MERN/environment ignore rules and binary document attributes are present; both teammates' configured repository access was checked. Access configuration does not prove that someone has cloned, pushed or reviewed successfully on their own device/account.

Actual [PR #4 repository checks](https://github.com/Manaswi-Guntupalli/SE_MINI_PROJECT/actions/runs/39047963602) and [PR #55 repository checks](https://github.com/Manaswi-Guntupalli/SE_MINI_PROJECT/actions/runs/39297709037) passed. Those runs cover whitespace/local documentation links, not application correctness. Main has not been given a new application workflow by this task. Continue real application CI integration in #44 and Jenkins in #42.

## Team workflow demonstration

Use real assigned work to finish the kickoff verification in the handoff plan. Each person retains their own branch/PR and review evidence. Do not create empty practice PRs or impersonate another member.

| Participant | Available real work | Evidence to record |
|---|---|---|
| Manaswi | Existing #17/#19 [PR #55](https://github.com/Manaswi-Guntupalli/SE_MINI_PROJECT/pull/55), and this #18 contribution | Branch/PR creation is recorded with authorized Codex assistance; link the actual independent review and later checks/merge. Personal local execution is not asserted. |
| Tanusha | #21 MERN scaffold | Actual task branch/commit/PR from her account, review request, response to feedback and a review she submits on another member's real work |
| Guru Teja | #20 domain model, then #22/#52 persistence work | Actual task branch/commit/PR from his account, review request, response to feedback and a review he submits on another member's real work |

For every demonstration, keep the member, issue, branch, PR link, relevant check/run, review permalink and observed date. Fill an entry only after the action occurs. Keep detailed collaborator configuration in GitHub settings rather than copying permission data into public documents.

**Remaining completion evidence:** obtain and record actual independent teammate review, finish the team's real workflow demonstration, and resolve any resulting setup defects. Keep #18 open until that evidence exists. The assistant can prepare and verify repository changes, but cannot supply teammates' own-account actions or approvals.

## References

- [Repository README](../README.md)
- [GitHub Backlog Guide](GITHUB_BACKLOG.md)
- [GitHub review instructions](https://docs.github.com/en/pull-requests/how-tos/review-pull-requests/approving-a-pull-request-with-required-reviews)
