

up:
	docker compose up --build -d

down:
	docker compose down

clean:
	rm -rf backend/__pycache__
	rm -rf backend/**/__pycache__
	rm -rf backend/.ruff_cache
	rm -rf backend/.pytest_cache


fclean:
	# Stop and remove compose resources for this project
	docker compose down --rmi all --volumes --remove-orphans
	# Remove any dangling resources system-wide
	docker system prune -af --volumes
	# Extra safety: remove unused networks explicitly
	docker network prune -f
