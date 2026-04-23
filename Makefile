

up:
	docker compose up --build -d

down:
	docker compose down

re: down up

clean:
	rm -rf backend/__pycache__
	rm -rf backend/**/__pycache__
	rm -rf backend/.ruff_cache
	rm -rf backend/.pytest_cache
