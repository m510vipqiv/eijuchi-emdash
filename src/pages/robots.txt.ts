import type { APIRoute } from "astro";
import { siteOrigin } from "../utils/site-identity";

export const GET: APIRoute = ({ url }) => {
	const origin = siteOrigin(url);
	const body = `User-agent: *
Allow: /
Disallow: /_emdash/
Disallow: /search
Disallow: /*?cursor=

Sitemap: ${origin}/sitemap.xml
`;
	return new Response(body, {
		headers: {
			"Content-Type": "text/plain; charset=utf-8",
			"Cache-Control": "public, max-age=86400",
		},
	});
};
