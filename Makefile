

PODMAN_COMPOSE = podman compose -f docker-compose.yml -f compose.podman.yml

up:
	docker compose up --build -d

down:
	docker compose down

logs:
	docker compose logs -f

re: down up

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

podman-up:
	$(PODMAN_COMPOSE) up --build -d

podman-down:
	$(PODMAN_COMPOSE) down

podman-logs:
	$(PODMAN_COMPOSE) logs -f

podman-re: podman-down podman-up

podman-clean: clean

podman-fclean:
	# Stop and remove compose resources for this project
	$(PODMAN_COMPOSE) down --rmi all --volumes --remove-orphans
	# Remove any dangling resources system-wide
	podman system prune -af --volumes
	# Extra safety: remove unused networks explicitly
	podman network prune -f
