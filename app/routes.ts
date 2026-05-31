import {
	type RouteConfig,
	index,
	route,
} from "@react-router/dev/routes";

export default [
	index("routes/home.tsx"),

	// Public registration — dynamic route handles any URL suffix
	route(":slug/register/:type", "routes/register/register.tsx"),
	route(":slug/register/success", "routes/register/success.tsx"),

	// API routes
	route("api/auth/:slug", "routes/api/auth.ts"),
	route("api/auth/logout", "routes/api/logout.ts"),
	route("api/register/:slug/competitor", "routes/api/register-competitor.ts"),
	route("api/register/:slug/attendee", "routes/api/register-attendee.ts"),
	route("api/checkin/:slug", "routes/api/checkin.ts"),
	route("api/upload", "routes/api/upload.ts"),
	route("api/file", "routes/api/file.ts"),
	route("api/ws/:slug", "routes/api/ws.ts"),

	// Admin API routes
	route("api/admin/tournaments", "routes/api/admin/tournaments.ts"),
	route("api/admin/:slug/registrants", "routes/api/admin/registrants.ts"),
	route("api/admin/:slug/stats", "routes/api/admin/stats.ts"),
	route("api/admin/:slug/export", "routes/api/admin/export.ts"),
	route("api/admin/:slug/tournament", "routes/api/admin/tournament.ts"),

	// Admin pages
	route("admin", "routes/admin/index.tsx"),
	route("admin/:slug", "routes/admin/dashboard.tsx"),
	route("admin/:slug/settings", "routes/admin/settings.tsx"),
	route("admin/:slug/checkin", "routes/admin/checkin.tsx"),
] satisfies RouteConfig;
