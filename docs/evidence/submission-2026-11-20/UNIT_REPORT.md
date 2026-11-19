# Submission unit and integration report

Application baseline `5966da9cbfd0d73844c9caa63aba345ca497b352`; observed locally on 20 November 2026 (Asia/Kolkata), Node 24.22.3, Windows x64. This alignment changes documentation/evidence only. Raw UTC timestamps may show 19 November. See [execution manifest](execution.json).

| Suite | Passed | Evidence |
|---|---:|---|
| Backend Vitest model/API/integration | 136 | [JUnit](server-junit.xml) |
| Frontend Vitest component/HTTP system | 85 | [JUnit](client-junit.xml) |
| Standalone Node scoring | 9 | [CI output](ci-output.txt) |
| Node tooling security | 2 | [CI output](ci-output.txt) |
| Python documentation parser | 3 | Separate `python -m unittest discover -s scripts -p 'test_*.py'` execution; output in [repository checks](repository-checks.txt) |

All passed with no skipped suite cases. Security integration is included in backend counts, not added again. Ten acceptance diagnostics and the deliberately failing negative control are separate from suite totals. [Negative control](negative-control.json).
