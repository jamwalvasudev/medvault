# MedHistory

Personal medical history manager. Track doctor visits, medications, recommendations, and attachments — all in one place.

## Features

- **Visit Timeline** — Chronological log of doctor visits grouped by year
- **Medications** — Track prescriptions per visit with dosage and frequency
- **Recommendations** — Record follow-up actions from each visit
- **Attachments** — Upload and retrieve lab reports, prescriptions, and scans (stored in S3/R2)
- **Full-text Search** — Search across visits, diagnoses, doctors, and notes
- **Push Reminders** — Browser push notifications for medication reminders (Web Push API)
- **Google OAuth** — Sign in with Google; no passwords to manage

## Architecture

```
┌─────────────────────────────────┐
│  React 19 SPA (Vite)            │
│  React Router · inline CSS      │
└──────────────┬──────────────────┘
               │ fetch + cookie JWT
┌──────────────▼──────────────────┐
│  Spring Boot 3.3 (Java 21)      │
│  Spring Security · JWT          │
│  JPA/Hibernate + Envers audit   │
│  PostgreSQL 16 (full-text)      │
│  S3-compatible object storage   │
│  Web Push (VAPID)               │
└─────────────────────────────────┘
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, Vite, TypeScript, React Router v7 |
| Backend | Spring Boot 3.3, Java 21 |
| Database | PostgreSQL 16 |
| Auth | Google OAuth2, JWT (HttpOnly cookie) |
| Storage | AWS S3 / Cloudflare R2 |
| Push | Web Push API (VAPID) |
| Deploy | Docker, Fly.io |

## Getting Started

See [SETUP.md](SETUP.md) for local development and deployment instructions.
