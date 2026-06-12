import Papa from "papaparse";
import type { Registration } from "../../types/registration";
import type { FormConfig, FieldConfig } from "../../types/form-config";

// System columns always present
const SYSTEM_HEADERS: Record<string, string> = {
	id: "รหัส",
	type: "ประเภท",
	email: "อีเมล",
	submitted_at: "วันที่สมัคร",
	checked_in: "เช็คอิน",
	checked_in_at: "เวลาเช็คอิน",
	checked_in_by: "เช็คอินโดย",
};

function fieldValue(field: FieldConfig, val: unknown): string {
	if (val === undefined || val === null || val === "") return "";
	if (field.type === "checkbox") return val ? "Yes" : "No";
	if (field.type === "multiselect" && Array.isArray(val)) return val.join(", ");
	if (field.type === "file") {
		if (Array.isArray(val)) return val.join(", ");
		return String(val);
	}
	return String(val);
}

/**
 * Build CSV from registrations, driven by form configs.
 * typeToConfig: maps registration.type → FormConfig (may be undefined for legacy types)
 * typeLabels: maps registration.type → display label
 */
export function registrationsToCSV(
	rows: Registration[],
	typeToConfig?: Record<string, FormConfig>,
	typeLabels?: Record<string, string>,
): string {
	// Collect all fields across all relevant configs (preserve order, dedupe by key)
	const allFields: FieldConfig[] = [];
	const seenKeys = new Set<string>();
	if (typeToConfig) {
		for (const cfg of Object.values(typeToConfig)) {
			if (!cfg) continue;
			for (const step of cfg.steps) {
				for (const field of step.fields) {
					if (!seenKeys.has(field.key)) {
						seenKeys.add(field.key);
						allFields.push(field);
					}
				}
			}
		}
	}

	// Build header row: system cols + form fields
	const headers: Record<string, string> = { ...SYSTEM_HEADERS };
	for (const field of allFields) {
		headers[field.key] = field.label.th || field.key;
	}

	const flatRows = rows.map((r) => {
		let data: Record<string, unknown> = {};
		try { data = JSON.parse(r.data_json as string); } catch {}

		const row: Record<string, string> = {
			id: r.id || "",
			type: (typeLabels?.[r.type as string] ?? r.type) || "",
			email: r.email || "",
			submitted_at: r.submitted_at ? new Date(r.submitted_at as number).toLocaleString("th-TH", { timeZone: "Asia/Bangkok" }) : "",
			checked_in: r.checked_in ? "Yes" : "No",
			checked_in_at: r.checked_in_at ? new Date(r.checked_in_at as number).toLocaleString("th-TH", { timeZone: "Asia/Bangkok" }) : "",
			checked_in_by: (r.checked_in_by as string) || "",
		};

		// Fill form fields — use config if available, else raw string
		for (const field of allFields) {
			const val = data[field.key];
			row[field.key] = fieldValue(field, val);
		}

		// If no config for this type, dump remaining data_json keys not yet covered
		if (!typeToConfig?.[r.type as string]) {
			for (const [k, v] of Object.entries(data)) {
				if (!seenKeys.has(k)) {
					row[k] = Array.isArray(v) ? v.join(", ") : v ? String(v) : "";
				}
			}
		}

		return row;
	});

	// Use column label map for header names
	return Papa.unparse(flatRows, {
		columns: Object.keys(headers),
		// Rename header keys to Thai labels via transform
	});
}

/**
 * Same as above but returns with Thai column headers as first row.
 */
export function registrationsToCSVWithHeaders(
	rows: Registration[],
	typeToConfig?: Record<string, FormConfig>,
	typeLabels?: Record<string, string>,
): string {
	const allFields: FieldConfig[] = [];
	const seenKeys = new Set<string>();
	if (typeToConfig) {
		for (const cfg of Object.values(typeToConfig)) {
			if (!cfg) continue;
			for (const step of cfg.steps) {
				for (const field of step.fields) {
					if (!seenKeys.has(field.key)) {
						seenKeys.add(field.key);
						allFields.push(field);
					}
				}
			}
		}
	}

	// Determine all column keys (system + form fields)
	const colKeys = [...Object.keys(SYSTEM_HEADERS), ...allFields.map((f) => f.key)];
	const colLabels = [
		...Object.values(SYSTEM_HEADERS),
		...allFields.map((f) => f.label.th || f.key),
	];

	const flatRows = rows.map((r) => {
		let data: Record<string, unknown> = {};
		try { data = JSON.parse(r.data_json as string); } catch {}

		const row: Record<string, string> = {
			id: r.id || "",
			type: (typeLabels?.[r.type as string] ?? r.type) || "",
			email: r.email || "",
			submitted_at: r.submitted_at ? new Date(r.submitted_at as number).toLocaleString("th-TH", { timeZone: "Asia/Bangkok" }) : "",
			checked_in: r.checked_in ? "Yes" : "No",
			checked_in_at: r.checked_in_at ? new Date(r.checked_in_at as number).toLocaleString("th-TH", { timeZone: "Asia/Bangkok" }) : "",
			checked_in_by: (r.checked_in_by as string) || "",
		};

		for (const field of allFields) {
			row[field.key] = fieldValue(field, data[field.key]);
		}

		return colKeys.map((k) => row[k] ?? "");
	});

	// Build CSV manually: Thai labels as header, then data rows
	const allRows = [colLabels, ...flatRows];
	return Papa.unparse(allRows, { header: false });
}
