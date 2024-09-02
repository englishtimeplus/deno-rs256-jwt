dev:
	docker-compose up -d

dev-down:
	docker-compose down

server:
	deno run --allow-net --allow-read --allow-write --allow-env --unstable-worker-options src/server.ts