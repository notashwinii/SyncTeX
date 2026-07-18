run:
	air

migrate-new:
	@test -n "$(name)" || (echo "Usage: make migrate-new name=add_table" && exit 1)
	goose -dir migrations create $(name) sql

migrate-up:
	set -a; . .env; set +a; goose -dir migrations postgres $$DB_URI up

migrate-down:
	set -a; . .env; set +a; goose -dir migrations postgres $$DB_URI down 1

migrate-status:
	set -a; . .env; set +a; goose -dir migrations postgres $$DB_URI status
