import { defineMiddleware } from "astro:middleware";

/**
 * Public URLs keep WordPress's trailing slash (/guide/slug/) so the indexed
 * URLs stay identical after the migration. Bare paths 301 to the slash form.
 *
 * Skipped: the root, anything with a file extension (sitemap.xml, robots.txt,
 * rss.xml, ads.txt), EmDash/Astro internals, Cloudflare paths, and the legacy
 * WordPress shims (/posts, /category, /pages) which already 301 to their
 * canonical slash URL in one hop.
 */
const SKIP_PREFIXES = ["/_emdash", "/_image", "/_astro", "/cdn-cgi", "/posts", "/category", "/pages", "/wp-content"];

export const onRequest = defineMiddleware((context, next) => {
	const { pathname, search } = context.url;
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
