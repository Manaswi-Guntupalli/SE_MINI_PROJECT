## Jira task

- Jira key:
- Jira link:
- Is this the complete task or a partial update?

Include the OEP key in the PR title and associated commit messages. For documents, use one complete-task PR per task.

## Change and purpose

Describe what changed, why it is needed and the intended behavior/deliverable.

## Validation

State actual checks performed and their results. For an initial document, record review against the Jira acceptance criteria and relevant project guideline. Mark unavailable implementation/test evidence Pending.

## Completion checklist

- [ ] This PR targets `develop`.
- [ ] The title contains the relevant OEP issue key.
- [ ] The changes stay within Release 1.
- [ ] The task's acceptance criteria are satisfied, or remaining work is explicitly listed.
- [ ] Relevant SRS/design/data/RTM references are consistent.
- [ ] Actual verification or review evidence is recorded.
- [ ] A teammate reviewed significant work; requested changes are addressed.
- [ ] Jira is In Review only if the entire task is ready for review.

A partial or draft PR must not mark the task Done. Automatic Jira completion requires the separately configured native integration and merge rule; ordinary uploads do not close Jira tasks.
