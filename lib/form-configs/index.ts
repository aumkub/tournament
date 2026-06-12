import type { FormConfig } from "../../types/form-config";
import { attendeeDynamicConfig } from "./attendee-dynamic";
import { youthConfig } from "./youth";

// Registry: add new forms here — one line per form.
export const FORM_CONFIGS: Record<string, FormConfig> = {
	attendee: attendeeDynamicConfig,
	youth: youthConfig,
};

export function getFormConfig(id: string): FormConfig | undefined {
	return FORM_CONFIGS[id];
}

// Find a form config by its defaultUrlSlug
export function getFormConfigBySlug(slug: string): FormConfig | undefined {
	return Object.values(FORM_CONFIGS).find((c) => c.defaultUrlSlug === slug);
}
