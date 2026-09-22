# Dispatch — Task Management Application

A full-stack task manager: sign up, sign in, and create/update/delete tasks
that sync live across every open tab or device for that account.

## Stack

- **Backend:** Node.js + Express, SQLite (via `better-sqlite3`), JWT auth
  (`jsonwebtoken` + `bcryptjs`), WebSockets (`ws`) for real-time updates.
- **Frontend:** Plain HTML/CSS/JavaScript (no build step) served directly by
  the same Express server — no separate frontend server or CORS setup needed.
- **Database:** a single SQLite file created automatically at
  `data/dispatch.db` the first time the server starts.

## Features

- **Auth:** register / log in, passwords hashed with bcrypt, JWT-protected
  API routes, tokens expire after 7 days by default.
- **CRUD:** create, read, update, and delete tasks, each with a title,
  description, status (`todo` / `in_progress` / `done`), priority
  (`low` / `medium` / `high`), and an optional due date. Overdue tasks are
  highlighted.
- **Filtering, search & sort:** filter by status or priority, full-text
  search on title/description, sort by newest, due date, or priority.
- **Real-time updates:** every create/update/delete broadcasts over a
  WebSocket to all of that user's connected sessions, so a second tab (or a
  teammate on the same account) sees changes appear without refreshing. The
  header shows a live connection indicator and reconnects automatically if
  the connection drops.
- **Responsive design:** the layout adapts from a two-column desktop view
  down to a single-column mobile view (sidebar filters become a horizontal
  chip row, task rows stack).
- **Data isolation:** every task is scoped to its owner; one account can
  never read or modify another account's tasks (covered by the test suite).

## Project structure

```
task-manager/
├── server.js              # Express app entry point
├── db.js                  # SQLite connection + schema
├── ws.js                  # WebSocket server + per-user broadcast
├── middleware/auth.js      # JWT verification middleware
├── routes/auth.js          # POST /register, /login, GET /me
├── routes/tasks.js         # CRUD + filtering for /api/tasks
├── public/                 # Static frontend (served as-is)
│   ├── index.html           # Sign in / register
│   ├── dashboard.html        # Task board
│   ├── css/style.css
│   └── js/{api,auth,app}.js
├── test/integration_test.js  # End-to-end test: auth, CRUD, WebSockets
├── .env.example
└── package.json
```

## Setup

Requires Node.js 18+ (for native `fetch`; the app itself works on Node 16+).

```bash
cd task-manager
npm install
cp .env.example .env
```

Open `.env` and set `JWT_SECRET` to a long random string (used to sign login
tokens — anyone with this value could forge a login, so don't commit it or
reuse a example value in production).

```bash
npm start
```

Then open **http://localhost:4000** in a browser. Create an account, then
open the same URL in a second tab (or another browser) to see tasks update
live between them.

## Running the tests

```bash
npm test
```

This spins up the server on a separate port, exercises every auth and task
endpoint over HTTP, opens a real WebSocket connection and checks that
create/update/delete each broadcast the expected message, and confirms one
account can't see or modify another's tasks.

## Notes on the "real-time" implementation

Real-time sync is scoped **per account**, not global broadcast: when you
create, edit, or delete a task, the server pushes that change only to
WebSocket connections authenticated as the same user (so two different
people's task lists never leak into each other). This is the natural
interpretation of "real-time updates" for a personal task list; it's a
small change to broadcast globally instead if the assignment calls for a
shared/team board.

## Known limitations (things you may want to extend)

- No password-reset flow.
- No pagination — fine for a personal task list, would need it at real scale.
- SQLite is great for a single-server demo/assignment; swap `db.js` for a
  hosted Postgres/MySQL connection if you need multiple server instances.
