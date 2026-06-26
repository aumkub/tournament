/**
 * Inline SVG icons — zero emoji dependencies, consistent rendering everywhere.
 * All icons are 24×24 viewBox, stroke-based, currentColor.
 */
import React from "react";

type IconProps = {
	size?: number;
	color?: string;
	className?: string;
	style?: React.CSSProperties;
};

const defaults: IconProps = { size: 20, color: "currentColor" };

function svg(
	path: React.ReactNode,
	{ size = 20, color = "currentColor", className, style }: IconProps,
) {
	return (
		<svg
			width={size}
			height={size}
			viewBox="0 0 24 24"
			fill="none"
			stroke={color}
			strokeWidth={2}
			strokeLinecap="round"
			strokeLinejoin="round"
			className={className}
			style={{ display: "inline-block", verticalAlign: "middle", ...style }}
		>
			{path}
		</svg>
	);
}

// ─── Navigation / Arrows ─────────────────────────────

export function IconArrowLeft(p: IconProps) {
	return svg(
		<path d="M19 12H5M12 19l-7-7 7-7" />,
		{ ...defaults, ...p },
	);
}

export function IconArrowRight(p: IconProps) {
	return svg(
		<path d="M5 12h14M12 5l7 7-7 7" />,
		{ ...defaults, ...p },
	);
}

// ─── Auth / Security ─────────────────────────────────

export function IconLock(p: IconProps) {
	return svg(
		<>
			<rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
			<path d="M7 11V7a5 5 0 0 1 10 0v4" />
		</>,
		{ ...defaults, ...p },
	);
}

export function IconLogOut(p: IconProps) {
	return svg(
		<>
			<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
			<polyline points="16 17 21 12 16 7" />
			<line x1="21" y1="12" x2="9" y2="12" />
		</>,
		{ ...defaults, ...p },
	);
}

// ─── Status ───────────────────────────────────────────

export function IconCheck(p: IconProps) {
	return svg(
		<polyline points="20 6 9 17 4 12" />,
		{ ...defaults, ...p },
	);
}

export function IconCheckCircle(p: IconProps) {
	return svg(
		<>
			<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
			<polyline points="22 4 12 14.01 9 11.01" />
		</>,
		{ ...defaults, ...p },
	);
}

export function IconX(p: IconProps) {
	return svg(
		<>
			<line x1="18" y1="6" x2="6" y2="18" />
			<line x1="6" y1="6" x2="18" y2="18" />
		</>,
		{ ...defaults, ...p },
	);
}

export function IconAlertTriangle(p: IconProps) {
	return svg(
		<>
			<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
			<line x1="12" y1="9" x2="12" y2="13" />
			<line x1="12" y1="17" x2="12.01" y2="17" />
		</>,
		{ ...defaults, ...p },
	);
}

export function IconAlertCircle(p: IconProps) {
	return svg(
		<>
			<circle cx="12" cy="12" r="10" />
			<line x1="12" y1="8" x2="12" y2="12" />
			<line x1="12" y1="16" x2="12.01" y2="16" />
		</>,
		{ ...defaults, ...p },
	);
}

export function IconClock(p: IconProps) {
	return svg(
		<>
			<circle cx="12" cy="12" r="10" />
			<polyline points="12 6 12 12 16 14" />
		</>,
		{ ...defaults, ...p },
	);
}

// ─── Actions ──────────────────────────────────────────

export function IconCamera(p: IconProps) {
	return svg(
		<>
			<path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
			<circle cx="12" cy="13" r="4" />
		</>,
		{ ...defaults, ...p },
	);
}

export function IconSettings(p: IconProps) {
	return svg(
		<>
			<circle cx="12" cy="12" r="3" />
			<path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
		</>,
		{ ...defaults, ...p },
	);
}

export function IconDownload(p: IconProps) {
	return svg(
		<>
			<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
			<polyline points="7 10 12 15 17 10" />
			<line x1="12" y1="15" x2="12" y2="3" />
		</>,
		{ ...defaults, ...p },
	);
}

export function IconSave(p: IconProps) {
	return svg(
		<>
			<path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
			<polyline points="17 21 17 13 7 13 7 21" />
			<polyline points="7 3 7 8 15 8" />
		</>,
		{ ...defaults, ...p },
	);
}

export function IconPlus(p: IconProps) {
	return svg(
		<>
			<line x1="12" y1="5" x2="12" y2="19" />
			<line x1="5" y1="12" x2="19" y2="12" />
		</>,
		{ ...defaults, ...p },
	);
}

export function IconUpload(p: IconProps) {
	return svg(
		<>
			<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
			<polyline points="17 8 12 3 7 8" />
			<line x1="12" y1="3" x2="12" y2="15" />
		</>,
		{ ...defaults, ...p },
	);
}

// ─── Celebration ──────────────────────────────────────

export function IconPartyPopper(p: IconProps) {
	return svg(
		<>
			<path d="M5.8 11.3L2 22l10.7-3.79" />
			<path d="M4 3h.01" />
			<path d="M22 8h.01" />
			<path d="M15 2h.01" />
			<path d="M22 20h.01" />
			<path d="m22 2-2.24.75a2.9 2.9 0 0 0-1.96 3.12v0c.1.86-.57 1.63-1.45 1.63h-.38c-.86 0-1.6.6-1.76 1.44L14 10" />
			<path d="m22 13-.82-.33c-.86-.34-1.82.2-1.98 1.11v0c-.11.7-.72 1.22-1.43 1.22H17" />
			<path d="m11 2 .33.82c.34.86-.2 1.82-1.11 1.98v0C9.52 4.9 9 5.52 9 6.23V7" />
		</>,
		{ ...defaults, ...p },
	);
}

// ─── Misc ─────────────────────────────────────────────

export function IconDot(p: IconProps) {
	const { size = 20, color = "currentColor", className, style } = p;
	return (
		<svg
			width={size}
			height={size}
			viewBox="0 0 24 24"
			fill={color}
			className={className}
			style={{ display: "inline-block", verticalAlign: "middle", ...style }}
		>
			<circle cx="12" cy="12" r="6" />
		</svg>
	);
}

export function IconFile(p: IconProps) {
	return svg(
		<>
			<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
			<polyline points="14 2 14 8 20 8" />
		</>,
		{ ...defaults, ...p },
	);
}

export function IconCode(p: IconProps) {
	return svg(
		<>
			<polyline points="16 18 22 12 16 6" />
			<polyline points="8 6 2 12 8 18" />
		</>,
		{ ...defaults, ...p },
	);
}

export function IconEye(p: IconProps) {
	return svg(
		<>
			<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
			<circle cx="12" cy="12" r="3" />
		</>,
		{ ...defaults, ...p },
	);
}

// ─── Users / Roles ────────────────────────────────────

export function IconUser(p: IconProps) {
	return svg(
		<>
			<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
			<circle cx="12" cy="7" r="4" />
		</>,
		{ ...defaults, ...p },
	);
}

export function IconUsers(p: IconProps) {
	return svg(
		<>
			<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
			<circle cx="9" cy="7" r="4" />
			<path d="M23 21v-2a4 4 0 0 0-3-3.87" />
			<path d="M16 3.13a4 4 0 0 1 0 7.75" />
		</>,
		{ ...defaults, ...p },
	);
}

// ─── Feedback (replacing emoji) ───────────────────────

export function IconCheckCircleFilled(p: IconProps) {
	const { size = 20, color = "var(--color-success)", className, style } = p;
	return (
		<svg
			width={size}
			height={size}
			viewBox="0 0 24 24"
			fill={color}
			className={className}
			style={{ display: "inline-block", verticalAlign: "middle", ...style }}
		>
			<path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" fill={color} />
		</svg>
	);
}

export function IconWarningFilled(p: IconProps) {
	const { size = 20, color = "var(--color-warning)", className, style } = p;
	return (
		<svg
			width={size}
			height={size}
			viewBox="0 0 24 24"
			className={className}
			style={{ display: "inline-block", verticalAlign: "middle", ...style }}
		>
			<path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z" fill={color} />
		</svg>
	);
}

export function IconXCircleFilled(p: IconProps) {
	const { size = 20, color = "var(--color-error)", className, style } = p;
	return (
		<svg
			width={size}
			height={size}
			viewBox="0 0 24 24"
			className={className}
			style={{ display: "inline-block", verticalAlign: "middle", ...style }}
		>
			<path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" fill={color} />
			<path d="M11 7h2v6h-2zm0 8h2v2h-2z" fill="white" />
		</svg>
	);
}

export function IconSearch(p: IconProps) {
	return svg(
		<>
			<circle cx="11" cy="11" r="8" />
			<line x1="21" y1="21" x2="16.65" y2="16.65" />
		</>,
		{ ...defaults, ...p },
	);
}

export function IconFilter(p: IconProps) {
	return svg(
		<>
			<polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
		</>,
		{ ...defaults, ...p },
	);
}

export function IconQrCode(p: IconProps) {
	return svg(
		<>
			<rect x="2" y="2" width="8" height="8" rx="1" />
			<rect x="14" y="2" width="8" height="8" rx="1" />
			<rect x="2" y="14" width="8" height="8" rx="1" />
			<rect x="14" y="14" width="4" height="4" />
			<rect x="20" y="14" width="2" height="2" />
			<rect x="14" y="20" width="2" height="2" />
			<rect x="20" y="20" width="2" height="2" />
		</>,
		{ ...defaults, ...p },
	);
}

export function IconRotateCcw(p: IconProps) {
	return svg(
		<>
			<polyline points="1 4 1 10 7 10" />
			<path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
		</>,
		{ ...defaults, ...p },
	);
}

export function IconCalendar(p: IconProps) {
	return svg(
		<>
			<rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
			<line x1="16" y1="2" x2="16" y2="6" />
			<line x1="8" y1="2" x2="8" y2="6" />
			<line x1="3" y1="10" x2="21" y2="10" />
		</>,
		{ ...defaults, ...p },
	);
}

export function IconLink(p: IconProps) {
	return svg(
		<>
			<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
			<path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
		</>,
		{ ...defaults, ...p },
	);
}

export function IconKey(p: IconProps) {
	return svg(
		<>
			<path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
		</>,
		{ ...defaults, ...p },
	);
}

export function IconMail(p: IconProps) {
	return svg(
		<>
			<path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
			<polyline points="22,6 12,13 2,6" />
		</>,
		{ ...defaults, ...p },
	);
}

export function IconList(p: IconProps) {
	return svg(
		<>
			<line x1="8" y1="6" x2="21" y2="6" />
			<line x1="8" y1="12" x2="21" y2="12" />
			<line x1="8" y1="18" x2="21" y2="18" />
			<line x1="3" y1="6" x2="3.01" y2="6" />
			<line x1="3" y1="12" x2="3.01" y2="12" />
			<line x1="3" y1="18" x2="3.01" y2="18" />
		</>,
		{ ...defaults, ...p },
	);
}

export function IconMenu(p: IconProps) {
	return svg(
		<>
			<line x1="3" y1="12" x2="21" y2="12" />
			<line x1="3" y1="6" x2="21" y2="6" />
			<line x1="3" y1="18" x2="21" y2="18" />
		</>,
		{ ...defaults, ...p },
	);
}

export function IconTrash(p: IconProps) {
	return svg(
		<>
			<polyline points="3 6 5 6 21 6" />
			<path d="M19 6l-1 14H6L5 6" />
			<path d="M10 11v6M14 11v6" />
			<path d="M9 6V4h6v2" />
		</>,
		{ ...defaults, ...p },
	);
}

export function IconChevronRight(p: IconProps) {
	return svg(<polyline points="9 18 15 12 9 6" />, { ...defaults, ...p });
}

export function IconDashboard(p: IconProps) {
	return svg(
		<>
			<rect x="3" y="3" width="7" height="9" rx="1" />
			<rect x="14" y="3" width="7" height="5" rx="1" />
			<rect x="14" y="12" width="7" height="9" rx="1" />
			<rect x="3" y="16" width="7" height="5" rx="1" />
		</>,
		{ ...defaults, ...p },
	);
}

export function IconCheckIn(p: IconProps) {
	return svg(
		<>
			<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
			<circle cx="9" cy="7" r="4" />
			<polyline points="16 11 18 13 22 9" />
		</>,
		{ ...defaults, ...p },
	);
}

export function ImageIcon(p: IconProps) {
	return svg(
		<>
			<rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
			<circle cx="8.5" cy="8.5" r="1.5" />
			<polyline points="21 15 16 10 5 21" />
		</>,
		{ ...defaults, ...p },
	);
}

export function IconShield(p: IconProps) {
	return svg(
		<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />,
		{ ...defaults, ...p },
	);
}
