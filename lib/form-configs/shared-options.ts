import type { FieldOption } from "../../types/form-config";

export const HEARD_FROM_OPTIONS: FieldOption[] = [
	{ value: "facebook", label: { th: "Facebook", en: "Facebook" } },
	{ value: "instagram", label: { th: "Instagram", en: "Instagram" } },
	{ value: "line", label: { th: "Line", en: "Line" } },
	{ value: "acquaintance", label: { th: "คนรู้จัก", en: "Acquaintance" } },
	{ value: "news", label: { th: "สื่อข่าวสาร", en: "News Media" } },
	{ value: "school", label: { th: "จากโรงเรียน", en: "From School" } },
	{ value: "coach", label: { th: "จากผู้ฝึกสอน", en: "From Coach" } },
	{ value: "golf_course", label: { th: "จากสนามซ้อมต่างๆ", en: "From Golf Courses" } },
	{ value: "youth_golf_club", label: { th: "สมาคม / ชมรมกอล์ฟเยาวชน", en: "Youth Golf Association / Club" } },
	{ value: "other", label: { th: "อื่นๆ ระบุ", en: "Other (Please specify)" } },
];
