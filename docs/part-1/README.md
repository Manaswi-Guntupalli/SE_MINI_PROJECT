# Online Exam Portal Part 1 documents

**Release 1 · Version 1.4 · 20 November 2026**

These are the current requirements, architecture and test documents aligned to main after PRs #72 and #73. The Word and PDF editions contain the same content. See [current submission verification](../SUBMISSION_VERIFICATION.md) for exact test and Sonar observations.

## Release documents

| Document | Contents |
|---|---|
| [Software Requirements Specification](Online_Exam_Portal_SRS.docx) | 21 functional requirements, five non-functional requirements and six security requirements. Includes two security objectives, UML use cases and the weighted scoring rules. |
| [Software Architecture and Design Specification](Online_Exam_Portal_SAD.docx) | Layered architecture, a component diagram, two UML sequence diagrams, API contracts, security and error handling. |
| [Software Test Plan](Online_Exam_Portal_Test_Plan.docx) | Test scope and strategy in Sections 3–5, security validation in Section 5.1, and 33 test cases mapped to all 32 SRS requirements in Section 13. |

## Final checkpoint evidence

- Automated test results and coverage are recorded by run and commit. The earlier Chrome, Edge and classroom performance measurements are dated separately. [Final checkpoint test report](../FINAL_CHECKPOINT_REPORT.md)
- The change from one point per correct answer to assigned marks, including fractional marks, is recorded alongside the other design and tooling changes. [Final deviations](../FINAL_DEVIATIONS.md)
- Video links and recording details are collected in the [demo video index](../videos/README.md).
- The earlier checklist records the review and sign-off actions. Use the final checkpoint test report for current test results. [Submission checklist](../FINAL_SUBMISSION_CHECKLIST.md)

## Historical references

The original proposal and PDF SRS record the earlier scope. Use the Version 1.4 documents above for the current specification. [Original proposal](../../OEP-16_Project_Proposal_Final.pdf) · [Original PDF SRS](../OEP-17_SRS_Final.pdf) · [Project plan](../05_Project_Plan.md)

## Matching PDF editions

- [SRS PDF](Online_Exam_Portal_SRS.pdf)
- [SAD PDF](Online_Exam_Portal_SAD.pdf)
- [Test Plan PDF](Online_Exam_Portal_Test_Plan.pdf)
