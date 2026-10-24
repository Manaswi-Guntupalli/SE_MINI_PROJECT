# CI tooling decision

**Decision date:** 24 October 2026. **Requested by:** Guntupalli Manaswi.

Use **GitHub Actions as the sole CI provider** for the Online Exam Portal. The former local CI-server configuration, setup instructions, provider-specific environment fallback and provider-specific evidence files have been removed from the current implementation. No Windows CI service or local CI-server job is required. Existing Git history and earlier verification comments remain historical records.

## Existing backlog and implementation

- #42 / OEP-33 covers the GitHub Actions workflow, push/PR triggers, reproducible dependency installation and build stages, permissions and retained execution evidence.
- #44 / OEP-35 covers running actual frontend/backend test suites, failure propagation, JUnit/coverage artifacts and passing/failing run evidence in that workflow.
- Existing issue identities, owners, numeric story points, priorities, sprint placement, native epic relationships and completion states are preserved. No duplicate issue replaces #42.
- The current workflow performs **CI**: install, lint/build and test. Deployment credentials/target, deployment automation and smoke verification remain under #45. Selecting a CI/CD platform does not mean CD is already implemented.

## Project document amendment

On 24 October 2026, the current [proposal](../OEP-16_Project_Proposal_Final.pdf), [SRS PDF](OEP-17_SRS_Final.pdf), [RTM](OEP-19_Initial_RTM.xlsx), Part 1 SAD and Test Plan were amended to name GitHub Actions consistently. The changes affect the proposal's CI description, SRS section 2.5 and PROC-01, RTM Traceability C48 and Planned Tests D191, and the CI tool descriptions in the SAD and Test Plan. Earlier submitted versions remain available in Git history; the working project files reflect the selected provider.

The change is explicitly requested by Manaswi. **Faculty acceptance of substituting GitHub Actions for an explicitly named course tool has not been verified.** It is not represented as a faculty-approved exception or a separate three-person agreement. Explain the tooling deviation in the final deliverables rather than silently claiming the earlier baseline is unchanged.

GitHub Actions supplies the required push/PR automation and can also host later deployment workflows. The project's current technical pipeline does not depend on a second CI server. See [CI commands and actual run evidence](CI.md).
