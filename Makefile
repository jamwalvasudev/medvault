.PHONY: dev stop logs infra build clean help

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
		kill $$(cat logs/backend.pid) 2>/dev/null; \
		pkill -P $$(cat logs/backend.pid) 2>/dev/null; \
		echo "Backend stopped."; \
		rm -f logs/backend.pid; \
	else \
		echo "No backend PID file found."; \
	fi
	@if [ -f logs/frontend.pid ]; then \
		kill $$(cat logs/frontend.pid) 2>/dev/null; \
		pkill -P $$(cat logs/frontend.pid) 2>/dev/null; \
		echo "Frontend stopped."; \
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
	@until docker compose ps --status healthy 2>/dev/null | grep -q postgres; do sleep 1; done
	@echo "Postgres is ready."

## build: Build the production fat JAR (includes frontend)
build:
	./mvnw package -DskipTests

## clean: Remove log files
clean:
	rm -rf logs/

## help: Show available targets
help:
	@grep -E '^## ' $(MAKEFILE_LIST) | sed 's/## //' | column -t -s ':'
