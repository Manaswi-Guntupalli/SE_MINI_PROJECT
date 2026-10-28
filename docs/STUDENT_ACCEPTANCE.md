# Student workflow implementation

## #38 / OEP-29
Published listings include scheduled exams and server-derived start eligibility, active Resume, expired and submitted status. Drafts and answer keys are excluded. Start revalidates eligibility on the server. Loading, empty and failure feedback use the role dashboard.

Verification commands and execution results are recorded below as each stacked task is completed. #53 is outside this change.

#38 verification: role dashboard 5/5 tests and real MongoDB acceptance suite 35/35 passed on 28 October 2026. Runtime available locally: Node 22.21.0; CI targets Node 24.

## #39 / OEP-30
Start returns saved responses and server time. The existing unique Student/exam index makes concurrent start idempotent. The dashboard remembers only the attempt identifier per signed-in user and reloads the protected server resource; questions, answers and deadlines remain authoritative on the server. Expired start/read finalizes through the shared timeout transition.

#39 verification: dashboard 6/6; MongoDB acceptance and persistence 46/46 passed.
