# Makefile Dev Setup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `Makefile` at the repo root so `make dev` starts the entire local stack (infra + backend + frontend) from one command.

**Architecture:** A Makefile manages background processes using PID files in a `logs/` directory. `make dev` starts docker-compose detached, then starts Maven and Vite as backgrounded shell processes, logging each to separate files, then tails both logs. `make stop` reads PIDs and kills the processes.

**Tech Stack:** GNU Make, bash, docker compose, Maven wrapper (`./mvnw`), npm

---

### Task 1: Add `logs/` to `.gitignore`

**Files:**
- Modify: `.gitignore`

- [ ] **Step 1: Add the logs directory entry**

Open `.gitignore` and append after the `frontend/dist/` line:

```
# Local dev process logs and PIDs
logs/
```

- [ ] **Step 2: Verify the entry is present**

Run:
```bash
grep 'logs/' .gitignore
```
Expected output:
```
logs/
```

- [ ] **Step 3: Commit**

```bash
git add .gitignore
git commit -m "chore: ignore logs/ directory (make dev output)"
```

---

### Task 2: Create the Makefile

**Files:**
- Create: `Makefile`

- [ ] **Step 1: Create the Makefile**

Create `Makefile` at the repo root with this exact content:

```makefile
.PHONY: dev stop logs infra build help

## dev: Start infra, backend, and frontend (all-in-one)
dev: infra
	@mkdir -p logs
	@echo "Starting backend..."
	@./mvnw spring-boot:run -Dspring-boot.run.profiles=local > logs/backend.log 2>&1 & echo $$! > logs/backend.pid
	@echo "Starting frontend..."
	@cd frontend && npm run dev > ../logs/frontend.log 2>&1 & echo $$! > logs/frontend.pid
	@echo "All services started. Tailing logs (Ctrl+C to stop tailing — services keep running)."
	@tail -f logs/backend.log logs/frontend.log

## stop: Stop backend and frontend processes
stop:
	@if [ -f logs/backend.pid ]; then \
		kill $$(cat logs/backend.pid) 2>/dev/null && echo "Backend stopped." || echo "Backend was not running."; \
		rm -f logs/backend.pid; \
	else \
		echo "No backend PID file found."; \
	fi
	@if [ -f logs/frontend.pid ]; then \
		kill $$(cat logs/frontend.pid) 2>/dev/null && echo "Frontend stopped." || echo "Frontend was not running."; \
		rm -f logs/frontend.pid; \
	else \
		echo "No frontend PID file found."; \
	fi

## logs: Tail backend and frontend logs
logs:
	@tail -f logs/backend.log logs/frontend.log

## infra: Start Postgres and MinIO via docker compose
infra:
	docker compose up -d
	@echo "Waiting for Postgres to be healthy..."
	@sleep 3

## build: Build the production fat JAR (includes frontend)
build:
	./mvnw package -DskipTests

## help: Show available targets
help:
	@grep -E '^## ' Makefile | sed 's/## //' | column -t -s ':'
```

- [ ] **Step 2: Verify the file exists and is valid**

Run:
```bash
make help
```
Expected output (columns may vary in spacing):
```
dev    Start infra, backend, and frontend (all-in-one)
stop   Stop backend and frontend processes
logs   Tail backend and frontend logs
infra  Start Postgres and MinIO via docker compose
build  Build the production fat JAR (includes frontend)
help   Show available targets
```

- [ ] **Step 3: Commit**

```bash
git add Makefile
git commit -m "chore: add Makefile for one-command local dev"
```

---

### Task 3: Smoke-test `make dev`

**Files:** (no file changes — verification only)

- [ ] **Step 1: Ensure infra is stopped so we start fresh**

```bash
docker compose down
```

- [ ] **Step 2: Run `make dev`**

```bash
make dev
```

Expected: docker-compose starts, 3-second pause, then Maven and Vite start in background. Terminal tails `logs/backend.log` and `logs/frontend.log`. Within ~30 seconds you should see Spring Boot startup logs and Vite's `VITE vX.X ready` message.

- [ ] **Step 3: Verify PID files exist**

Open a second terminal and run:
```bash
ls logs/
```
Expected:
```
backend.log  backend.pid  frontend.log  frontend.pid
```

- [ ] **Step 4: Verify the app is reachable**

```bash
curl -s -o /dev/null -w "%{http_code}" http://localhost:5173
```
Expected: `200`

- [ ] **Step 5: Test `make stop`**

```bash
make stop
```
Expected:
```
Backend stopped.
Frontend stopped.
```

- [ ] **Step 6: Verify processes are gone**

```bash
ls logs/*.pid 2>/dev/null || echo "No PID files — clean stop confirmed."
```
Expected:
```
No PID files — clean stop confirmed.
```

- [ ] **Step 7: Update SETUP.md to mention make**

In `SETUP.md`, find the "Local Development" section and replace the multi-step backend/frontend instructions with a note about `make dev`. Edit the file so steps 4 and 5 become:

```markdown
### 4. Start the application

```bash
make dev
```

This starts the backend (`:8080`) and frontend dev server (`:5173`) together and tails their logs. Press `Ctrl+C` to stop tailing — services keep running. Use `make stop` to shut them down.

Alternatively, run them separately:
- Backend: `./mvnw spring-boot:run -Dspring-boot.run.profiles=local`
- Frontend: `cd frontend && npm run dev`
```

- [ ] **Step 8: Commit**

```bash
git add SETUP.md
git commit -m "docs: update SETUP.md to use make dev"
```
