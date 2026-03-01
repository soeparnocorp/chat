// /src/server/index.ts
import {
	type Connection,
	Server,
	type WSMessage,
	routePartykitRequest,
} from "partyserver";

import type { ChatMessage, Message } from "../shared";

export class Chat extends Server<Env> {
	static options = { hibernate: true };

	messages = [] as ChatMessage[];

	broadcastMessage(message: Message, exclude?: string[]) {
		this.broadcast(JSON.stringify(message), exclude);
	}

	onStart() {
		// create the messages table if it doesn't exist
		this.ctx.storage.sql.exec(
			`CREATE TABLE IF NOT EXISTS messages (id TEXT PRIMARY KEY, user TEXT, role TEXT, content TEXT)`,
		);

		// load previous messages from the database
		this.messages = this.ctx.storage.sql
			.exec(`SELECT * FROM messages`)
			.toArray() as ChatMessage[];
	}

	onConnect(connection: Connection) {
		connection.send(
			JSON.stringify({
				type: "all",
				messages: this.messages,
			} satisfies Message),
		);
	}

	saveMessage(message: ChatMessage) {
		const existingMessage = this.messages.find((m) => m.id === message.id);
		if (existingMessage) {
			this.messages = this.messages.map((m) => (m.id === message.id ? message : m));
		} else {
			this.messages.push(message);
		}

		this.ctx.storage.sql.exec(
			`INSERT INTO messages (id, user, role, content) VALUES ('${
				message.id
			}', '${message.user}', '${message.role}', ${JSON.stringify(
				message.content,
			)}) ON CONFLICT (id) DO UPDATE SET content = ${JSON.stringify(message.content)}`,
		);
	}

	onMessage(connection: Connection, message: WSMessage) {
		this.broadcast(message);

		const parsed = JSON.parse(message as string) as Message;
		if (parsed.type === "add" || parsed.type === "update") {
			this.saveMessage(parsed);
		}
	}
}

export default {
	async fetch(request, env) {
		const url = new URL(request.url);

		// =========================
		// OpenAuth fetch identity
		// =========================
		if (url.pathname === "/auth") {
			try {
				const authResponse = await fetch(
					"https://openauth.soeparnocorp.workers.dev/password/authorize",
					{
						headers: {
							// bawa cookie session user
							Cookie: request.headers.get("Cookie") || "",
						},
					},
				);

				if (!authResponse.ok) {
					return new Response(
						JSON.stringify({ error: "Failed to fetch identity" }),
						{ status: 500, headers: { "Content-Type": "application/json" } },
					);
				}

				const identity = await authResponse.json();
				return new Response(JSON.stringify(identity), {
					headers: { "Content-Type": "application/json" },
				});
			} catch (err) {
				return new Response(
					JSON.stringify({ error: "OpenAuth fetch error" }),
					{ status: 500, headers: { "Content-Type": "application/json" } },
				);
			}
		}

		// =========================
		// Default PartyKit handling
		// =========================
		return (
			(await routePartykitRequest(request, { ...env })) ||
			env.ASSETS.fetch(request)
		);
	},
} satisfies ExportedHandler<Env>;
