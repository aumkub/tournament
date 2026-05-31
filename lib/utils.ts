/**
 * Utility functions — DESIGN.md design system
 */

export function nowEpoch(): number {
	return Date.now();
}

export function isRegistrationOpen(
	openAt: number,
	closeAt: number,
): boolean {
	const now = nowEpoch();
	return now >= openAt && now <= closeAt;
}

export function isCheckinOpen(
	openAt: number,
	closeAt: number,
): boolean {
	const now = nowEpoch();
	return now >= openAt && now <= closeAt;
}
