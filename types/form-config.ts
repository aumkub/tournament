export type FieldType =
	| "text"
	| "email"
	| "tel"
	| "date"
	| "number"
	| "select"
	| "multiselect"
	| "radio"
	| "checkbox"
	| "file"
	| "textarea"
	| "url";

export type I18n = { th: string; en: string };

export type FieldOption = {
	value: string;
	label: I18n;
};

export type FieldConfig = {
	key: string;
	type: FieldType;
	label: I18n;
	required?: boolean;
	options?: FieldOption[];
	accept?: string;
	multiple?: boolean;
	placeholder?: I18n;
	note?: I18n;
	min?: number;
	max?: number;
	readOnly?: boolean;
};

export type StepCondition = {
	field: string;
	value: string;
	operator?: "eq" | "includes"; // default "eq"
};

export type StepConfig = {
	id: string;
	title: I18n;
	fields: FieldConfig[];
	showSummary?: boolean;
	condition?: StepCondition;
	conditions?: StepCondition[]; // AND logic — all must match
};

export type DataGroup = {
	id: string;
	label: I18n;
	keys: string[]; // field keys to show in this tab
};

export type FormConfig = {
	id: string;
	label: I18n;
	defaultUrlSlug: string;
	steps: StepConfig[];
	emailField: string;
	groups?: DataGroup[]; // for popup tab display
};
