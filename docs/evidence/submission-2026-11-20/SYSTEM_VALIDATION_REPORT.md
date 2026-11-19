# Submission system validation report

Application baseline `5966da9cbfd0d73844c9caa63aba345ca497b352`; observed locally on 20 November 2026 (Asia/Kolkata), Node 24.22.3, Windows x64. This alignment changes documentation/evidence only. Raw UTC timestamps may show 19 November. See [execution manifest](execution.json).

All three real-browser workflows passed in installed Edge and all three in installed Chrome at the configured 1366 × 768 viewport. Each uses real HTTP and disposable MongoDB: complete role workflow, answer persistence/navigation/reload/privacy/results/Admin; worker expiry after the browser closes; delayed answer changes followed by immediate submission. [Edge](browser-edge.json) · [Chrome](browser-chrome.json) · [Chrome output](chrome-output.txt).

The 30-active-user, 20-question classroom API benchmark passed with 4440 measured requests, zero errors and overall p95 **233.23 ms**, below 2000 ms; all 30 results persisted. Per-endpoint values and exact workload are in [performance.json](performance.json). The 30-second load/save phase excludes login/setup, browser rendering, external networking and sustained production capacity.

All ten [acceptance diagnostics](acceptance-diagnostic.json) passed. [All 33 case mappings](test-plan-execution.json) now refer to fresh observations, including performance and both named browsers. These mappings cover the retained 32 SRS IDs through the Test Plan; they do not declare all 188 initially proposed workbook scenarios executed.
