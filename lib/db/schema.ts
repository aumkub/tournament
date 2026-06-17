import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const tournaments = sqliteTable("tournaments", {
	id: text("id")
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID()),
	name: text("name").notNull(),
	slug: text("slug").notNull().unique(),
	photo_url: text("photo_url"),
	competitor_url: text("competitor_url"),
	attendee_url: text("attendee_url"),
	competitor_title_en: text("competitor_title_en"),
	attendee_title_en: text("attendee_title_en"),
	competitor_form_id: text("competitor_form_id"),
	attendee_form_id: text("attendee_form_id"),
	registration_limit: integer("registration_limit"),
	competitor_limit: integer("competitor_limit"),
	attendee_limit: integer("attendee_limit"),
	registration_open_at: integer("registration_open_at", { mode: "timestamp" }).notNull(),
	registration_close_at: integer("registration_close_at", { mode: "timestamp" }).notNull(),
	checkin_open_at: integer("checkin_open_at", { mode: "timestamp" }).notNull(),
	checkin_close_at: integer("checkin_close_at", { mode: "timestamp" }).notNull(),
	email_template_html: text("email_template_html"),
	email_templates_json: text("email_templates_json").notNull().default("{}"),
	form_urls_json: text("form_urls_json").notNull().default("{}"),
	test_mode: integer("test_mode", { mode: "boolean" }).notNull().default(false),
	passwords_json: text("passwords_json").notNull().default("{}"),
	created_at: integer("created_at", { mode: "timestamp" })
		.notNull()
		.$defaultFn(() => new Date()),
	updated_at: integer("updated_at", { mode: "timestamp" })
		.notNull()
		.$defaultFn(() => new Date()),
	deleted_at: integer("deleted_at", { mode: "timestamp" }),
});

export const registrations = sqliteTable("registrations", {
	id: text("id")
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID()),
	tournament_id: text("tournament_id")
		.notNull()
		.references(() => tournaments.id),
	type: text("type").notNull(),
	email: text("email").notNull(),
	data_json: text("data_json").notNull(),
	qr_code_token: text("qr_code_token")
		.notNull()
		.unique()
		.$defaultFn(() => crypto.randomUUID()),
	checked_in: integer("checked_in", { mode: "boolean" }).default(false),
	checked_in_at: integer("checked_in_at", { mode: "timestamp" }),
	checked_in_by: text("checked_in_by"),
	submitted_at: integer("submitted_at", { mode: "timestamp" })
		.notNull()
		.$defaultFn(() => new Date()),
});
