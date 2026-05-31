export type TournamentPasswords = {
	assistant: string; // bcrypt hash
	admin: string; // bcrypt hash
	super_admin: string; // bcrypt hash
};

export type Tournament = {
	id: string;
	name: string;
	slug: string;
	photo_url: string | null;
	registration_limit: number | null;
	registration_open_at: number; // Unix epoch ms
	registration_close_at: number;
	checkin_open_at: number;
	checkin_close_at: number;
	email_template_html: string | null;
	passwords: TournamentPasswords;
	created_at: number;
	updated_at: number;
};

export type TournamentRow = {
	id: string;
	name: string;
	slug: string;
	photo_url: string | null;
	registration_limit: number | null;
	registration_open_at: number;
	registration_close_at: number;
	checkin_open_at: number;
	checkin_close_at: number;
	email_template_html: string | null;
	passwords_json: string;
	created_at: number;
	updated_at: number;
};
