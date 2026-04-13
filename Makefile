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
