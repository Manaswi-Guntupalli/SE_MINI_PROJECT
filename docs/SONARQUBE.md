# SonarQube Cloud checks

Project: [Online Exam Portal](https://sonarcloud.io/project/overview?id=Manaswi-Guntupalli_SE_MINI_PROJECT).

## Verified submission status

Checked on 20 November 2026: the latest Automatic Analysis revision was main
`5966da9cbfd0d73844c9caa63aba345ca497b352`. Its quality gate was **OK** and
the service reported zero bugs, vulnerabilities, code smells and security hotspots.
No coverage metric was returned. The optional Sonar upload was skipped in
Application CI run 44588050194; its successful build/test jobs are separate evidence.
See [retained responses and fresh runtime checks](SUBMISSION_VERIFICATION.md).
Zero reported findings is an observation of this analysis, not a guarantee that
every possible vulnerability is absent.

The November 19 review found 29 open findings. Repository corrections validate the
saved attempt identifier before forming a request URL, confine the traceability
CLI to real directories and non-symlink report files under `docs/evidence`, use
bounded linear email checks, remove backtracking from Markdown link extraction,
handle asynchronous failures, disable Express's identifying response header,
generate random demo/benchmark credentials, use absolute Git executable paths,
and disable dependency install lifecycle scripts in CI.

Development seeding still creates or resets demonstration accounts. Passwords are
now independently generated and printed by the seed command; the old README
passwords are not defaults. Existing database accounts are unchanged until an
operator explicitly runs that command.

## Historical checksum false positives

The six `json:S6418` findings concern SHA-256 file digests keyed by paths containing
`auth`, in `docs/evidence/checkpoint-2026-11-04/source-manifest.json` and
`docs/evidence/oep44-2026-10-29/execution.json`. Those values are source checksums,
not authentication credentials. Historical evidence is preserved unchanged.
Automatic Analysis excludes only those two generated metadata files through
`.sonarcloud.properties`; application, authentication and workflow code remain
in the analysis. The CI configuration instead ignores only that rule on those
exact two files.

## Coverage requires CI analysis

[Automatic Analysis does not import coverage reports](https://docs.sonarsource.com/sonarqube-cloud/analyzing-source-code/automatic-analysis).
The existing Vitest suites already generate frontend and backend LCOV. CI now
combines them into `ci-evidence/sonar/lcov.info`, with repository-relative source
paths. `sonar-project.properties` points to that file and identifies test files.
Tooling scripts are excluded from coverage percentages, while still being scanned
for security and reliability issues.

To switch from Automatic Analysis to optional CI analysis with coverage, a
SonarCloud project owner must finish this setup:

1. Configure a suitable SonarCloud analysis token as the GitHub repository Actions
   secret `SONAR_TOKEN`. Keep the token out of source code and chat.
2. In SonarCloud, open Administration > Analysis Method and turn off Automatic
   Analysis. The two analysis methods cannot run together.
3. Set the GitHub Actions repository variable `SONAR_CI_ENABLED` to `true`, then
   rerun Application CI. Only the Ubuntu matrix job uploads analysis; fork PRs do
   not receive the analysis token.

The optional scan step stays off until that setup is complete. Merely adding the
configuration does not upload coverage or change a dashboard rating. Confirm the
latest analysis commit, issue totals, quality gate and coverage after the scan.
The current workflow does not explicitly wait for a quality-gate result. Verify
the service result separately; a green scan step alone does not enforce that gate.
