import { FORM_CONFIGS } from "./form-configs/index";

export type TournamentLabelSource = {
	competitor_form_id?: string | null;
	attendee_form_id?: string | null;
	competitor_title?: string | null;
	attendee_title?: string | null;
	competitor_title_en?: string | null;
	attendee_title_en?: string | null;
};

export function resolveFormTypeLabel(
	tournament: TournamentLabelSource,
	formId: string,
	lang: "th" | "en" = "th",
): string {
	const cfg = FORM_CONFIGS[formId];
	const fallback = lang === "en" ? (cfg?.label.en || formId) : (cfg?.label.th || formId);

	if (formId === tournament.competitor_form_id) {
		const custom =
			lang === "en" ? tournament.competitor_title_en : tournament.competitor_title;
		if (custom?.trim()) return custom.trim();
		if (lang === "en" && tournament.competitor_title?.trim()) {
			return tournament.competitor_title.trim();
		}
	}

	if (formId === tournament.attendee_form_id) {
		const custom =
			lang === "en" ? tournament.attendee_title_en : tournament.attendee_title;
		if (custom?.trim()) return custom.trim();
		if (lang === "en" && tournament.attendee_title?.trim()) {
			return tournament.attendee_title.trim();
		}
	}

	return fallback;
}
