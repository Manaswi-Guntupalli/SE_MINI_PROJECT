# CI tooling decision

**Decision date:** 24 October 2026. **Requested by:** Guntupalli Manaswi.

Use **GitHub Actions as the sole CI provider** for the Online Exam Portal. Remove the Jenkinsfile, local-server setup instructions, provider-specific environment fallback and Jenkins evidence files from the current implementation. No Windows CI service or Jenkins job is required for this plan. Existing Git history and earlier verification comments remain historical records.

## Existing backlog and implementation

- #42 / OEP-33 covers the GitHub Actions workflow, push/PR triggers, reproducible dependency installation and build stages, permissions and retained execution evidence.
- #44 / OEP-35 covers running actual frontend/backend test suites, failure propagation, JUnit/coverage artifacts and passing/failing run evidence in that workflow.
- Existing issue identities, owners, numeric story points, priorities, sprint placement, native epic relationships and completion states are preserved. No duplicate issue replaces #42.
- The current workflow performs **CI**: install, lint/build and test. Deployment credentials/target, deployment automation and smoke verification remain under #45. Selecting a CI/CD platform does not mean CD is already implemented.

## Submitted baseline and course wording

The submitted [SRS PDF](OEP-17_SRS_Final.pdf), including its PROC-01 process requirement, names Jenkins CI/CD. The original [RTM](OEP-19_Initial_RTM.xlsx) also names it. The Part 1 SAD and Test Plan describe GitHub Actions or Jenkins as CI choices. Those submitted artifacts are retained as the original baseline; this decision supersedes their tooling choice for the current implementation and must be reflected when the final documents/RTM are reconciled.

The change is explicitly requested by Manaswi. **Faculty acceptance of substituting GitHub Actions for an explicitly named course tool has not been verified.** It is not represented as a faculty-approved exception or a separate three-person agreement. Explain the tooling deviation in the final deliverables rather than silently claiming the earlier baseline is unchanged.

GitHub Actions supplies the required push/PR automation and can also host later deployment workflows. The project's current technical pipeline does not depend on a second CI server. See [CI commands and actual run evidence](CI.md).
