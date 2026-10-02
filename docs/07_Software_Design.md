# Online Exam Portal
## Software Design Document

**Version:** 0.1  
**Status:** Initial Design Baseline  
**Course:** UE24CS341A - Software Engineering

---

## 1. Purpose

This document defines the initial software design of the Online Exam Portal.

The design is based on the current Release 1 scope and MERN technology stack. It will evolve during implementation as detailed schemas, API contracts and module interactions are refined.

---

## 2. Planned Repository Structure

```text
SE_MINI_PROJECT/
│
├── client/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── services/
│   │   └── utils/
│   └── package.json
│
├── server/
│   ├── controllers/
│   ├── models/
│   ├── routes/
│   ├── middleware/
│   ├── services/
│   ├── tests/
│   └── package.json
│
├── docs/
│
├── .gitignore
├── README.md
└── docker-compose.yml