.PHONY: setup run dev typecheck test monitor env-link db-up db-down db-migrate db-seed db-studio db-reset build clean

# ─────────────────────────────────────────────
# First-time setup: start DB, migrate, seed
# ─────────────────────────────────────────────
setup: env-link db-up build db-migrate db-seed
	@echo "\nSetup complete. Run 'make dev' to start development."

# ─────────────────────────────────────────────
# Day-to-day: start DB + backend dev server
# ─────────────────────────────────────────────
run: dev

dev: env-link db-up build db-migrate db-seed
	npm run dev -w packages/backend

# Run type-check across all packages
typecheck:
	npm run build -w packages/shared
	npm run typecheck -w packages/backend

# Run unit tests
test:
	npm test -w packages/backend

# Run rate monitor (checks cards with users, not verified in last 14 days)
# Estimated cost: ~$0.07 per card checked (Sonnet 4.6 + web_fetch)
monitor:
	cd packages/backend && npx tsx src/scripts/runMonitor.ts

# ─────────────────────────────────────────────
# Symlink root .env into packages that need it
# Prisma looks for .env relative to where it runs
# ─────────────────────────────────────────────
env-link:
	@ln -sf ../../.env packages/backend/.env
	@echo "Linked .env into packages/backend"

# ─────────────────────────────────────────────
# Database
# ─────────────────────────────────────────────
db-up:
	@if [ "$$(docker ps -q -f name=miles-db)" ]; then \
		echo "miles-db already running"; \
	elif [ "$$(docker ps -aq -f name=miles-db)" ]; then \
		echo "Starting existing miles-db container..."; \
		docker start miles-db; \
	else \
		echo "Creating miles-db container..."; \
		docker run --name miles-db \
			-e POSTGRES_USER=miles \
			-e POSTGRES_PASSWORD=miles_dev \
			-e POSTGRES_DB=miles_tracker \
			-p 5432:5432 \
			-d postgres:16; \
		sleep 2; \
	fi

db-down:
	docker stop miles-db

db-migrate:
	cd packages/backend && npx prisma migrate dev --name init --skip-seed

db-seed:
	cd packages/backend && npx prisma db seed

db-studio:
	cd packages/backend && npx prisma studio

# Wipe and recreate the database from scratch
db-reset:
	cd packages/backend && npx prisma migrate reset --force

# ─────────────────────────────────────────────
# Build
# ─────────────────────────────────────────────
build:
	npm run build -w packages/shared

# ─────────────────────────────────────────────
# Clean: remove build artifacts and stop DB
# ─────────────────────────────────────────────
clean:
	@echo "Removing build artifacts..."
	rm -rf packages/shared/dist
	rm -rf packages/backend/dist
	rm -rf packages/frontend/dist
	@echo "Stopping and removing DB container..."
	-docker stop miles-db 2>/dev/null
	-docker rm miles-db 2>/dev/null
	@echo "Clean complete."
