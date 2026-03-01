import { createRoot } from "react-dom/client";
import { usePartySocket } from "partysocket/react";
import React, { useState } from "react";
import {
	BrowserRouter,
	Routes,
	Route,
	Navigate,
	useParams,
} from "react-router";
import { nanoid } from "nanoid";

import { names, type ChatMessage, type Message } from "../shared";

function App() {
	const isMobile = window.innerWidth < 550;

	const [name] = useState(names[Math.floor(Math.random() * names.length)]);
	const [messages, setMessages] = useState<ChatMessage[]>([]);
	const { room } = useParams();

	const socket = usePartySocket({
		party: "chat",
		room,
		onMessage: (evt) => {
			const message = JSON.parse(evt.data as string) as Message;

			if (message.type === "add") {
				setMessages((messages) => {
					const foundIndex = messages.findIndex((m) => m.id === message.id);
					if (foundIndex === -1) {
						return [
							...messages,
							{
								id: message.id,
								content: message.content,
								user: message.user,
								role: message.role,
							},
						];
					} else {
						return messages
							.slice(0, foundIndex)
							.concat({
								id: message.id,
								content: message.content,
								user: message.user,
								role: message.role,
							})
							.concat(messages.slice(foundIndex + 1));
					}
				});
			} else if (message.type === "update") {
				setMessages((messages) =>
					messages.map((m) =>
						m.id === message.id
							? {
									id: message.id,
									content: message.content,
									user: message.user,
									role: message.role,
								}
							: m,
					),
				);
			} else {
				setMessages(message.messages);
			}
		},
	});

	// ============================
	// MOBILE → SIDEBAR ONLY
	// ============================
	if (isMobile) {
		return (
			<div className="container">
				<div className="row">
					<div className="twelve columns">
						<h1>READTalk</h1>
						<p>
							sidebar area for Session ID account list auto by Email at
							here !
						</p>
					</div>
				</div>
			</div>
		);
	}

	// ============================
	// DESKTOP → NORMAL TEMPLATE
	// ============================
	return (
		<div className="container">
			<div className="row">
				{/* SIDEBAR */}
				<div className="three columns">
					<h1>READTalk</h1>
					<p>
						sidebar area for Session ID account list auto by Email at
						here !
					</p>
				</div>

				{/* CHAT AREA */}
				<div className="nine columns">
					<div className="chat">
						{messages.map((message) => (
							<div key={message.id} className="row message">
								<div className="two columns user">{message.user}</div>
								<div className="ten columns">{message.content}</div>
							</div>
						))}

						<form
							className="row"
							onSubmit={(e) => {
								e.preventDefault();
								const content = e.currentTarget.elements.namedItem(
									"content",
								) as HTMLInputElement;

								const chatMessage: ChatMessage = {
									id: nanoid(8),
									content: content.value,
									user: name,
									role: "user",
								};

								setMessages((messages) => [...messages, chatMessage]);

								socket.send(
									JSON.stringify({
										type: "add",
										...chatMessage,
									} satisfies Message),
								);

								content.value = "";
							}}
						>
							<input
								type="text"
								name="content"
								className="ten columns my-input-text"
								placeholder={`Hello ${name}! Type a message...`}
								autoComplete="off"
							/>
							<button type="submit" className="two columns">
								Send
							</button>
						</form>
					</div>
				</div>
			</div>
		</div>
	);
}

// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
createRoot(document.getElementById("root")!).render(
	<BrowserRouter>
		<Routes>
			<Route path="/" element={<Navigate to={`/${nanoid()}`} />} />
			<Route path="/:room" element={<App />} />
			<Route path="*" element={<Navigate to="/" />} />
		</Routes>
	</BrowserRouter>,
);
