
## `docs/08_Validation_Plan.md`

```markdown
# Online Exam Portal
## Initial Validation Plan

**Version:** 0.1  
**Status:** Initial Validation Baseline  
**Course:** UE24CS341A - Software Engineering

---

## 1. Purpose

This document defines the initial testing and validation strategy for the Online Exam Portal.

Detailed test cases and actual execution results will be added incrementally as the corresponding functionality is implemented.

No test will be marked Pass or Fail before it has actually been executed.

---

## 2. Validation Objectives

The validation process aims to verify that:

- implemented functionality matches the approved requirements;
- role-based access restrictions are correctly enforced;
- examination workflows behave as expected;
- student responses and results are stored correctly;
- scoring is accurate;
- invalid and unauthorized operations are rejected;
- the integrated system behaves correctly across complete user workflows.

---

## 3. Testing Levels

### 3.1 Unit Testing

Unit testing will verify individual functions and modules independently.

Examples include:

- input validation functions;
- score calculation logic;
- authorization helper functions;
- examination status rules;
- response validation;
- utility functions.

Tool:

- Jest

---

### 3.2 Integration Testing

Integration testing will verify interaction between backend modules, APIs and the database.

Examples include:

- authentication with protected routes;
- exam creation with MongoDB persistence;
- question creation linked to an exam;
- attempt submission followed by evaluation;
- result retrieval with authorization.

Tools:

- Jest
- Supertest

---

### 3.3 Frontend Testing

Frontend testing will validate important React components and user interactions.

Examples include:

- login form;
- exam creation form;
- question display;
- answer selection;
- navigation controls;
- timer display;
- result display.

Tool:

- React Testing Library

---

### 3.4 System Testing

System testing will validate complete end-to-end user workflows.

Examples include:

- instructor logs in, creates an exam, adds questions and publishes it;
- student logs in, views available exams and starts an attempt;
- student answers questions and submits;
- system evaluates the attempt and stores the result;
- student views their result;
- instructor views results for the examination.

---

## 4. Security Validation

Security validation will include tests for:

- invalid login credentials;
- unauthenticated access to protected routes;
- student attempts to access instructor-only functionality;
- instructor attempts to modify another instructor's exam;
- student attempts to access another student's result;
- attempts to modify an already submitted exam;
- attempts to access correct answers during an active examination;
- unauthorized API access.

---

## 5. Planned Functional Validation Areas

### 5.1 Authentication

Validate:

- successful login;
- invalid login;
- logout;
- access to protected routes;
- role information after authentication.

---

### 5.2 Exam Management

Validate:

- valid examination creation;
- invalid examination data;
- draft examination editing;
- draft examination deletion;
- instructor ownership rules;
- examination publication;
- rejection of invalid publication.

---

### 5.3 Question Management

Validate:

- valid MCQ creation;
- question text validation;
- answer option validation;
- exactly one correct option;
- question editing;
- question deletion;
- instructor authorization.

---

### 5.4 Student Examination Attempt

Validate:

- listing of available examinations;
- valid attempt creation;
- response storage;
- response changes before submission;
- question navigation;
- timer behavior;
- manual submission;
- timeout submission;
- prevention of modification after submission.

---

### 5.5 Evaluation

Validate:

- correct answer scoring;
- incorrect answer scoring;
- unanswered questions;
- total score calculation;
- result persistence;
- repeated evaluation consistency where applicable.

---

### 5.6 Results

Validate:

- student access to own result;
- rejection of another student's result access;
- instructor access to owned examination results;
- rejection of unauthorized instructor access;
- result accuracy.

---

## 6. Traceability

Each detailed test case will receive a unique Test Case ID.

Test cases will be mapped to functional requirements through the Requirement Traceability Matrix.

The traceability flow is:

```text
Requirement
    ↓
Architecture
    ↓
Software Design
    ↓
Implementation
    ↓
Test Case
    ↓
Validation Result