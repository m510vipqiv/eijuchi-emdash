import type { APIRoute } from "astro";
import mediaMap from "../../../../wp-media-map.json";

/**
 * /wp-content/uploads/{path} → 301 to the migrated EmDash media file.
 *
 * EmDash's redirect middleware skips paths with file extensions, so image
 * URLs are redirected here in code using the map produced during the
 * WordPress media import. WordPress size variants (foo-300x200.jpg) fall
 * back to the original file.
 */
type MediaMap = { prefix: string; mediaBase: string; entries: Array<[string, string]> };
const map = mediaMap as MediaMap;
const lookup = new Map<string, string>(map.entries);

export const GET: APIRoute = ({ params }) => {
	const raw = params.path ?? "";
	let rel = "";
	try {
		rel = decodeURIComponent(raw);
	} catch {
		rel = raw;
	}
	if (!rel) return new Response("Not found", { status: 404 });

	let target = lookup.get(rel);
	if (!target) {
		// Strip WordPress thumbnail suffix: name-WxH.ext → name.ext
		const stripped = rel.replace(/-\d+x\d+(\.[a-z0-9]+)$/i, "$1");
		if (stripped !== rel) target = lookup.get(stripped);
	}
	if (!target) {
		// Scaled originals: name-scaled.ext → name.ext
		const unscaled = rel.replace(/-scaled(\.[a-z0-9]+)$/i, "$1");
		if (unscaled !== rel) target = lookup.get(unscaled);
	}
	if (!target) return new Response("Not found", { status: 404 });

	return new Response(null, {
		status: 301,
		headers: {
			Location: `${map.mediaBase}${target}`,
			"Cache-Control": "public, max-age=31536000, immutable",
		},
	});
};
