# Design: Makefile for Local Dev Setup

**Date:** 2026-04-13
**Status:** Approved

## Problem

Starting local development requires three separate commands in separate terminals:
1. `docker compose up -d`
2. `./mvnw spring-boot:run -Dspring-boot.run.profiles=local`
3. `cd frontend && npm run dev`

This is error-prone and annoying. The goal is a single `make dev` command that starts everything.

## Context

This is a Spring Boot + React (Vite) monorepo:
- **Backend:** Spring Boot on `:8080`, run with Maven + `local` profile
- **Frontend:** React/Vite dev server on `:5173`, proxies `/api`, `/oauth2`, `/login` to `:8080`
- **Infra:** Docker Compose running Postgres (`:5433`) and MinIO (`:9000/:9001`)
- **Production:** `mvn package` builds the React app and bundles it into the Spring Boot fat JAR — single process, single port. The two-process split is dev-only and intentional (Vite HMR).

## Solution

A `Makefile` at the repo root. No new dependencies required.

## Targets

| Target | Description |
|--------|-------------|
| `make dev` | Start infra (docker-compose), backend, and frontend |
| `make stop` | Stop backend and frontend processes; leave infra running |
| `make logs` | Tail both backend and frontend logs |
| `make infra` | Start only docker-compose (Postgres + MinIO) |
| `make build` | Build the production fat JAR (`mvn package -DskipTests`) |
| `make help` | List all targets with descriptions |

## Implementation Details

**Process management:**
- Backend and frontend start as background processes (`&`)
- PIDs written to `logs/backend.pid` and `logs/frontend.pid`
- `make stop` reads PIDs and sends SIGTERM
- `make dev` tails both log files after starting processes so output is visible in one terminal

**Log files:**
- `logs/backend.log` — Maven/Spring Boot output
- `logs/frontend.log` — Vite dev server output
- `logs/` directory added to `.gitignore`

**Startup sequencing:**
- `make dev` runs `docker compose up -d` first, then waits briefly (via `sleep`) before starting app processes to give Postgres time to become healthy
- Relies on docker-compose healthcheck already configured for Postgres

**`.PHONY` declarations:** All targets declared phony to avoid conflicts with files of the same name.

## Files Changed

- `Makefile` — new file at repo root
- `.gitignore` — add `logs/` entry

## Non-Goals

- No changes to the Spring Boot app or Vite config
- No changes to production deployment (already works as a single JAR)
- No process supervisor / restart-on-crash behavior
