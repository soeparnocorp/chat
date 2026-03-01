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
	const [name] = useState(names[Math.floor(Math.random() * names.length)]);
	const [messages, setMessages] = useState<ChatMessage[]>([]);
	const { room } = useParams();

	// ===============================
	// MOBILE VIEW STATE (ADDED)
	// ===============================
	const isMobile = window.innerWidth < 550;
	const [mobileView, setMobileView] = useState<"roster" | "chat">("roster");
	// ===============================

	const socket = usePartySocket({
		party: "chat",
		room,
		onMessage: (evt) => {
			const message = JSON.parse(evt.data as string) as Message;

			if (message.type === "add") {
				const foundIndex = messages.findIndex((m) => m.id === message.id);

				if (foundIndex === -1) {
					setMessages((messages) => [
						...messages,
						{
							id: message.id,
							content: message.content,
							user: message.user,
							role: message.role,
						},
					]);
				} else {
					setMessages((messages) => {
						return messages
							.slice(0, foundIndex)
							.concat({
								id: message.id,
								content: message.content,
								user: message.user,
								role: message.role,
							})
							.concat(messages.slice(foundIndex + 1));
					});
				}
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

	return (
		<div className="container" style={{ width: "95%", height: "100%" }}>
			<div className="row" style={{ height: "100%" }}>

				{/* ========================= */}
				{/* SIDEBAR / ROSTER */}
				{/* ========================= */}
				<div
					className="one-third column"
					style={{
						marginTop: "25%",
						display:
							isMobile && mobileView === "chat"
								? "none"
								: "block",
					}}
				>
					<h4><b>READT</b>alk</h4>
					<p>Roster / Account Search Area</p>

					<button
						className="button u-full-width"
						onClick={() => {
							if (isMobile) setMobileView("chat");
						}}
					>
						Open Chat
					</button>
				</div>

				{/* ========================= */}
				{/* CHAT AREA */}
				{/* ========================= */}
				<div
					className={isMobile ? "twelve columns" : "two-thirds column"}
					style={{
						display:
							isMobile && mobileView === "roster"
								? "none"
								: "block",
					}}
				>

					{/* MOBILE BACK BUTTON */}
					{isMobile && mobileView === "chat" && (
						<button
							className="button u-full-width"
							onClick={() => setMobileView("roster")}
						>
							← Back
						</button>
					)}

					<div className="chat container">
						{messages.map((message) => (
							<div key={message.id} className="row message">
								<div className="two columns user">
									{message.user}
								</div>
								<div className="ten columns">
									{message.content}
								</div>
							</div>
						))}

						<form
							className="row"
							onSubmit={(e) => {
								e.preventDefault();

								const content =
									e.currentTarget.elements.namedItem(
										"content",
									) as HTMLInputElement;

								const chatMessage: ChatMessage = {
									id: nanoid(8),
									content: content.value,
									user: name,
									role: "user",
								};

								setMessages((messages) => [
									...messages,
									chatMessage,
								]);

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
							<button
								type="submit"
								className="send-message two columns"
							>
								Send
							</button>
						</form>
					</div>

				</div>
			</div>
		</div>
	);
}

// ===============================
// ROUTER (UNCHANGED)
// ===============================
createRoot(document.getElementById("root")!).render(
	<BrowserRouter>
		<Routes>
			<Route path="/" element={<Navigate to={`/${nanoid()}`} />} />
			<Route path="/:room" element={<App />} />
			<Route path="*" element={<Navigate to="/" />} />
		</Routes>
	</BrowserRouter>,
);
