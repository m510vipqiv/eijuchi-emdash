import type { APIRoute } from "astro";
import { getEmDashCollection, getTermsForEntries, getTaxonomyTerms } from "emdash";

import { siteOrigin } from "../utils/site-identity";
import { CATEGORIES, primaryCategory, postHref, effectiveModified } from "../utils/categories";

/**
 * /sitemap.xml — posts (category URLs), static pages, category archives, tags.
 * Replaces the AIOSEO sitemap. Pagination cursors are intentionally excluded.
 */
export const GET: APIRoute = async ({ url }) => {
	const origin = siteOrigin(url);
	const entries: Array<{ loc: string; lastmod?: string; changefreq?: string; priority?: string }> = [];

	entries.push({ loc: `${origin}/`, changefreq: "daily", priority: "1.0" });
	entries.push({ loc: `${origin}/articles/`, changefreq: "daily", priority: "0.6" });
	entries.push({ loc: `${origin}/tags/`, changefreq: "weekly", priority: "0.3" });
	for (const c of CATEGORIES) {
		entries.push({ loc: `${origin}/${c.slug}/`, changefreq: "daily", priority: "0.8" });
	}

	// Posts — walk every page of the collection.
	let cursor: string | undefined;
	let latest = 0;
	do {
		const result = await getEmDashCollection("posts", {
			status: "published",
			orderBy: { published_at: "desc" },
			limit: 200,
			cursor,
		});
		const catsByEntry = await getTermsForEntries(
			"posts",
			result.entries.map((p) => p.data.id),
			"category",
		);
		for (const post of result.entries) {
			const cat = primaryCategory(catsByEntry.get(post.data.id));
			const mod = effectiveModified(post.data.publishedAt, post.data.updatedAt);
			if (mod && mod.getTime() > latest) latest = mod.getTime();
			entries.push({
				loc: `${origin}${postHref(cat, post.id)}`,
				lastmod: mod ? mod.toISOString() : undefined,
				changefreq: "monthly",
				priority: "0.7",
			});
		}
		cursor = result.nextCursor;
	} while (cursor);

	if (latest) entries[0].lastmod = new Date(latest).toISOString();

	// Static pages (top-level URLs)
	const { entries: pages } = await getEmDashCollection("pages", { status: "published", limit: 50 });
	for (const page of pages) {
		entries.push({
			loc: `${origin}/${page.id}/`,
			lastmod: page.data.updatedAt ? page.data.updatedAt.toISOString() : undefined,
			changefreq: "yearly",
			priority: "0.3",
		});
	}

	// Tags with at least one post
	const tags = await getTaxonomyTerms("tag");
	for (const t of tags) {
		if ((t.count ?? 0) === 0) continue;
		entries.push({ loc: `${origin}/tag/${encodeURIComponent(t.slug)}/`, changefreq: "weekly", priority: "0.4" });
	}

	const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries
	.map(
		(e) => `  <url>
    <loc>${escapeXml(e.loc)}</loc>${e.lastmod ? `\n    <lastmod>${e.lastmod}</lastmod>` : ""}${e.changefreq ? `\n    <changefreq>${e.changefreq}</changefreq>` : ""}${e.priority ? `\n    <priority>${e.priority}</priority>` : ""}
  </url>`,
	)
	.join("\n")}
</urlset>`;

	return new Response(body, {
		headers: {
			"Content-Type": "application/xml; charset=utf-8",
			"Cache-Control": "public, max-age=3600",
		},
	});
};

function escapeXml(str: string): string {
	return str
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&apos;");
}
