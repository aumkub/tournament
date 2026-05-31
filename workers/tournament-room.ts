// TournamentRoom Durable Object — real-time WebSocket broadcast for admin dashboards
export class TournamentRoom implements DurableObject {
	constructor(
		private state: DurableObjectState,
		private env: Env,
	) {}

	async fetch(request: Request): Promise<Response> {
		const url = new URL(request.url);

		// WebSocket upgrade — admin dashboard connects here
		if (request.headers.get("Upgrade") === "websocket") {
			const pair = new WebSocketPair();
			const client = pair[0];
			const server = pair[1];

			this.state.acceptWebSocket(server);

			return new Response(null, { status: 101, webSocket: client });
		}

		// Internal broadcast endpoint — called from Workers after check-in
		if (url.pathname === "/broadcast" && request.method === "POST") {
			try {
				const event = await request.json();
				const message = JSON.stringify(event);

				const sockets = this.state.getWebSockets();
				for (const ws of sockets) {
					try {
						ws.send(message);
					} catch {
						// Socket may have closed
					}
				}
				return new Response("ok", { status: 200 });
			} catch {
				return new Response("Invalid JSON", { status: 400 });
			}
		}

		return new Response("Not found", { status: 404 });
	}

	async alarm(): Promise<void> {
		// Optional: cleanup or periodic stats push
	}
}
