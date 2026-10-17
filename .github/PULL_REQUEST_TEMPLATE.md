## Linked GitHub issue

- GitHub issue: #<number>
- Historical OEP key, if applicable:
- Sprint, if applicable:
- Complete issue or partial update? List any remaining acceptance criteria.

## Change and purpose

Describe the concrete change, why it is needed and the resulting behavior or deliverable.

## Dependencies and handoff

Link prerequisite issues/PRs and state which reviewed interface or commit is ready for the next developer. Distinguish fixture/mock preparation from verified integration.

## Validation

Record the actual commands/checks performed, results and relevant GitHub Actions/CI run links. For documentation or repository configuration, record the relevant review/checks. Mark unavailable application or test evidence Pending; do not claim results that were not executed.

## Review and completion checklist

- [ ] The PR links the relevant GitHub issue and retains its OEP key where applicable.
- [ ] The base is `develop` for feature, fix, test and document work; `main` is used only for a reviewed release or an approved repository-configuration change.
- [ ] The change stays within Release 1 and identifies any incomplete acceptance criteria.
- [ ] Relevant SRS, SAD, Test Plan, data-model and RTM references are consistent, or deviations are documented.
- [ ] Applicable verification and GitHub Actions/CI checks have passed; any unavailable check is explained.
- [ ] Secrets, local environment files, dependency folders and generated build output are excluded.
- [ ] The assigned developer raised the PR. Review evidence and remaining review requirements are stated honestly; the repository owner reviews and merges accepted work.
- [ ] Relevant documentation and test evidence are linked or updated.

## After merge

Verify the GitHub issue state and native Project Status separately. Close the issue only when all its acceptance criteria and required review/testing evidence are satisfied. A partial PR, template installation or passing repository check does not by itself complete the issue or prove application functionality.
