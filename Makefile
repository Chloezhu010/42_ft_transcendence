

up:
	docker compose up --build -d

down:
	docker compose down

clean:
	rm -rf backend/**/__pycache__
	rm -rf backend/.ruff_cache
