# Final code coverage report

Date: 4 November 2026 (Asia/Kolkata). Base commit `463cde555490738bcaa5fde661e3910e29f8f7ab`; test/evidence additions relative to the application baseline are identified in [source-manifest.json](source-manifest.json). Application tracked contents were verified identical to merged main `13ec9982bff073be048c54d51b59cb3d761672a2`. This is a local execution record, not a hosted CI run or team approval.

| Suite | Statements | Lines | Functions |
|---|---:|---:|---:|
| server | 87.78% | 89.93% | 97.93% |
| client | 86.2% | 89.95% | 84.79% |

PASS: scoped backend line coverage meets the documented **70%** minimum. V8 coverage comes from `test:ci`, not from counting browser workflows. Scope/exclusions are defined in each Vitest config; coverage is not proof of complete acceptance or production correctness.

[Backend summary](server-coverage.json) · [Frontend summary](client-coverage.json) · [Backend Cobertura](server-cobertura.xml) · [Frontend Cobertura](client-cobertura.xml)
