/** Active (non-deleted) tournament filter for bare `tournaments` table */
export const TOURNAMENT_NOT_DELETED = "deleted_at IS NULL";

/** Soft-deleted tournament filter for bare `tournaments` table */
export const TOURNAMENT_DELETED = "deleted_at IS NOT NULL";

/** Active tournament filter when aliased as `t` */
export const T_NOT_DELETED = "t.deleted_at IS NULL";

const DELETED_SLUG_SUFFIX = "__deleted__";

/** Recover original slug from `{slug}__deleted__{timestamp}` */
export function parseOriginalSlugFromDeleted(slug: string): string | null {
	const idx = slug.lastIndexOf(DELETED_SLUG_SUFFIX);
	if (idx === -1) return null;
	const ts = slug.slice(idx + DELETED_SLUG_SUFFIX.length);
	if (!/^\d+$/.test(ts)) return null;
	return slug.slice(0, idx);
}

export function buildDeletedSlug(slug: string, deletedAt: number): string {
	return `${slug}${DELETED_SLUG_SUFFIX}${deletedAt}`;
}
