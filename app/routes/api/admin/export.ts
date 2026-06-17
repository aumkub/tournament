import type { Route } from "./+types/api/admin/export";
import { parseCookie, verifySession, hasRole } from "../../../../lib/kv-session";
import { registrationsToCSVWithHeaders } from "../../../../lib/csv";
import { FORM_CONFIGS } from "../../../../lib/form-configs/index";
import type { FormConfig } from "../../../../types/form-config";

export async function loader({ request, params, context }: Route.LoaderArgs) {
	const env = context.cloudflare.env;
	const token = parseCookie(request.headers.get("Cookie"));
	const session = await verifySession(env.SESSIONS, token || "");
	if (!session || !hasRole(session, "super_admin")) {
		return Response.json({ error: "Unauthorized" }, { status: 401 });
	}

	const slug = params.slug;

	// Load tournament for form config mapping
	const tournament = await env.DB.prepare(
		"SELECT id, name, competitor_form_id, attendee_form_id, competitor_title, attendee_title, form_urls_json FROM tournaments WHERE slug = ? AND deleted_at IS NULL",
	)
		.bind(slug)
		.first();

	if (!tournament) {
		return Response.json({ error: "Not found" }, { status: 404 });
	}

	// Build typeToConfig + typeLabels maps
	const typeToConfig: Record<string, FormConfig> = {};
	const typeLabels: Record<string, string> = {};

	// Dynamic forms via form_urls_json (maps formId → urlSlug)
	let formUrls: Record<string, string> = {};
	try { formUrls = JSON.parse((tournament.form_urls_json as string) || "{}"); } catch {}
	for (const formId of Object.keys(formUrls)) {
		const cfg = FORM_CONFIGS[formId];
		if (cfg) {
			typeToConfig[formId] = cfg;
			typeLabels[formId] = cfg.label.th;
		}
	}

	// Legacy competitor/attendee with dynamic form overrides
	if (tournament.competitor_form_id) {
		const cfg = FORM_CONFIGS[tournament.competitor_form_id as string];
		if (cfg) {
			typeToConfig["competitor"] = cfg;
		}
	}
	if (tournament.attendee_form_id) {
		const cfg = FORM_CONFIGS[tournament.attendee_form_id as string];
		if (cfg) {
			typeToConfig["attendee"] = cfg;
		}
	}

	// Legacy labels
	typeLabels["competitor"] = (tournament.competitor_title as string) || "ผู้เข้าแข่งขัน";
	typeLabels["attendee"] = (tournament.attendee_title as string) || "ผู้เข้าร่วมงาน";

	// Fetch all registrations
	const results = await env.DB.prepare(
		`SELECT r.* FROM registrations r JOIN tournaments t ON r.tournament_id = t.id WHERE t.slug = ? AND t.deleted_at IS NULL ORDER BY r.submitted_at DESC`,
	)
		.bind(slug)
		.all();

	const csv = registrationsToCSVWithHeaders(
		results.results as any[],
		typeToConfig,
		typeLabels,
	);

	const date = new Date().toISOString().split("T")[0];

	return new Response(csv, {
		status: 200,
		headers: {
			"Content-Type": "text/csv; charset=utf-8-sig", // BOM for Excel Thai charset
			"Content-Disposition": `attachment; filename="${slug}-registrants-${date}.csv"`,
		},
	});
}
