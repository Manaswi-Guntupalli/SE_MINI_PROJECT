# Final bug check — 8 November 2026

**Fix status: all five reported bugs have been fixed and covered by permanent regression tests.**

The original audit covered the working tree on top of commit `808b74e`.
The original reproduction steps and impacts below are retained as history; they
describe the behavior before the fixes, not the current behavior. The fix record
and validation results describe the corrected working tree. Verification uses
mocked client requests and temporary MongoDB replica sets, without changing live
accounts, exams, attempts or results.

## Findings

| ID | Priority | Original problem | Status |
| --- | --- | --- | --- |
| BUG-01 | High | An outstanding instructor request could show the previous account's exam after another account signed in. | Fixed |
| BUG-02 | High | Concurrent admin updates could deactivate all administrators and block normal recovery. | Fixed |
| BUG-03 | Medium | Failure to load the exam list also prevented restoring a student's active attempt. | Fixed |
| BUG-04 | Medium | An older account-list response could overwrite the newer list after account creation. | Fixed |
| BUG-05 | Low | Dismissing a list-loading error incorrectly changed the page to an empty-list message. | Fixed |

## Fix record

- **BUG-01:** Session generations invalidate old responses as soon as logout begins,
  on fresh login, and on unmount. Exam reads, list refreshes, mutation callbacks,
  errors, loading indicators and confirmation callbacks check their originating
  generation. Old responses cannot populate the next account's state. Exam-list
  requests also ignore older responses within a session.
- **BUG-02:** A shared MongoDB lock document serializes account role/status changes
  across server processes. Authorization is checked again after obtaining the
  transaction's write lock, and the transaction must leave an active admin.
  Concurrent cross-admin deactivations or demotions cannot both succeed. Existing
  self-protection and ordinary account updates still work.
- **BUG-03:** Attempt restoration has an independent request, loading state,
  error state and retry control. It proceeds when the exam list fails. A restoration
  failure no longer claims that no attempt exists. Starting another attempt or
  completing the current one invalidates obsolete restoration responses.
- **BUG-04:** Initial list loading and post-save refreshes share a monotonically
  increasing request ID. Only the latest request can change list data, loading
  status or errors; both late successes and late failures are ignored.
- **BUG-05:** List retrieval status is separate from the dismissible error banner.
  Dismissing the banner leaves an unavailable state and retry button. Empty-list
  messages require a successful response containing an empty list.

Permanent coverage is in
[client/src/finalBugRegressions.test.jsx](client/src/finalBugRegressions.test.jsx)
and [server/test/admin-access.test.mjs](server/test/admin-access.test.mjs).
The client cases cover both successful and rejected old requests after an account
switch, independently restored attempts, restoration retry, stale list responses,
and dismissed errors for both Admin and Student. Server cases use two real
authenticated sessions and force both requests past middleware before concurrent
deactivation/demotion attempts.

The remaining sections preserve the original audit findings for reference.

### BUG-01 — Previous instructor's exam appears in the next account

**Location:** [client/src/App.jsx](client/src/App.jsx), `selectExam` (around line 273),
`resetWorkspace`, and `logout`.

**Reproduction:**

1. Sign in as instructor A and click Open on A's exam.
2. Delay the response to `GET /api/exams/:id` after the request has been authorized.
3. Log out while the request is pending, then sign in as instructor B.
4. Deliver A's delayed response.
5. Open the Questions tab in the resulting Manage Exam view.

**Expected:** B only sees B's workspace; an earlier account's pending response is ignored.

**Actual:** The delayed callback calls `setSelectedExam(response.data)` after the
session change. A's exam and questions appear under B's account. The instructor
exam response includes correctness flags, so this can expose answer-key data
already returned for A in the same browser tab. This is a client-side isolation
failure; the audit did not demonstrate a bypass of server-side ownership checks.

**Evidence:** A deferred Axios response was released after the test had completed
logout and login as B. The displayed account was B, while Manage Exam and A's
private question were both rendered.

**Recommended correction:** Invalidate outstanding requests on session changes.
Use a session generation or cancellation plus a generation check before applying
responses. Apply the same guard to exam-list loads and mutation callbacks, not
only `selectExam`. Retain a regression test spanning two different accounts.

### BUG-02 — Concurrent updates can remove every active admin

**Location:** [server/routes/adminRoutes.js](server/routes/adminRoutes.js),
`PATCH /users/:id` (around lines 39–43), and
[server/scripts/bootstrapAdmin.js](server/scripts/bootstrapAdmin.js), line 12.

**Reproduction — use disposable accounts only:**

1. Have exactly two active administrators, A and B, each signed in separately.
2. Concurrently have A deactivate B and B deactivate A.
3. Allow both requests to pass authentication before either update is committed.

**Expected:** At least one request is rejected so one active administrator remains.

**Actual:** Both requests return HTTP 200 and the database has zero active admins.
The route only prevents an administrator from changing their own access; it does
not preserve a last-active-admin invariant across concurrent requests. The
bootstrap script refuses recovery because it checks for any Admin record, even
when all such records are inactive. Normal authenticated account management is
then unavailable; recovery requires an operator to repair database state.

**Evidence:** Two real authenticated Supertest sessions and a temporary MongoDB
replica set were used. A barrier immediately before `findByIdAndUpdate` ensured
both requests had been authorized. Both writes executed normally. The assertions
confirmed `[200, 200]`, zero active admins, and remaining inactive Admin records.

**Recommended correction:** Serialize admin access changes using a shared
transactional guard and enforce that at least one active administrator remains.
An independent count followed by an update is insufficient under concurrency.
Keep a documented operator recovery procedure.

### BUG-03 — Exam-list failure prevents attempt restoration

**Location:** [client/src/RoleDashboard.jsx](client/src/RoleDashboard.jsx), the
dashboard-loading effect (around lines 45–65).

**Reproduction:**

1. Start an exam so its attempt ID is stored in session storage.
2. Reload the page.
3. Make `GET /api/student/exams` fail while the attempt endpoint remains available.
4. Select Current attempt.

**Expected:** The saved attempt is independently restored, or its actual restore
failure is reported. The exam-list request should not gate this operation.

**Actual:** Restoration is inside the successful exam-list callback, so the
attempt endpoint is never called. Current attempt says no exam is open even
though an active attempt exists. The server deadline continues to run, costing
the student time until the listing request succeeds and restoration is retried.
This does not delete previously saved answers.

**Evidence:** With a stored attempt ID and only the listing request rejected, the
test confirmed zero requests to the available attempt endpoint and the incorrect
"No exam is open" message.

**Recommended correction:** Load the exam list and restore the attempt
independently, with separate loading/error states and retries.

### BUG-04 — A late initial account list hides a newly created account

**Location:** [client/src/RoleDashboard.jsx](client/src/RoleDashboard.jsx),
`refreshAccountsAfterSave` and the dashboard-loading effect (around lines 36–48).

**Reproduction:**

1. Open the admin dashboard and delay its initial `GET /api/admin/users` response.
2. Switch to Create account and successfully create a new account.
3. Let the post-creation list refresh return a list containing the new account.
4. Deliver the older initial response, containing the list from before creation.

**Expected:** The newer list remains visible.

**Actual:** The older response overwrites `items`. The newly created account
disappears from the list while the success notification remains. A manual refresh
can recover the correct list; the database creation itself is not lost.

**Evidence:** Deferred initial GET plus a successful POST and a newer GET response.
The test first observed the new account's role control, then confirmed it vanished
when the old response arrived. The success message remained visible.

**Recommended correction:** Give list requests a shared increasing request ID
and ignore stale responses across both initial loading and post-save refreshes.

### BUG-05 — Dismissing an error is treated as a successful empty load

**Location:** [client/src/RoleDashboard.jsx](client/src/RoleDashboard.jsx),
notification dismissal and empty-list rendering (around lines 102–109).

**Reproduction:**

1. Make the initial account-list request fail.
2. Observe the loading error.
3. Click Dismiss notification.

**Expected:** The banner closes, while the page retains an unavailable/retry state.

**Actual:** Clearing the error makes the condition `!loading && !error &&
items.length === 0` true. The page now says "No accounts found" even though the
list was never retrieved. The same condition affects the student exam list.

**Evidence:** The admin test rejected the only list request, dismissed its error,
and confirmed the empty-state message appeared without any successful retry.

**Recommended correction:** Track list retrieval status independently of the
visible notification. Render an empty state only after a successful list response.

## Validation performed

| Check | Result |
| --- | --- |
| Server standard suite | 120 tests passed |
| Dedicated scoring suite | 9 tests passed |
| Client standard suite, including real HTTP/session/database workflow | 79 tests passed |
| Client lint | Passed |
| Client production build | Passed |
| Backend syntax/build check | Passed |
| Permanent regression coverage for the five reported bugs | 16 checks passed, included in the standard suites above |
| Browser workflow scenarios | All three passed; final runner exited successfully |

The original temporary probes demonstrated the incorrect behavior. They have now
been replaced by permanent regression tests that assert the corrected behavior.
The passing regression results indicate that the reported reproduction cases no
longer produce those bugs.

Review included weighted/fractional scoring and totals, validation, immutable
published exams, response revisions, submission/deadline races, timeout-worker
grading, idempotent results, account ownership and role checks, session changes,
tab persistence, notifications, list ordering and failure recovery.

The browser runner's earlier teardown issue was isolated to Windows process
cleanup inside the sandbox. The final authorized run outside the sandbox passed
all three scenarios in 21.9 seconds and exited with code 0. All standard suites
and build/lint commands above also exited successfully.

The invariant prevents future all-admin lockouts through the supported API.
It does not reactivate accounts in a database already damaged before the fix.
If a deployment already has no active admin, recovery requires an authorized
database operator to reactivate a verified existing admin after taking a backup;
the bootstrap script intentionally remains unavailable when Admin records exist.

No production database migration, historical-result repair, dependency audit,
external deployment check, or exhaustive accessibility/load audit was performed.
A finite review cannot establish that the entire website has zero remaining bugs.
