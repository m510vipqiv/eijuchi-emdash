/**
 * Category registry for eijuchi.com.
 *
 * WordPress served every post at /{category}/{slug}/ and that URL shape is
 * preserved verbatim after the EmDash migration (see 要件定義書 §5).
 * The four slugs below are the only top-level category archives; every
 * other single-segment path is treated as a static page (/privacy, /contact).
 */
export const CATEGORIES = [
	{ slug: "news", label: "ニュース", en: "News" },
	{ slug: "guide", label: "攻略・ガイド", en: "Guide" },
	{ slug: "column", label: "コラム", en: "Column" },
	{ slug: "review", label: "レビュー", en: "Review" },
] as const;

export type CategorySlug = (typeof CATEGORIES)[number]["slug"];

export const CATEGORY_SLUGS: readonly string[] = CATEGORIES.map((c) => c.slug);

export function isCategorySlug(slug: string | undefined | null): slug is CategorySlug {
	return !!slug && CATEGORY_SLUGS.includes(slug);
}

export function categoryLabel(slug: string | undefined | null): string {
	const hit = CATEGORIES.find((c) => c.slug === slug);
	return hit ? hit.label : slug ?? "";
}

/** English display word for the category (masthead, archive headers). */
export function categoryEn(slug: string | undefined | null): string {
	const hit = CATEGORIES.find((c) => c.slug === slug);
	return hit ? hit.en : (slug ?? "").toUpperCase();
}

/** Minimal shape of a taxonomy term as returned by getTermsForEntries / getEntryTerms */
export interface TermLike {
	slug: string;
	label?: string;
	name?: string;
}

/**
 * Pick the canonical category for a post from its category terms.
 * Falls back to "news" so a post with no category still has a valid URL.
 */
export function primaryCategory(terms: TermLike[] | undefined | null): CategorySlug {
	if (terms) {
		for (const t of terms) {
			if (isCategorySlug(t.slug)) return t.slug;
		}
	}
	return "news";
}

/**
 * Public URLs keep WordPress's trailing slash so every indexed URL stays
 * byte-identical after the migration (src/middleware.ts 301s the bare form).
 */
export function postHref(categorySlug: string, postSlug: string): string {
	return `/${categorySlug}/${postSlug}/`;
}

export function categoryHref(categorySlug: string): string {
	return `/${categorySlug}/`;
}

/**
 * Some WordPress-imported tags (e.g. 初心者向け) have their slug stored
 * already percent-encoded ("%e5%88%9d…"). Encoding that again would produce a
 * double-encoded URL that 404s, so a slug that already looks encoded is used
 * verbatim.
 */
const PERCENT_ENCODED = /%[0-9a-f]{2}/i;

export function tagPath(tagSlug: string): string {
	return PERCENT_ENCODED.test(tagSlug) ? tagSlug : encodeURIComponent(tagSlug);
}

export function tagHref(tagSlug: string): string {
	return `/tag/${tagPath(tagSlug)}/`;
}

/**
 * Slug values to try when resolving a /tag/{param} URL: the decoded param
 * itself, plus the lowercase/uppercase percent-encoded forms in case the term
 * is one of the encoded-slug imports.
 */
export function tagSlugCandidates(param: string): string[] {
	const enc = encodeURIComponent(param);
	return [...new Set([param, enc.toLowerCase(), enc])];
}

export function pageHref(pageSlug: string): string {
	return `/${pageSlug}/`;
}

/** Japanese date, e.g. 2024年1月5日 */
export function formatDateJa(date: Date | null | undefined): string | null {
	if (!date) return null;
	return date.toLocaleDateString("ja-JP", {
		year: "numeric",
		month: "long",
		day: "numeric",
		timeZone: "Asia/Tokyo",
	});
}

/** ISO date for <time datetime> */
export function isoDate(date: Date | null | undefined): string | undefined {
	return date ? date.toISOString() : undefined;
}

/**
 * Bulk data fixes during the migration (featured images, URL rewrites) bumped
 * updated_at on every post. Treat updates before this cutoff as "not modified"
 * so dateModified / 更新日 only reflect real edits made after go-live.
 */
export const MIGRATION_CUTOFF = new Date("2026-09-07T00:00:00Z");

export function effectiveModified(
	publishedAt: Date | null | undefined,
	updatedAt: Date | null | undefined,
): Date | null | undefined {
	if (!updatedAt) return publishedAt;
	if (updatedAt.getTime() <= MIGRATION_CUTOFF.getTime()) return publishedAt ?? updatedAt;
	return updatedAt;
}
