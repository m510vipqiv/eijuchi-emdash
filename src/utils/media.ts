/**
 * Media helpers for EmDash images on Cloudflare (free plan).
 *
 * Originals live in R2 at /_emdash/api/media/file/{key}. Resized renditions
 * come from EmDash's /_image endpoint, which uses the Cloudflare IMAGES
 * binding. The free tier allows 5,000 *unique* transformations per calendar
 * month (a unique = source × width × format), and repeats are free, so the
 * theme only ever requests a small fixed set of widths:
 *
 *   THUMB (480) — cards, list thumbnails
 *   HERO  (960) — lead story, article hero, in-body images
 *
 * 252 featured images × 2 + ~1,300 body images × 1 ≈ 1,800 / month, well
 * under the cap. Never add widths casually; every new width doubles the count.
 */

export const MEDIA_PREFIX = "/_emdash/api/media/file/";

export const WIDTHS = {
	thumb: 480,
	hero: 960,
} as const;

/** Loose shape of an EmDash media value / image field */
export interface MediaLike {
	id?: string;
	src?: string;
	url?: string;
	width?: number;
	height?: number;
	alt?: string;
	meta?: { storageKey?: string; width?: number; height?: number; alt?: string } & Record<string, unknown>;
}

/** Storage key (ULID + extension) from any media-ish value; null if unknown. */
export function mediaKey(img: MediaLike | string | null | undefined): string | null {
	if (!img) return null;
	if (typeof img === "string") return keyFromPath(img);
	const fromMeta = img.meta?.storageKey;
	if (typeof fromMeta === "string" && fromMeta) return fromMeta;
	const fromSrc = keyFromPath(img.src) ?? keyFromPath(img.url);
	if (fromSrc) return fromSrc;
	if (typeof img.id === "string" && img.id) return img.id;
	return null;
}

function keyFromPath(p: string | undefined): string | null {
	if (!p) return null;
	let pathname: string;
	try {
		pathname = new URL(p, "http://x").pathname;
	} catch {
		return null;
	}
	if (!pathname.startsWith(MEDIA_PREFIX)) return null;
	const key = pathname.slice(MEDIA_PREFIX.length);
	return /^[A-Za-z0-9._-]+$/.test(key) ? key : null;
}

/** Original file URL (site-relative). */
export function originalUrl(img: MediaLike | string | null | undefined): string | null {
	const key = mediaKey(img);
	return key ? `${MEDIA_PREFIX}${key}` : null;
}

/** Resized WebP rendition URL (site-relative). */
export function resizedUrl(key: string, width: number): string {
	return `/_image?href=${encodeURIComponent(MEDIA_PREFIX + key)}&w=${width}&f=webp`;
}

export function mediaDims(img: MediaLike | string | null | undefined): { width: number; height: number } | null {
	if (!img || typeof img === "string") return null;
	const w = img.width ?? img.meta?.width;
	const h = img.height ?? img.meta?.height;
	return typeof w === "number" && typeof h === "number" && w > 0 && h > 0 ? { width: w, height: h } : null;
}

export function mediaAlt(img: MediaLike | string | null | undefined): string {
	if (!img || typeof img === "string") return "";
	return (typeof img.alt === "string" && img.alt) || (typeof img.meta?.alt === "string" && img.meta.alt) || "";
}
