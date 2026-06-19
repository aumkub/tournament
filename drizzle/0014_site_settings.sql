CREATE TABLE IF NOT EXISTS site_settings (
	id TEXT PRIMARY KEY DEFAULT 'default',
	header_brand TEXT NOT NULL DEFAULT 'all Thailand',
	header_logo_letter TEXT NOT NULL DEFAULT 'T',
	home_title TEXT NOT NULL DEFAULT 'Registration System',
	home_description TEXT NOT NULL DEFAULT 'ระบบลงทะเบียนและเช็คอินสำหรับงานแข่งขัน
ลงทะเบียน → รับ QR Code → เช็คอินวันงาน',
	footer_line1 TEXT NOT NULL DEFAULT 'all Thailand Registration & Check-in System',
	footer_line2 TEXT NOT NULL DEFAULT 'Built with Cloudflare Workers • React Router 7',
	meta_title TEXT NOT NULL DEFAULT 'all Thailand Registration System',
	meta_description TEXT NOT NULL DEFAULT 'ระบบลงทะเบียนและเช็คอินสำหรับงานแข่งขัน',
	updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

INSERT OR IGNORE INTO site_settings (id) VALUES ('default');
