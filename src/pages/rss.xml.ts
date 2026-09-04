import type { APIRoute } from "astro";
import { getEmDashCollection, getTermsForEntries, getSiteSettings } from "emdash";

import { resolveBlogSiteIdentity, siteOrigin } from "../utils/site-identity";
import { primaryCategory, categoryLabel, postHref } from "../utils/categories";

export const GET: APIRoute = async ({ url }) => {
	const siteUrl = siteOrigin(url);
	const { siteTitle, siteTagline } = resolveBlogSiteIdentity(await getSiteSettings());

	const { entries: posts } = await getEmDashCollection("posts", {
		status: "published",
		orderBy: { published_at: "desc" },
		limit: 20,
	});

	const catsByEntry = await getTermsForEntries(
		"posts",
		posts.map((p) => p.data.id),
		"category",
	);

	const items = posts
		.map((post) => {
			if (!post.data.publishedAt) return null;
			const cat = primaryCategory(catsByEntry.get(post.data.id));
			const postUrl = `${siteUrl}${postHref(cat, post.id)}`;
			return `    <item>
      <title>${escapeXml(post.data.title || "無題")}</title>
      <link>${postUrl}</link>
      <guid isPermaLink="true">${postUrl}</guid>
      <category>${escapeXml(categoryLabel(cat))}</category>
      <pubDate>${post.data.publishedAt.toUTCString()}</pubDate>
      <description>${escapeXml(post.data.excerpt || "")}</description>
    </item>`;
		})
		.filter(Boolean)
		.join("\n");

	const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(siteTitle)}</title>
    <description>${escapeXml(siteTagline)}</description>
    <link>${siteUrl}/</link>
    <atom:link href="${siteUrl}/rss.xml" rel="self" type="application/rss+xml"/>
    <language>ja</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
${items}
  </channel>
</rss>`;

	return new Response(rss, {
		headers: {
			"Content-Type": "application/rss+xml; charset=utf-8",
			"Cache-Control": "public, max-age=3600",
		},
	});
};

const XML_ESCAPE_PATTERNS = [
	[/&/g, "&amp;"],
	[/</g, "&lt;"],
	[/>/g, "&gt;"],
	[/"/g, "&quot;"],
	[/'/g, "&apos;"],
] as const;

function escapeXml(str: string): string {
	let result = str;
	for (const [pattern, replacement] of XML_ESCAPE_PATTERNS) {
		result = result.replace(pattern, replacement);
	}
	return result;
}
