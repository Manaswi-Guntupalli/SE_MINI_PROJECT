# Student workflow implementation

## #38 / OEP-29
Published listings include scheduled exams and server-derived start eligibility, active Resume, expired and submitted status. Drafts and answer keys are excluded. Start revalidates eligibility on the server. Loading, empty and failure feedback use the role dashboard.

Verification commands and execution results are recorded below as each stacked task is completed. #53 is outside this change.

#38 verification: role dashboard 5/5 tests and real MongoDB acceptance suite 35/35 passed on 28 October 2026. Runtime available locally: Node 22.21.0; CI targets Node 24.

## #39 / OEP-30
Start returns saved responses and server time. The existing unique Student/exam index makes concurrent start idempotent. The dashboard remembers only the attempt identifier per signed-in user and reloads the protected server resource; questions, answers and deadlines remain authoritative on the server. Expired start/read finalizes through the shared timeout transition.

#39 verification: dashboard 6/6; MongoDB acceptance and persistence 46/46 passed.

## #40 / OEP-31
PUT /api/student/attempts/:id/responses/:questionId requires CSRF, an owned active attempt, valid question/option IDs and expectedRevision. Response revisions advance transactionally. Conflicts reject stale updates; reload obtains the current revision. The client serializes saves, shows only acknowledged choices, provides failure/retry feedback and preserves unanswered navigation.

#40 verification: 8/8 focused React tests and frontend lint passed; 13/13 focused MongoDB/API and persistence tests passed.

## #46 / OEP-37
Remaining time uses the persisted deadline and API serverTime, then performance.now() elapsed time. Polling every 15 seconds synchronizes status and can only shorten the current countdown. Missing/invalid server time locks editing. Reload reads the persisted deadline, and server writes require database time strictly before it. Browser clock changes cannot grant server time. Server-independent expiry processing and timeout requests are integrated by #47.

#46 verification: 10/10 focused client tests and lint passed. Strict deadline, late writes and timeout boundaries also covered by the passing persistence suite.

## #47 / OEP-38
POST /api/student/attempts/:id/submit uses the existing transactional active-to-submitted transition and write lock shared with answer saves. Manual requests crossing the deadline become Timeout. Repeated/concurrent finalization preserves submittedAt and the immutable response set. The UI disables manual submission during answer saves and explicitly confirms that only saved responses are submitted. Failed saves can be retried before confirming.

The production server starts a nonoverlapping expiry worker on database connection, immediately processes backlog, then polls every EXAM_EXPIRY_INTERVAL_MS (default 5000; allowed 100?60000). Each pass handles up to 100 expired attempts and retries up to 100 submitted Pending evaluations. Closed browsers need no connection; active server/database availability is required. Backlogs can require multiple passes. Worker failures are logged and retried on the next pass. Multi-server runs remain safe through transactional finalization and unique result indexes.

OEP-39 handoff is evaluateAttempt in submissionService: it reads only finalized responses and awards one point per correct MCQ through persistResult. Evaluation failure is isolated from finalization and remains Pending for server retry. No answers reopen. Existing protected Student/Instructor result reads remain in place.

#47 verification: full backend 83/83; full frontend 27/27 including React-to-HTTP-to-MongoDB save/reload/submit; frontend lint and both builds passed.

## #65 / shared UI integration
The six branches are stacked in order: feature/OEP-29-available-exams, feature/OEP-30-start-exam, feature/OEP-31-answer-navigation, feature/OEP-37-exam-timer, feature/OEP-38-submit-exam, feature/issue-65-shared-portal-ui. Only the last branch has a PR, targeting develop per repository workflow. The stack starts from existing integration/sprint-1-review commit d3062a7; that prerequisite history is also included until separately integrated into develop. #53 is excluded. See [shared design system and walkthrough](UI_DESIGN_SYSTEM.md) for UI evidence and the pending visual review.

## Development startup smoke check
On 28 October 2026, actual development startup exposed a process-variable shadow in the expiry worker's default interval expression. Renamed the injected worker callback while preserving its test seam. Added a default-configuration regression test: student API suite 8/8 passed and backend syntax build passed. Live local MongoDB replica-set checks, frontend HTTP 200, API health, Student sign-in, protected exam listing and logout passed. Existing demo accounts were retained; the development database had zero published examinations. No seed/reset was run.

## Submitted attempt UI recovery
A successful manual/timeout submission now replaces the countdown/questions/navigation with a completion panel, View my results and Back to available exams. Countdown intervals stop immediately. Evaluated submissions stop status polling; Pending evaluation continues to poll without reopening answer controls. A submitted-state latch ignores stale in-flight Active responses. The dashboard clears the per-user resume pointer when completion is observed, so refresh/reload cannot restore an ended attempt as an active exam. Failed submission retains the attempt and retry feedback. Regression tests cover completion, restored submission, failed submission, in-flight status reads and resume-pointer cleanup.
