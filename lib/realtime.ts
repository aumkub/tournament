import type { Env } from "../../types/bindings";

export async function broadcastToRoom(env: Env, slug: string, event: Record<string, unknown>): Promise<void> {
	const id = env.TOURNAMENT_ROOM.idFromName(slug);
	const stub = env.TOURNAMENT_ROOM.get(id);
	await stub.fetch("https://internal/broadcast", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(event),
	});
}
