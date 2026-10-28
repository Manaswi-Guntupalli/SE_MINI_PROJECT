# Shared portal UI (#65)

## Design system

All implemented screens use `client/src/ui.jsx`, `index.css` tokens and `App.css` layouts. The palette is dark navy ink on a pale gray canvas, white surfaces, teal primary actions, and red error/danger feedback. Controls use a consistent 44px minimum height, 8px radii and visible blue keyboard focus. Panels use 14px radii, subtle borders and a restrained shadow. Spacing uses 4/8/12/16/24/32/48px tokens. Typography uses the system Segoe UI stack without external font dependencies. Layouts use a 1200px maximum content width, fluid form controls, wrapping actions/navigation and explicit 700px/900px breakpoints.

Reusable components: AppShell (branding, account/logout feedback, skip link, role navigation, main/footer landmarks), Button (safe button default; forms opt into submit), Input/Textarea/Select, Panel, Feedback (alert for errors, status for success), Loading, StatusBadge and ConfirmDialog. ResultsPanel reuses a captioned table and loading/empty/error/refresh states. Confirmation uses native modal dialog behavior, initial Cancel focus, keyboard focus trapping, Escape cancellation, busy protection and focus restoration. All roles use the same controls and panel hierarchy. CSS from the original Vite demo was removed.

Login uses associated labels and autocomplete; Instructor authoring fields use associated labels or explicit accessible names. Student answers use fieldset/legend, labeled native radios and semantic question navigation. Saved choices are server acknowledgements. The timer uses tabular numerals. Student/Instructor result tables read their protected APIs and never invent scores. Admin has no exam-authoring links, Instructor has no account-administration links, and Student has no privileged management controls.

## Before/after review walkthrough

Baseline: `43648ff` (parent of the #65 commit). Before, the app used the Vite demo stylesheet, separate plain role headers, browser alerts/native confirmations, unassociated login labels and no integrated result views. After, the paths below use the shared shell/panels/controls/feedback and protected result APIs.

| Screen | Review path and resulting behavior | Executed evidence |
|---|---|---|
| Sign in / logout | Labeled email/password form; common validation/error feedback; logout errors retain the workspace | App component tests; cross-role HTTP system test |
| Instructor draft / questions | Create/open/edit MCQs, change options, cancel/confirm deletion, then confirm publication; common controls and status badges | App component tests; real HTTP/MongoDB system test |
| Published exam / Instructor results | Published authoring actions disappear; owned-exam scores render in the shared captioned table | Cross-role HTTP/MongoDB system test |
| Student listing | Scheduled Start disabled; active Resume enabled; submitted/expired starts disabled; loading/empty/API error and refresh defined | RoleDashboard tests; backend acceptance tests |
| Student attempt | Select answer, verify saved feedback, navigate unanswered question, reload, inspect unchanged deadline and persisted choice | ExamAttempt and clock tests; real HTTP/MongoDB system test |
| Submission / Student results | Wait for save, open confirmation, cancel with keyboard or confirm, lock editing, show evaluation pending/completed and persisted result | Dialog/attempt tests; submission API tests; real HTTP/MongoDB system test |
| Admin accounts | Create user, change another user's role, deactivate/reactivate; own access controls disabled; common feedback/navigation | RoleDashboard tests; real HTTP/MongoDB system test |

Automated walkthrough: run `npm test --prefix client` with the MongoDB configuration in README. The `system.test.jsx` suite executes actual React rendering, HTTP/session/CSRF, Express and temporary replica-set MongoDB across Instructor -> Student save/reload/submit/results -> Instructor results -> Admin account management. It is a DOM/network system check, not a recorded visual browser run.

## Responsive and visual review status

CSS review covers 375px mobile, 768px tablet and 1440px desktop targets: content/forms use fluid widths and min-width:0, long identifiers wrap, question/option actions wrap, headers stack on mobile, and result tables scroll within their containing panel. These are implementation checks, not measured browser overflow results.

**Pending:** rendered viewport checks, screenshots and independent visual sign-off. The available computer-use inventory returned no browser surfaces and opening the in-app browser returned `Browser is not available: iab`. No screenshot, pixel-layout pass, or visual accessibility certification is claimed. A reviewer should run the application at the three widths above, inspect every row of the walkthrough, test zoom/keyboard interaction, and attach screenshots to the final PR. This outstanding evidence is why #65 must remain open pending review.

## Verification on 28 October 2026

Frontend: 34/34 tests passed, including the real cross-role HTTP/MongoDB workflow; lint and production build passed. Backend: 83/83 tests passed; JavaScript build/syntax check passed. Local Node was 22.21.0; the repository's GitHub Actions matrix uses the required Node 24 on Ubuntu and Windows. Final GitHub checks and teammate review are reported in the PR rather than inferred from local checks.

Machine-readable [local verification evidence](evidence/sprint-2-2026-10-28/verification.json) records the actual JUnit totals.

## Instructor exam navigation follow-up

Opening an examination now replaces the create/list dashboard with a dedicated management view, defaulting to Details. Back to My Exams (or the contextual My exams navigation link) returns to the list. Only one accessible tab panel is visible at a time: Details, Questions, or Results. Arrow keys wrap between tabs; Home/End select the first/last tab. Focus and scroll move to the exam heading on open and back to the list heading on return. Local field edits survive tab switches; changes still require the existing Save actions. Returning to the list clears the question editor, and reopening reads the saved server definition.

Published Details are read-only. Draft Results explains when results become available, and the protected results API is loaded only when the Results tab is selected for a published exam. The existing publish action remains available across the draft tabs. No routing library or backend API changes were introduced. Automated coverage verifies separate-view behavior, keyboard switching, field preservation, read-only publication, lazy results, and the complete HTTP/MongoDB workflow through the tabs.
