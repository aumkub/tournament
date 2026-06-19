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
	route("api/register/:slug/form", "routes/api/register-form.ts"),
	route("api/checkin/:slug", "routes/api/checkin.ts"),
	route("api/upload", "routes/api/upload.ts"),
	route("api/file", "routes/api/file.ts"),
	route("api/ws/:slug", "routes/api/ws.ts"),

	// Admin API routes
	route("api/admin/tournaments", "routes/api/admin/tournaments.ts"),
	route("api/admin/tournaments/:id/restore", "routes/api/admin/tournament-restore.ts"),
	route("api/admin/:slug/registrants", "routes/api/admin/registrants.ts"),
	route("api/admin/:slug/stats", "routes/api/admin/stats.ts"),
	route("api/admin/:slug/export", "routes/api/admin/export.ts"),
	route("api/admin/:slug/tournament", "routes/api/admin/tournament.ts"),
	route("api/admin/:slug/registrants/:id", "routes/api/admin/registrant-delete.ts"),
	route("api/admin/:slug/checkin-log", "routes/api/admin/checkin-log.ts"),
	route("api/admin/:slug/uncheckin", "routes/api/admin/uncheckin.ts"),
	route("api/admin/:slug/clear-registrations", "routes/api/admin/clear-registrations.ts"),
	route("api/admin/:slug/clear-checkins", "routes/api/admin/clear-checkins.ts"),
	route("api/admin/site-settings", "routes/api/admin/site-settings.ts"),

	// Admin pages
	route("portal", "routes/admin/index.tsx"),
	route("portal/site-settings", "routes/admin/site-settings.tsx"),
	route("portal/:slug", "routes/admin/dashboard.tsx"),
	route("portal/:slug/settings", "routes/admin/settings.tsx"),
	route("portal/:slug/checkin", "routes/admin/checkin.tsx"),
] satisfies RouteConfig;
