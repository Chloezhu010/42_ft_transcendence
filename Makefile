

up:
	podman compose up --build -d

down:
	podman compose down

re: down up

clean:
	rm -rf backend/__pycache__
	rm -rf backend/**/__pycache__
	rm -rf backend/.ruff_cache
	rm -rf backend/.pytest_cache


fclean:
	# Stop and remove compose resources for this project
	podman compose down --rmi all --volumes --remove-orphans
	# Remove any dangling resources system-wide
	podman system prune -af --volumes
	# Extra safety: remove unused networks explicitly
	podman network prune -f
