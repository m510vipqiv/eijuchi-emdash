/**
 * Category registry for eijuchi.com.
 *
 * WordPress served every post at /{category}/{slug}/ and that URL shape is
 * preserved verbatim after the EmDash migration (see 要件定義書 §5).
 * The four slugs below are the only top-level category archives; every
 * other single-segment path is treated as a static page (/privacy, /contact).
 */
export const CATEGORIES = [
	{ slug: "news", label: "ニュース" },
	{ slug: "guide", label: "攻略・ガイド" },
	{ slug: "column", label: "コラム" },
	{ slug: "review", label: "レビュー" },
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

/** Build the public URL of a post: /{category}/{slug} */
export function postHref(categorySlug: string, postSlug: string): string {
	return `/${categorySlug}/${postSlug}`;
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
