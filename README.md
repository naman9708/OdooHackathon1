ADMIN EMAIL AND PASSWORD:

Email: admin@dayflow.com     
Password: admin123



# Dayflow HRMS

A compact, hackathon-focused HRMS prototype built with Node.js and EJS. It demonstrates essential HR flows — signup/login, employee profiles, attendance and leave tracking, and profile uploads — using JSON files so you can demo instantly without a database.

## Why this project

- Launch a working HR demo in minutes for hackathon presentations.
- Swap-in a real database later with minimal changes.
- Clear separation of UI (`views/`) and simple file-based storage (`data/`) for rapid iteration.

## Quick Start (2 minutes)

1. Install dependencies

```bash
npm install
```

2. Start the server

```bash
node server.js
```

3. Open the app

Visit http://localhost:3000 (check `server.js` if a different port is configured).

Developer tip: run `npx nodemon server.js` for hot reloads.

## Project Structure

- `server.js` — app entry and route definitions
- `views/` — EJS templates (UI pages)
- `data/` — JSON data stores: `users.json`, `attendance.json`, `leaves.json`
- `uploads/profiles/` — profile image uploads
- `public/` — static assets (if present)

## Demo Routes to Highlight

- `/signup` — new user registration
- `/login` — authentication
- `/admin` — admin dashboard (manage employees/requests)
- `/employee` — employee dashboard
- `/employees` — list all employees
- `/employees/:id` — employee detail
- `/attendance` — attendance overview
- `/leaves` — leave requests

Confirm exact paths inside `server.js` before presenting.

## Data Notes

- `data/users.json` — users with fields like `id`, `name`, `email`, `role`, `profileImage`.
- `data/attendance.json` — attendance entries per user/date.
- `data/leaves.json` — leave requests with `employeeId`, `from`, `to`, `status`, `reason`.

You can pre-seed these files to prepare demo accounts.

## Quick Enhancements to Impress Judges

1. Add password hashing and sessions (`bcrypt`, `express-session`).
2. Add a `scripts` section in `package.json`:

```json
"scripts": {
	"start": "node server.js",
	"dev": "nodemon server.js",
	"seed": "node reset_admin.js"
}
```

3. Add a lightweight SQLite layer (use `better-sqlite3` or `sqlite3`) and a migration script.
4. Add Docker and a simple GitHub Actions CI for automatic deploys.
5. Add a small analytics dashboard (charts) showing attendance trends.

## Presentation Checklist

- Seed an admin user in `data/users.json` and verify login.
- Pre-upload profile images to `uploads/profiles/`.
- Confirm `server.js` port and session behavior.
- Prepare 3 demo scenarios: onboarding, marking attendance, approving a leave.

## I can implement next (pick one)

- Add `start`/`dev`/`seed` scripts to `package.json` and update `README` badges.
- Implement a `seed` script that populates `data/*.json` with demo users and records.
- Migrate storage to SQLite and provide a migration/seed script.

Tell me which option you want and I'll implement it.
