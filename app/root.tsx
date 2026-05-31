import {
	isRouteErrorResponse,
	Links,
	Meta,
	Outlet,
	Scripts,
	ScrollRestoration,
	useRouteLoaderData,
} from "react-router";

import type { Route } from "./+types/root";
import "./app.css";
import { parseCookie, verifySession } from "../lib/kv-session";
import { Header } from "../components/ui/header";

export const id = "root";

export const links: Route.LinksFunction = () => [
	{ rel: "preconnect", href: "https://fonts.googleapis.com" },
	{
		rel: "preconnect",
		href: "https://fonts.gstatic.com",
		crossOrigin: "anonymous",
	},
	{
		rel: "stylesheet",
		href: "https://fonts.googleapis.com/css2?family=Google+Sans:wght@400;500;600;700&family=Google+Sans+Text:wght@400;500;600;700&display=swap",
	},
];

export async function loader({ request, context }: Route.LoaderArgs) {
	const env = context.cloudflare.env;
	const token = parseCookie(request.headers.get("Cookie"));
	let authenticated = false;

	if (token) {
		const session = await verifySession(env.SESSIONS, token);
		authenticated = !!session;
	}

	return { authenticated };
}

export function Layout({ children }: { children: React.ReactNode }) {
	return (
		<html lang="th">
			<head>
				<meta charSet="utf-8" />
				<meta name="viewport" content="width=device-width, initial-scale=1" />
				<Meta />
				<Links />
			</head>
			<body style={{ margin: 0, minHeight: "100vh", display: "flex", flexDirection: "column" }}>
				<Header />
				<div style={{ flex: 1 }}>
					{children}
				</div>
				<ScrollRestoration />
				<Scripts />
			</body>
		</html>
	);
}

export default function App() {
	return <Outlet />;
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
	let message = "Oops!";
	let details = "An unexpected error occurred.";
	let stack: string | undefined;

	if (isRouteErrorResponse(error)) {
		message = error.status === 404 ? "404" : "Error";
		details =
			error.status === 404
				? "The requested page could not be found."
				: error.statusText || details;
	} else if (import.meta.env.DEV && error && error instanceof Error) {
		details = error.message;
		stack = error.stack;
	}

	return (
		<main style={{ padding: "var(--spacing-section) var(--spacing-lg)", maxWidth: 640, margin: "0 auto", textAlign: "center" }}>
			<h1 style={{ fontSize: 48, fontFamily: "var(--font-serif)" }}>{message}</h1>
			<p style={{ color: "var(--color-body)", fontSize: 16 }}>{details}</p>
			<a href="/" className="btn btn-primary" style={{ textDecoration: "none", marginTop: "var(--spacing-lg)", display: "inline-block", lineHeight: "40px" }}>
				กลับหน้าหลัก
			</a>
			{stack && (
				<pre
					style={{
						width: "100%",
						padding: "var(--spacing-md)",
						overflowX: "auto",
						marginTop: "var(--spacing-lg)",
						fontSize: 12,
						textAlign: "left",
						background: "var(--color-surface-soft)",
						borderRadius: "var(--radius-md)",
					}}
				>
					<code>{stack}</code>
				</pre>
			)}
		</main>
	);
}
