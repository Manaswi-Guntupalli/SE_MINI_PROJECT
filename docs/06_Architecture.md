# Online Exam Portal
## High-Level Architecture

**Version:** 0.1  
**Status:** Initial Architecture Baseline  
**Course:** UE24CS341A - Software Engineering

---

## Revision History

| Version | Date | Author | Change |
|---|---|---|---|
| 0.1 | 02 October 2026 | Tanusha | Initial high-level architecture baseline |

---

## 1. Purpose

This document describes the initial high-level architecture of the Online Exam Portal.

The architecture represents the current planning baseline and may evolve during development based on implementation experience, sprint reviews and faculty feedback.

---

## 2. Architecture Style

The Online Exam Portal follows a client-server architecture using the MERN stack.

The major architectural flow is:

```text
User Browser
     |
     v
React Frontend
     |
     | HTTP / REST
     v
Node.js + Express Backend
     |
     v
Mongoose
     |
     v
MongoDB