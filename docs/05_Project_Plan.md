# Online Exam Portal
## Agile Project Plan

**Version:** 0.3  
**Status:** Updated Planning Baseline  
**Course:** UE24CS341A - Software Engineering

---

## Revision History

| Version | Date | Author | Change |
|---|---|---|---|
| 0.1 | 02 October 2026 | Tanusha | Initial Agile project planning baseline |
| 0.2 | 02 October 2026 | Tanusha | Updated technology baseline from Django/PostgreSQL to MERN |
| 0.3 | 13 October 2026 | Team | Moved primary backlog and workflow tracking to GitHub Issues |

---

## 1. Project Overview

The Online Exam Portal is a web-based application for conducting multiple-choice examinations.

The system allows instructors to create and publish MCQ examinations, students to attempt timed examinations, and the system to automatically evaluate submitted answers and generate results.

The project will be developed by a team of three members:

| Member | Primary Functional Ownership |
|---|---|
| Tanusha | Exam and Question Management |
| Manaswi | Student Exam Attempt |
| Vidimalla Guru Teja | Evaluation and Results |

All three members will also participate in shared Software Engineering activities such as requirements analysis, architecture and design reviews, authentication decisions, integration, testing, security validation, CI/CD and documentation.

---

## 2. Development Lifecycle

### 2.1 Chosen Lifecycle

The project will follow an **Agile iterative development lifecycle using Scrum practices**.

Development will be organized into short sprints. Each sprint will contain selected items from the Product Backlog and will produce a reviewed and testable project increment.

Requirements, design, implementation, testing and documentation will evolve throughout the project rather than being completed only once at the beginning.

### 2.2 Justification

Agile was selected because:

- the system contains multiple independent but interacting modules;
- functionality can be implemented incrementally;
- feedback from faculty evaluations can be incorporated during development;
- defects and integration problems can be identified early;
- the three members can work on different functional areas while continuously integrating their work;
- project documentation can be updated when requirements or design decisions change.

A sprint is considered successful only when selected work has been implemented, reviewed, tested and appropriately documented.

---

## 3. Agile Workflow

The Product Backlog is maintained in [GitHub Issues](https://github.com/Manaswi-Guntupalli/SE_MINI_PROJECT/issues). GitHub is the sole source of truth for current planning, story ownership, status, traceability and delivery evidence. The migrated OEP identifiers are retained for consistent requirement mapping.

GitHub Issues uses the labels `type:epic`, `type:story` and `type:task`; `area:*` identifies functional ownership domains and `status:*` captures the working state. Team members update status labels while delivering work, link PRs to issues and only close issues after meeting their acceptance criteria. Epics contain linked checklists of child issues. See `docs/GITHUB_BACKLOG.md` for saved filters and procedures.

The working flow is:

```text
To Do (status:todo)
   ↓
In Progress (status:in-progress)
   ↓
In Review (status:review)
   ↓
Done (status:done; close issue after acceptance checks)