# Evaluation and results acceptance (OEP-39, OEP-40, OEP-41)

The server starts an evaluation worker after MongoDB connects and indexes are ready.
It immediately sweeps overdue active attempts and submitted pending evaluations,
then repeats five seconds after each completed sweep. Browser closure does not
prevent timeout finalization. Restarting the server recovers pending work. A failed
attempt is isolated and retried on the next sweep; responses remain submitted.
Transactions and the unique attempt/result index prevent duplicate scoring across
concurrent requests or server instances. The deployment must keep the server
running and use the required MongoDB replica set.

Students see persisted exam titles, scores and maximum scores, or an explicit
evaluation-pending state. Loading, empty and API-error states are separate; Refresh
results retries failed requests and retrieves completed evaluations. Failed scoring
after successful submission closes answer entry and shows the saved pending state.
Only the authenticated student's own results and pending attempts are returned.

Instructors select an owned published exam and load persisted student identities,
scores and pending attempts. Switching exams clears previous results and invalidates
in-flight requests. Foreign exam IDs are denied at the API boundary. Loading, empty,
pending and error states are explicit. No answer keys are returned to students.

## Regression checks

- `server/tests/evaluationService.test.js`: all-correct, all-wrong, mixed/unanswered,
  duplicate answers and invalid answer keys.
- `server/test/results-workflow.test.mjs`: manual and browser-independent timeout
  evaluation, server-calculated marks, active-attempt denial, concurrent evaluation,
  failure/retry with retained responses, durable result retrieval, pending states,
  student/instructor ownership and API errors.
- `server/test/persistence-integration.test.mjs`: transactional rollback, unique
  indexes, immutable published definitions and concurrent persistence retries.
- `client/src/RoleDashboard.test.jsx`: student loading, pending, scores after reload,
  empty results and error/retry states.
- `client/src/App.test.jsx`: instructor loading, student identity and score display,
  pending/empty/error states, exam switching and stale-response suppression.
- `client/src/system.test.jsx`: real React → Express → MongoDB submission,
  evaluation and student/instructor visibility with another student's isolation.

Run `npm test` in both `server` and `client`, plus
`node --test tests/evaluationService.test.js` in `server`. Sprint 2 CI runs these
checks, backend syntax validation and a frontend production build.
