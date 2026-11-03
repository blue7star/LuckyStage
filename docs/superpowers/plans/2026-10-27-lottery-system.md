# 通用抽奖小程序 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. User authorized inline execution in this chat.

**Goal:** Build a self-hosted lottery system with web administration, event themes, CSV import, WeChat signup, and configurable draws.

**Architecture:** A dependency-free Node.js 24 HTTP service persists events, participants, and draw results in SQLite. A static management site, public display, and WeChat mini program use its JSON API. The server generates WeChat mini program codes when configured.

**Tech Stack:** Node.js 24, `node:sqlite`, HTML/CSS/JavaScript, WeChat mini program APIs.

## Global Constraints

- One organizer manages many isolated events.
- Server runs on company infrastructure behind a public HTTPS reverse proxy.
- No cloud hosting or external npm runtime dependency.
- CSV is the first import format; Excel can export CSV.
- A unique field is required per event and cannot change after participants exist.
- Each prize draws once; current-round winners do not win again in that round.

---

### Task 1: Server and data model

**Files:** `package.json`, `server/db.js`, `server/config.js`, `server/security.js`, `server/http.js`.

**Interfaces:** `db` exposes `createEvent`, `updateEvent`, `listEvents`, `getEvent`, `insertParticipants`, `listParticipants`, `drawPrize`, and `listResults`. HTTP helpers parse bounded JSON bodies and emit JSON errors.

- [x] Create the dependency-free package and SQLite schema for events, participants, results.
- [x] Implement event validation, uniqueness, and atomic draws in `server/db.js`.
- [x] Implement password verification, signed expiring sessions, static serving, and API routing.
- [x] Confirm server startup output and inspect route definitions in source.

### Task 2: Administration and live display

**Files:** `web/index.html`, `web/admin.css`, `web/admin.js`, `web/live.html`, `web/live.css`, `web/live.js`.

**Interfaces:** Calls `POST /api/admin/login`, event create/update, import, participant list, draw; reads `GET /api/public/events/:id` and results for the live page.

- [x] Build login and event selector, event form, field editor, round/prize editor, CSV import preview and submit.
- [x] Add theme controls, image upload, code display, and draw controls.
- [x] Build a read-only live screen that polls status and winners.
- [x] Inspect page markup and JavaScript syntax after implementation.

### Task 3: WeChat mini program and deployment

**Files:** `miniprogram/app.js`, `miniprogram/app.json`, `miniprogram/project.config.json`, `miniprogram/pages/event/*`, `miniprogram/pages/result/*`, `README.md`, `.env.example`.

**Interfaces:** Event page reads `scene` or `id`, loads event configuration, posts registration data, and opens result page. Server code endpoint uses configured AppID/AppSecret.

- [x] Implement event registration and result pages with per-activity theme.
- [x] Implement server-side mini program code generation and admin presentation.
- [x] Document local startup, self-host reverse proxy, HTTPS, WeChat credentials/domain, CSV template, and known limits.
- [x] Perform a final source review against the spec and report deployment prerequisites.
