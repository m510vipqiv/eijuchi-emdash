import type { APIRoute } from "astro";
import { siteOrigin, isCanonicalHost } from "../utils/site-identity";

export const GET: APIRoute = ({ url }) => {
	const origin = siteOrigin(url);
	// Staging / preview hosts (workers.dev) must never be crawled: they would
	// compete with the real domain as duplicate content.
	const body = isCanonicalHost(url)
		? `User-agent: *
Allow: /
Disallow: /_emdash/
Disallow: /search
Disallow: /*?cursor=
Disallow: /*?_edit=

Sitemap: ${origin}/sitemap.xml
`
		: `User-agent: *
Disallow: /
`;
	return new Response(body, {
		headers: {
			"Content-Type": "text/plain; charset=utf-8",
			"Cache-Control": "public, max-age=86400",
		},
	});
};
