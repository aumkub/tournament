import Papa from "papaparse";
import type { Registration } from "../../types/registration";

export function registrationsToCSV(rows: Registration[]): string {
	const flatRows = rows.map((r) => {
		let data: Record<string, unknown> = {};
		try {
			data = JSON.parse(r.data_json);
		} catch {}

		return {
			id: r.id,
			type: r.type,
			full_name_th: data.full_name_th || "",
			full_name_en: data.full_name_en || "",
			nickname_th: data.nickname_th || "",
			gender: data.gender || "",
			age: data.age || "",
			school_or_org: (data as any).school || (data as any).organization || "",
			phone: data.phone || "",
			email: r.email,
			preferred_date: data.preferred_date || "",
			want_certificate: data.want_certificate ? "Yes" : "No",
			consent_personal_id: data.consent_personal_id ? "Yes" : "No",
			consent_contact_info: data.consent_contact_info ? "Yes" : "No",
			consent_photo_video: data.consent_photo_video ? "Yes" : "No",
			consent_third_party: data.consent_third_party ? "Yes" : "No",
			consent_international_transfer: data.consent_international_transfer ? "Yes" : "No",
			consent_data_retention: data.consent_data_retention ? "Yes" : "No",
			acknowledge_privacy_policy: data.acknowledge_privacy_policy ? "Yes" : "No",
			submitted_at: r.submitted_at
				? new Date(r.submitted_at).toISOString()
				: "",
			checked_in: r.checked_in ? "Yes" : "No",
			checked_in_at: r.checked_in_at
				? new Date(r.checked_in_at).toISOString()
				: "",
			checked_in_by: r.checked_in_by || "",
		};
	});

	return Papa.unparse(flatRows);
}
