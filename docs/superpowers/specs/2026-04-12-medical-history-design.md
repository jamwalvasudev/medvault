# Medical History Manager — Design Spec

**Date:** 2026-04-12  
**Status:** Approved

---

## Problem Statement

Medical history is scattered and lost between doctor visits. Prescriptions, dosages, recommendations (physical, diet, other), and notes about which medications worked or could be reused are stored only in apps like Practo — which don't give the user meaningful control or searchability. MRI, X-ray, and imaging reports are even harder to track. This app solves that by giving each user a personal, searchable, structured health record they own.

---

## Goals

- Capture every doctor visit with structured data: diagnosis, medications, recommendations, attachments
- Search across all history quickly ("what did the doctor prescribe for that throat infection last year?")
- See a timeline of all visits and conditions over time
- Track medications with notes on effectiveness and reusability
- Receive medication reminders via browser push notifications
- Support multiple users (each user owns their own data)

**Out of scope (future):**
- AI-assisted intake from uploaded documents
- Family member profiles under one account
- Sharing records with doctors
- SMS reminders
- Native mobile app

---

## Architecture

```
Browser (React + Vite + shadcn/ui)
         │  HTTPS + JWT (httpOnly cookie)
         ▼
Spring Boot 3.x (single fat JAR)
   ├── serves static frontend from resources/static/
   ├── REST API at /api/**
   ├── PostgreSQL      ← all structured data
   ├── Cloudflare R2   ← file attachments
   └── Web Push (VAPID) ← medication reminders
```

Single deployable unit: one JAR serves both frontend and API. Frontend is built by Maven (`frontend-maven-plugin`) during `mvn package` and embedded in the JAR under `resources/static/`. All API routes are prefixed `/api/**`; all other requests fall through to `index.html` (React Router handles client-side routing).

---

## Tech Stack

### Frontend
| Concern | Choice |
|---|---|
| Framework | React 18 + Vite |
| Language | TypeScript |
| UI components | shadcn/ui + Tailwind CSS |
| Routing | React Router v6 |
| Server state | TanStack Query (React Query) |
| Forms | React Hook Form + Zod |
| Push notifications | Web Push API + Service Worker |

### Backend
| Concern | Choice |
|---|---|
| Framework | Spring Boot 3.x |
| Language | Java 21 |
| Auth | Spring Security OAuth2 Client + jjwt |
| ORM | Spring Data JPA + Hibernate |
| Auditing | Hibernate Envers |
| DB migrations | Flyway |
| File storage | AWS S3 SDK (Cloudflare R2 endpoint) |
| Scheduler | Spring `@Scheduled` (medication reminders) |
| Logging | Logback + structured JSON (prod) |
| Metrics | Micrometer + Prometheus (`/actuator/prometheus`) |
| Health | Spring Actuator (`/actuator/health`, `/actuator/info`) |
| Build | Maven + frontend-maven-plugin |

### Infrastructure
| Concern | Local | Production |
|---|---|---|
| Database | PostgreSQL 16 (Docker) | Neon (serverless Postgres) |
| File storage | MinIO (Docker, S3-compatible) | Cloudflare R2 |
| App hosting | localhost:8080 | Fly.io |
| Auth provider | Google OAuth (localhost redirect) | Google OAuth (prod redirect) |

---

## Auditing (Hibernate Envers)

All domain entities (`User`, `Visit`, `Medication`, `Recommendation`, `Attachment`, `MedicationReminder`) are annotated with `@Audited`. Hibernate Envers automatically:

- Creates a `*_AUD` shadow table for every audited entity (e.g., `VISIT_AUD`, `MEDICATION_AUD`)
- Creates a `REVINFO` table tracking each revision number and timestamp
- Records the full row state at every insert, update, and delete with a revision type (`ADD`, `MOD`, `DEL`)

**Custom `RevisionEntity`** extends the default `REVINFO` to capture:
- `modified_by` — the user ID (UUID) from the security context at the time of the change
- `modified_at` — timestamp of the revision (already in default REVINFO, kept for clarity)

**Base audit fields on all entities** (via `@MappedSuperclass`, Spring Data JPA auditing):
```
created_by    UUID    -- populated by AuditorAware from SecurityContext on first save
created_at    TIMESTAMP
modified_by   UUID    -- updated on every save
modified_at   TIMESTAMP
```

`AuditorAware<UUID>` is implemented to extract the current user's UUID from the JWT. Spring Data JPA populates `@CreatedBy`, `@CreatedDate`, `@LastModifiedBy`, `@LastModifiedDate` automatically.

This gives two audit layers:
1. **Current state fields** (`created_by`, `created_at`, `modified_by`, `modified_at`) — fast, on the entity itself
2. **Full history via Envers** — every past state of any record, queryable via `AuditReader`

Flyway migrations create the `_AUD` tables and `REVINFO` explicitly (rather than relying on Hibernate DDL auto-generation) to keep schema changes controlled and reviewable.

---

## Data Model

All entities extend a `BaseAuditEntity` `@MappedSuperclass` that contributes four audit columns. They are shown inline below for clarity.

### User
```
id              UUID (PK)
google_id       VARCHAR UNIQUE NOT NULL     -- Google subject claim
email           VARCHAR UNIQUE NOT NULL
name            VARCHAR NOT NULL
profile_picture VARCHAR
-- audit fields --
created_by      UUID
created_at      TIMESTAMP
modified_by     UUID
modified_at     TIMESTAMP
```

### Visit
```
id              UUID (PK)
user_id         UUID (FK → User)
visit_date      DATE NOT NULL
doctor_name     VARCHAR
specialty       VARCHAR
clinic          VARCHAR
chief_complaint TEXT
diagnosis       TEXT
notes           TEXT
search_vector   TSVECTOR                   -- auto-updated via trigger
-- audit fields --
created_by      UUID
created_at      TIMESTAMP
modified_by     UUID
modified_at     TIMESTAMP
```

### Medication
```
id              UUID (PK)
visit_id        UUID (FK → Visit)
name            VARCHAR NOT NULL
dosage          VARCHAR
frequency       VARCHAR
duration_days   INTEGER
worked          VARCHAR                    -- 'yes' | 'no' | 'partial'
side_effects    TEXT
would_use_again BOOLEAN
-- audit fields --
created_by      UUID
created_at      TIMESTAMP
modified_by     UUID
modified_at     TIMESTAMP
```

### Recommendation
```
id              UUID (PK)
visit_id        UUID (FK → Visit)
type            VARCHAR                    -- 'physical' | 'diet' | 'other'
description     TEXT NOT NULL
-- audit fields --
created_by      UUID
created_at      TIMESTAMP
modified_by     UUID
modified_at     TIMESTAMP
```

### Attachment
```
id              UUID (PK)
visit_id        UUID (FK → Visit)
display_name    VARCHAR NOT NULL
r2_key          VARCHAR NOT NULL           -- object key in R2/MinIO
file_type       VARCHAR                    -- 'prescription' | 'report' | 'imaging'
content_type    VARCHAR                    -- MIME type
size_bytes      BIGINT
-- audit fields --
created_by      UUID
created_at      TIMESTAMP
modified_by     UUID
modified_at     TIMESTAMP
```

### MedicationReminder
```
id              UUID (PK)
medication_id   UUID (FK → Medication)
user_id         UUID (FK → User)
reminder_time   TIME NOT NULL              -- stored in UTC; frontend converts to/from local timezone
active          BOOLEAN DEFAULT true
last_sent_at    TIMESTAMP
-- audit fields --
created_by      UUID
created_at      TIMESTAMP
modified_by     UUID
modified_at     TIMESTAMP
```

### PushSubscription
```
id              UUID (PK)
user_id         UUID (FK → User)
endpoint        TEXT NOT NULL
p256dh          VARCHAR NOT NULL           -- VAPID public key
auth            VARCHAR NOT NULL           -- auth secret
created_at      TIMESTAMP
```

### Envers Revision Tables (auto-managed by Envers + explicit in Flyway)
```
REVINFO (custom)
  rev             BIGINT (PK, sequence)
  revtstmp        BIGINT                   -- epoch millis
  modified_by     UUID                     -- user who triggered the change

VISIT_AUD, MEDICATION_AUD, RECOMMENDATION_AUD, ATTACHMENT_AUD, MEDICATION_REMINDER_AUD
  <all columns from the entity> +
  rev             BIGINT (FK → REVINFO)
  revtype         SMALLINT                 -- 0=ADD, 1=MOD, 2=DEL
```

---

## Auth Flow

1. User lands on app → sees "Sign in with Google" button
2. Frontend redirects to `/oauth2/authorization/google`
3. Spring Security handles the OAuth2 dance with Google
4. On success: Spring extracts `sub`, `email`, `name`, `picture` from Google's ID token
5. If first login: create User record
6. Spring issues a signed JWT (24h expiry) set as an `httpOnly` cookie
7. All subsequent API requests carry the cookie automatically
8. Spring Security validates JWT on every request

**Why httpOnly cookie over localStorage:** protects the token from XSS. The cookie is `Secure` + `SameSite=Lax` in production.

**Extensibility:** adding GitHub or Apple login is a matter of adding a provider block to `application.yml` and a button on the frontend. The User model is provider-agnostic (only `google_id` today; future providers get their own column or a `UserIdentity` join table).

---

## Features

### Visit Management
- Create a visit — required: `visit_date`. All other fields optional.
- Edit / delete a visit (cascades to medications, recommendations, attachments)
- Attach files to a visit — frontend sends multipart upload to `/api/visits/{id}/attachments`, backend streams to R2/MinIO, stores the R2 key. Presigned URLs are generated on-demand for viewing/downloading (never expose R2 credentials to the client).
- Supported attachment types: photos (JPEG/PNG), PDFs, any file type for reports

### Timeline View
- Visits displayed newest-first
- Grouped by year
- Each visit card shows: date, doctor, specialty, diagnosis (truncated), medication count, attachment count
- Click to expand full visit detail

### Search
- Full-text search using PostgreSQL `tsvector` across: `diagnosis`, `doctor_name`, `notes`, medication `name`s, recommendation `description`s
- `search_vector` column on Visit is updated by a Postgres trigger on insert/update
- API: `GET /api/visits/search?q=throat+infection`
- Results ranked by relevance (`ts_rank`)

### Medication Reminders
1. User sets a reminder time on any medication
2. Frontend requests push notification permission from browser
3. Browser returns a `PushSubscription` object (endpoint + keys) → saved to `PushSubscription` table via `/api/push/subscribe`
4. Spring Scheduler runs every minute, queries for active reminders due in the current minute
5. Sends Web Push notification via VAPID to the stored endpoint
6. Service Worker on the frontend intercepts the push event and shows the OS notification
7. User can toggle reminders on/off or delete them

---

## API Surface (high level)

```
POST   /api/auth/logout
GET    /api/users/me

GET    /api/visits                    ?page=&size=&sort=
POST   /api/visits
GET    /api/visits/{id}
PUT    /api/visits/{id}
DELETE /api/visits/{id}
GET    /api/visits/search             ?q=

POST   /api/visits/{id}/medications
PUT    /api/visits/{id}/medications/{medId}
DELETE /api/visits/{id}/medications/{medId}

POST   /api/visits/{id}/recommendations
PUT    /api/visits/{id}/recommendations/{recId}
DELETE /api/visits/{id}/recommendations/{recId}

POST   /api/visits/{id}/attachments   (multipart)
GET    /api/visits/{id}/attachments/{attId}/url   (presigned URL)
DELETE /api/visits/{id}/attachments/{attId}

POST   /api/medications/{id}/reminders
PUT    /api/medications/{id}/reminders/{remId}
DELETE /api/medications/{id}/reminders/{remId}

POST   /api/push/subscribe
DELETE /api/push/unsubscribe
```

All endpoints are user-scoped — the JWT identifies the user; backend enforces ownership on every operation.

---

## Logging, Monitoring & Observability

### Structured Logging (Backend)

- **Local:** human-readable Logback pattern (console)
- **Production:** JSON-structured Logback output — each log line is a JSON object, making it machine-parseable in Fly.io's log aggregator (`fly logs`)
- Log fields: `timestamp`, `level`, `logger`, `message`, `correlationId`, `userId`, `traceId`
- **Correlation ID filter:** a `OncePerRequestFilter` generates a UUID per request, sets it in MDC, and echoes it back in the response as `X-Correlation-Id`. All logs for a request share the same correlation ID — essential for tracing a request through controller → service → repository.
- Log levels by package:
  - `com.medhistory` → `DEBUG` (local), `INFO` (prod)
  - `org.hibernate.SQL` → `DEBUG` (local only, shows all SQL)
  - `org.springframework.security` → `DEBUG` (local only)

### Metrics (Backend)

- **Micrometer** is the metrics facade (included via `spring-boot-starter-actuator`)
- Prometheus endpoint exposed at `/actuator/prometheus`
- Key metrics auto-collected: JVM memory/GC, HTTP request latency/count, DB connection pool (HikariCP), Flyway migration status
- Custom business metrics (via `MeterRegistry`):
  - `medhistory.visits.created` counter
  - `medhistory.reminders.sent` counter
  - `medhistory.attachments.uploaded` counter + size histogram
  - `medhistory.search.latency` timer

### Health Checks (Backend)

Spring Actuator exposes:
- `GET /actuator/health` — liveness + readiness (DB connectivity, disk space)
- `GET /actuator/info` — app version, build time
- `GET /actuator/metrics` — metric names browser
- Actuator endpoints restricted to internal access only in prod (not publicly exposed — Fly.io internal network only)

### Fly.io Monitoring (Production)

- Fly.io reads `fly.toml` health check config → uses `/actuator/health` for deployment health gating
- JSON logs from the JAR are ingested by Fly.io's log shipper — accessible via `fly logs` or streamed to Papertrail/Logtail (both have free tiers)
- Prometheus scraping: Fly.io metrics agent can scrape `/actuator/prometheus` for the Fly.io Metrics dashboard (included free)

### Frontend Observability

- React Error Boundary wraps the entire app — caught errors are logged to the browser console and displayed as a user-friendly error page
- All API client errors (non-2xx responses) log the correlation ID so backend logs can be cross-referenced
- No external error tracking service (overkill for a personal project)

---

## Profiles & Configuration

### Local (`application-local.yml`)
- PostgreSQL: `localhost:5432` (Docker Compose)
- MinIO: `localhost:9000` (Docker Compose, S3-compatible)
- Google OAuth redirect: `http://localhost:8080`
- Verbose SQL logging on
- CORS allows `localhost:5173` (Vite dev server)
- Flyway auto-runs migrations on startup

### Production (`application-prod.yml`)
- All secrets read from environment variables (never hardcoded)
- PostgreSQL: Neon connection string via `DATABASE_URL`
- R2: via `R2_ENDPOINT`, `R2_ACCESS_KEY`, `R2_SECRET_KEY`, `R2_BUCKET`
- Google OAuth: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
- VAPID: `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`
- JWT secret: `JWT_SECRET`

### Docker Compose (local)
```yaml
services:
  postgres:
    image: postgres:16
    environment:
      POSTGRES_DB: medhistory
      POSTGRES_USER: medhistory
      POSTGRES_PASSWORD: medhistory
    ports: ["5432:5432"]

  minio:
    image: minio/minio
    command: server /data --console-address ":9001"
    environment:
      MINIO_ROOT_USER: minioadmin
      MINIO_ROOT_PASSWORD: minioadmin
    ports:
      - "9000:9000"   # S3 API
      - "9001:9001"   # MinIO web console
```

---

## Project Structure

```
team-hub/
├── frontend/                        # React + Vite app
│   ├── src/
│   │   ├── components/ui/           # shadcn/ui components
│   │   ├── pages/                   # route-level components
│   │   ├── hooks/                   # React Query hooks
│   │   ├── lib/                     # API client, utils
│   │   └── sw.ts                    # Service Worker (push notifications)
│   ├── package.json
│   └── vite.config.ts
├── src/main/
│   ├── java/com/medhistory/
│   │   ├── auth/                    # OAuth2, JWT config
│   │   ├── user/                    # User entity + service
│   │   ├── visit/                   # Visit entity + controller + service
│   │   ├── medication/              # Medication + reminders
│   │   ├── recommendation/
│   │   ├── attachment/              # R2/MinIO upload/download
│   │   ├── push/                    # Web Push + VAPID
│   │   └── scheduler/               # Reminder scheduler
│   └── resources/
│       ├── application.yml
│       ├── application-local.yml
│       ├── application-prod.yml
│       ├── logback-spring.xml       # structured JSON (prod) / readable (local)
│       └── db/migration/            # Flyway SQL migrations (includes _AUD tables)
├── docker-compose.yml
├── Dockerfile
├── fly.toml
├── pom.xml
├── README.md
└── SETUP.md
```

---

## Deployment (Production)

**Fly.io** runs the Spring Boot JAR in a Docker container.

```dockerfile
FROM eclipse-temurin:21-jre
COPY target/medhistory.jar app.jar
ENTRYPOINT ["java", "-jar", "/app.jar", "--spring.profiles.active=prod"]
```

`mvn package` builds frontend + backend into one JAR before Docker build.

Secrets set once via `fly secrets set KEY=value` — never committed to source.

**Neon** provides the production PostgreSQL database (serverless, free tier, no expiry).

**Cloudflare R2** for file storage — CORS configured to allow the Fly.io app domain.

---

## Documentation

- `README.md` — project overview, feature list, tech stack, architecture diagram, contributing notes
- `SETUP.md` — complete step-by-step guide covering:
  - Prerequisites (Java 21, Node 20, Docker, Maven)
  - Local setup: Docker Compose, Google OAuth configuration, VAPID key generation, `.env.local` template
  - Running locally (backend + frontend dev server)
  - Production setup: Fly.io account, Neon DB, R2 bucket, Google OAuth prod redirect, secrets
  - Deploying with `fly deploy`
