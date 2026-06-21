export type HeaderMode = "text" | "image";

export type SiteSettings = {
	headerMode: HeaderMode;
	headerBrand: string;
	headerLogoLetter: string;
	headerImageKey: string | null;
	headerImageUrl: string | null;
	homeTitle: string;
	homeDescription: string;
	footerLine1: string;
	footerLine2: string;
	metaTitle: string;
	metaDescription: string;
	turnstileSiteKey: string | null;
	turnstileSecretKey: string | null;
	superAdminPasswordHash: string | null;
};

export const DEFAULT_SITE_SETTINGS: SiteSettings = {
	headerMode: "text",
	headerBrand: "all Thailand",
	headerLogoLetter: "T",
	headerImageKey: null,
	headerImageUrl: null,
	homeTitle: "Registration System",
	homeDescription:
		"ระบบลงทะเบียนและเช็คอินสำหรับงานแข่งขัน\nลงทะเบียน → รับ QR Code → เช็คอินวันงาน",
	footerLine1: "all Thailand Registration & Check-in System",
	footerLine2: "Built with Cloudflare Workers • React Router 7",
	metaTitle: "all Thailand Registration System",
	metaDescription: "ระบบลงทะเบียนและเช็คอินสำหรับงานแข่งขัน",
	turnstileSiteKey: null,
	turnstileSecretKey: null,
	superAdminPasswordHash: null,
};

type SiteSettingsRow = {
	header_mode: string;
	header_brand: string;
	header_logo_letter: string;
	header_image_key: string | null;
	home_title: string;
	home_description: string;
	footer_line1: string;
	footer_line2: string;
	meta_title: string;
	meta_description: string;
	turnstile_site_key: string | null;
	turnstile_secret_key: string | null;
	super_admin_password_hash: string | null;
};

function headerImageUrl(key: string | null): string | null {
	if (!key) return null;
	return `/api/file?key=${encodeURIComponent(key)}`;
}

function rowToSettings(row: SiteSettingsRow): SiteSettings {
	const headerMode = row.header_mode === "image" ? "image" : "text";
	const headerImageKey = row.header_image_key || null;
	return {
		headerMode,
		headerBrand: row.header_brand,
		headerLogoLetter: row.header_logo_letter,
		headerImageKey,
		headerImageUrl: headerImageUrl(headerImageKey),
		homeTitle: row.home_title,
		homeDescription: row.home_description,
		footerLine1: row.footer_line1,
		footerLine2: row.footer_line2,
		metaTitle: row.meta_title,
		metaDescription: row.meta_description,
		turnstileSiteKey: row.turnstile_site_key || null,
		turnstileSecretKey: row.turnstile_secret_key || null,
		superAdminPasswordHash: row.super_admin_password_hash || null,
	};
}

export async function getSiteSettings(db: D1Database): Promise<SiteSettings> {
	const row = await db
		.prepare(
			"SELECT header_mode, header_brand, header_logo_letter, header_image_key, home_title, home_description, footer_line1, footer_line2, meta_title, meta_description, turnstile_site_key, turnstile_secret_key, super_admin_password_hash FROM site_settings WHERE id = 'default'",
		)
		.first<SiteSettingsRow>();

	if (!row) return DEFAULT_SITE_SETTINGS;
	return rowToSettings(row);
}

export async function updateSiteSettings(
	db: D1Database,
	settings: SiteSettings,
): Promise<void> {
	await db
		.prepare(
			`UPDATE site_settings SET
				header_mode = ?,
				header_brand = ?,
				header_logo_letter = ?,
				header_image_key = ?,
				home_title = ?,
				home_description = ?,
				footer_line1 = ?,
				footer_line2 = ?,
				meta_title = ?,
				meta_description = ?,
				turnstile_site_key = ?,
				turnstile_secret_key = ?,
				super_admin_password_hash = ?,
				updated_at = unixepoch()
			WHERE id = 'default'`,
		)
		.bind(
			settings.headerMode === "image" ? "image" : "text",
			settings.headerBrand.trim() || DEFAULT_SITE_SETTINGS.headerBrand,
			settings.headerLogoLetter.trim().slice(0, 2) || DEFAULT_SITE_SETTINGS.headerLogoLetter,
			settings.headerImageKey,
			settings.homeTitle.trim() || DEFAULT_SITE_SETTINGS.homeTitle,
			settings.homeDescription.trim() || DEFAULT_SITE_SETTINGS.homeDescription,
			settings.footerLine1.trim() || DEFAULT_SITE_SETTINGS.footerLine1,
			settings.footerLine2.trim(),
			settings.metaTitle.trim() || DEFAULT_SITE_SETTINGS.metaTitle,
			settings.metaDescription.trim() || DEFAULT_SITE_SETTINGS.metaDescription,
			settings.turnstileSiteKey?.trim() || null,
			settings.turnstileSecretKey?.trim() || null,
			settings.superAdminPasswordHash || null,
		)
		.run();
}
