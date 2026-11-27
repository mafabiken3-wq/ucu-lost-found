# UCU Campus Lost and Found System

**CSC1202 – Web and Mobile Applications Development**  
Uganda Christian University · Advent 2026 Semester  
100% Project-Based Examination

A responsive web application that lets students report lost or found items, search listings, submit private ownership claims, and allows an administrator to review claims and confirm returns.

---

## Technology stack

| Layer        | Technology                          |
|--------------|-------------------------------------|
| Frontend     | React 18 + Vite + React Router      |
| Backend      | Node.js + Express                   |
| Database     | MySQL 8                             |
| Auth         | JWT + bcrypt password hashing       |
| Validation   | express-validator (backend)         |

---

## Prerequisites

- Node.js ≥ 18
- MySQL ≥ 8 (running locally or remote)
- Git

---

## Quick start

### 1. Database

```bash
# Create the schema and seed data
mysql -u root -p < sql/schema.sql
```

Or run the SQL file from any MySQL client.  
Default seed accounts (password for all: **`Password123!`**):

| Role    | Email                 |
|---------|-----------------------|
| Admin   | admin@ucu.ac.ug       |
| Student | okello@ucu.ac.ug      |
| Student | namusoke@ucu.ac.ug    |
| Student | achieng@ucu.ac.ug     |

### 2. Backend

```bash
cd backend
cp .env.example .env
# Edit .env – set DB_PASSWORD, JWT_SECRET, etc.

npm install
npm run dev          # starts on http://localhost:5000
```

### 3. Frontend

```bash
cd frontend
npm install
npm run dev          # starts on http://localhost:3000 (proxies /api → backend)
```

Open **http://localhost:3000** in a browser.

---

## Project structure

```
ucu-lost-found/
├── sql/
│   └── schema.sql              # Database + seed data
├── backend/
│   ├── .env.example
│   ├── package.json
│   └── src/
│       ├── index.js            # Express entry
│       ├── config/db.js
│       ├── middleware/auth.js
│       └── routes/
│           ├── auth.js
│           ├── reports.js
│           ├── claims.js
│           └── admin.js
├── frontend/
│   ├── package.json
│   ├── vite.config.js
│   ├── index.html
│   └── src/
│       ├── main.jsx
│       ├── App.jsx
│       ├── context/AuthContext.jsx
│       ├── services/api.js
│       ├── components/Navbar.jsx
│       ├── pages/
│       │   ├── Login.jsx
│       │   ├── Register.jsx
│       │   ├── Browse.jsx
│       │   ├── ReportForm.jsx
│       │   ├── ReportDetail.jsx
│       │   ├── MyItems.jsx
│       │   └── AdminDashboard.jsx
│       └── styles/index.css
└── README.md
```

---

## Key features implemented

1. **User accounts** – register, login, logout; JWT stored client-side; bcrypt password hashes.
2. **Lost / found reports** – create, edit own open reports; public description + private identifying details (found items only).
3. **Search & filter** – keyword, type, category, location, status, date range.
4. **Ownership claims** – private evidence; one claim per user per item; cannot claim own found report; blocked after return.
5. **Admin review** – approve / reject with reason; only one approved claim per item; mark returned; auto-reject remaining pending claims.
6. **Permissions** – enforced on every backend route; private fields stripped from public responses.
7. **Responsive UI** – mobile-first CSS, keyboard-accessible forms and navigation, clear loading / empty / error states.

---

## API overview

| Method | Endpoint                        | Auth          | Purpose                          |
|--------|---------------------------------|---------------|----------------------------------|
| POST   | /api/auth/register              | Public        | Create student account           |
| POST   | /api/auth/login                 | Public        | Obtain JWT                       |
| POST   | /api/auth/logout                | Student/Admin | Client discards token            |
| GET    | /api/reports                    | Student/Admin | List / search (public fields)    |
| POST   | /api/reports                    | Student       | Create report                    |
| GET    | /api/reports/:id                | Student/Admin | Detail (private if owner/admin)  |
| PUT    | /api/reports/:id                | Owner         | Edit own open report             |
| GET    | /api/reports/mine               | Student       | Own reports                      |
| POST   | /api/claims                     | Student       | Submit claim                     |
| GET    | /api/claims/mine                | Student       | Own claims                       |
| GET    | /api/admin/claims               | Admin         | All claims (+ private data)      |
| PATCH  | /api/admin/claims/:id           | Admin         | Approve / reject                 |
| PATCH  | /api/admin/reports/:id/return   | Admin         | Mark item returned               |

---

## Security notes

- Passwords are never stored in plain text (bcrypt, cost 10).
- JWT secret and DB credentials live only in `.env` (git-ignored).
- Private columns (`private_details`, `evidence`) are excluded from public SELECT queries.
- Business rules (self-claim ban, single approved claim, no claims after return) are enforced server-side.
- All mutating endpoints require authentication; admin routes require `role === 'admin'`.

---

## Testing checklist (manual)

- [x] Full cycle: report found → search → claim → admin approve → mark returned
- [x] Missing / invalid form input shows field-level errors
- [x] Wrong password returns generic “Invalid credentials”
- [x] Student cannot edit another student’s report (403)
- [x] Student cannot view another’s claim evidence (403)
- [x] Competing claims: only one can be approved
- [x] Claim on already-returned item is rejected
- [x] Self-claim on own found report is blocked
- [x] Mobile viewport (≈375 px) usable; keyboard navigation works

---

## Deployment notes

1. Set strong `JWT_SECRET` and production DB credentials in `.env`.
2. Build frontend: `cd frontend && npm run build` → serve the `dist/` folder.
3. Run backend behind a process manager (PM2) and reverse-proxy (Nginx) with HTTPS.
4. Keep `.env` and `node_modules` out of the repository.

---

## Acknowledgements

- React, Express, MySQL, bcrypt, jsonwebtoken, express-validator, Vite.
- Examination brief: CSC1202 Advent 2026, Uganda Christian University.

---

*Keep credentials and secrets out of Git. Use only fictional data for assessment accounts.*
