import { defineMiddleware } from "astro:middleware";
import { LEGACY_REDIRECTS } from "./data/legacy-redirects";

/**
 * Public URLs keep WordPress's trailing slash (/guide/slug/) so the indexed
 * URLs stay identical after the migration. Bare paths 301 to the slash form.
 *
 * Skipped: the root, anything with a file extension (sitemap.xml, robots.txt,
 * rss.xml, ads.txt), EmDash/Astro internals, Cloudflare paths, and the legacy
 * WordPress shims (/posts, /category, /pages) which already 301 to their
 * canonical slash URL in one hop.
 *
 * Legacy WordPress paths (old slugs, consolidated tags, /feed, /top …) are
 * resolved from the bundled LEGACY_REDIRECTS map — zero database reads — and
 * 301 straight to the canonical slash URL in one hop.
 */
const SKIP_PREFIXES = ["/_emdash", "/_image", "/_astro", "/cdn-cgi", "/posts", "/category", "/pages", "/wp-content"];

const CANONICAL_HOST = "www.eijuchi.com";

function legacyKey(pathname: string): string {
	let decoded = pathname;
	try {
		decoded = decodeURIComponent(pathname);
	} catch {
		/* keep raw */
	}
	const trimmed = decoded.length > 1 ? decoded.replace(/\/+$/, "") : decoded;
	return trimmed.toLowerCase();
}

export const onRequest = defineMiddleware((context, next) => {
	const { pathname, search, hostname } = context.url;
	// Apex → www (both hostnames are bound to the Worker as custom domains).
	if (hostname === "eijuchi.com") {
		return context.redirect(`https://${CANONICAL_HOST}${pathname}${search}`, 301);
	}
	if (context.request.method === "GET" || context.request.method === "HEAD") {
		const legacy = LEGACY_REDIRECTS.get(legacyKey(pathname));
		if (legacy && legacy !== pathname) {
			return context.redirect(`${legacy}${search}`, 301);
		}
	}
	if (
		context.request.method === "GET" &&
		pathname.length > 1 &&
		!pathname.endsWith("/") &&
		!pathname.includes(".") &&
		!SKIP_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + "/"))
	) {
		return context.redirect(`${pathname}/${search}`, 301);
	}
	return next();
});
