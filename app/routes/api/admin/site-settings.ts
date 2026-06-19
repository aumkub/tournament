import type { Route } from "./+types/api/admin/site-settings";
import { parseCookie, verifySession, hasRole } from "../../../../lib/kv-session";
import {
	getSiteSettings,
	updateSiteSettings,
	type SiteSettings,
	type HeaderMode,
} from "../../../../lib/site-settings";

function parseHeaderMode(value: FormDataEntryValue | null | undefined): HeaderMode {
	return value === "image" ? "image" : "text";
}

function mergeSettings(
	current: SiteSettings,
	partial: Partial<SiteSettings>,
): SiteSettings {
	return {
		headerMode: partial.headerMode ?? current.headerMode,
		headerBrand: partial.headerBrand ?? current.headerBrand,
		headerLogoLetter: partial.headerLogoLetter ?? current.headerLogoLetter,
		headerImageKey: partial.headerImageKey !== undefined ? partial.headerImageKey : current.headerImageKey,
		headerImageUrl: null,
		homeTitle: partial.homeTitle ?? current.homeTitle,
		homeDescription: partial.homeDescription ?? current.homeDescription,
		footerLine1: partial.footerLine1 ?? current.footerLine1,
		footerLine2: partial.footerLine2 ?? current.footerLine2,
		metaTitle: partial.metaTitle ?? current.metaTitle,
		metaDescription: partial.metaDescription ?? current.metaDescription,
	};
}

async function saveSettings(env: Env, settings: SiteSettings) {
	await updateSiteSettings(env.DB, settings);
	const saved = await getSiteSettings(env.DB);
	return Response.json({ ok: true, settings: saved });
}

export async function loader({ request, context }: Route.LoaderArgs) {
	const env = context.cloudflare.env;
	const token = parseCookie(request.headers.get("Cookie"));
	const session = await verifySession(env.SESSIONS, token || "");
	if (!session || !hasRole(session, "super_admin")) {
		return Response.json({ error: "Unauthorized" }, { status: 401 });
	}

	const settings = await getSiteSettings(env.DB);
	return Response.json(settings);
}

export async function action({ request, context }: Route.ActionArgs) {
	const env = context.cloudflare.env;
	const token = parseCookie(request.headers.get("Cookie"));
	const session = await verifySession(env.SESSIONS, token || "");
	if (!session || !hasRole(session, "super_admin")) {
		return Response.json({ error: "Unauthorized" }, { status: 401 });
	}

	if (request.method !== "PUT") {
		return Response.json({ error: "Method not allowed" }, { status: 405 });
	}

	const current = await getSiteSettings(env.DB);
	const contentType = request.headers.get("Content-Type") || "";

	if (contentType.includes("multipart/form-data")) {
		const formData = await request.formData();
		const file = formData.get("header_image") as File | null;
		const removeHeaderImage = formData.get("remove_header_image") === "1";

		let headerImageKey = current.headerImageKey;
		if (removeHeaderImage) {
			headerImageKey = null;
		}

		if (file && file.size > 0) {
			if (file.size > 2 * 1024 * 1024) {
				return Response.json({ error: "โลโก้ต้องไม่เกิน 2MB" }, { status: 400 });
			}
			if (!file.type.startsWith("image/")) {
				return Response.json({ error: "อัปโหลดได้เฉพาะไฟล์รูปภาพ" }, { status: 400 });
			}
			const ext = file.name.split(".").pop()?.toLowerCase() || "png";
			const key = `site/header/logo-${Date.now()}.${ext.replace(/[^a-z0-9]/g, "")}`;
			await env.BUCKET.put(key, file.stream(), {
				httpMetadata: { contentType: file.type || "image/png" },
			});
			headerImageKey = key;
		}

		const headerMode = parseHeaderMode(formData.get("header_mode"));
		if (headerMode === "image" && !headerImageKey) {
			return Response.json({ error: "กรุณาอัปโหลดรูปโลโก้สำหรับโหมดรูปภาพ" }, { status: 400 });
		}

		const settings = mergeSettings(current, {
			headerMode,
			headerBrand: (formData.get("header_brand") as string) ?? current.headerBrand,
			headerLogoLetter: (formData.get("header_logo_letter") as string) ?? current.headerLogoLetter,
			headerImageKey,
			homeTitle: (formData.get("home_title") as string) ?? current.homeTitle,
			homeDescription: (formData.get("home_description") as string) ?? current.homeDescription,
			footerLine1: (formData.get("footer_line1") as string) ?? current.footerLine1,
			footerLine2: (formData.get("footer_line2") as string) ?? current.footerLine2,
			metaTitle: (formData.get("meta_title") as string) ?? current.metaTitle,
			metaDescription: (formData.get("meta_description") as string) ?? current.metaDescription,
		});

		return saveSettings(env, settings);
	}

	const body = (await request.json()) as Partial<SiteSettings>;
	const settings = mergeSettings(current, body);
	if (settings.headerMode === "image" && !settings.headerImageKey) {
		return Response.json({ error: "กรุณาอัปโหลดรูปโลโก้สำหรับโหมดรูปภาพ" }, { status: 400 });
	}
	return saveSettings(env, settings);
}
