/**
 * Fill in width/height for Portable Text `image` blocks that lack them (CLS).
 *
 * Images imported from WordPress carry only `asset.url`; without intrinsic
 * dimensions ContentImage.astro cannot emit a `height` attribute, so the
 * browser reserves 0px and the article jumps as each lazy image loads.
 * The EmDash `media` table already knows every upload's pixel size, so we
 * look the missing ones up in a single D1 query per (uncached) render and
 * write them onto the nodes before <PortableText> runs.
 *
 * Cost: one SELECT returning ≤ (images in the post) rows, only on cache miss.
 */
import { env } from "cloudflare:workers";
import { MEDIA_PREFIX } from "./media";
import wpMediaMap from "../../wp-media-map.json";

/**
 * WordPress URL -> EmDash media key. The importer migrated the *original*
 * uploads (wp-media-map.json), but many post bodies still reference the
 * old host and/or a WP-generated size variant (`foo-696x392.png`), which
 * ContentImage then turns into a 404 `/_image?href=.../http://...` URL.
 * Strip the size suffix and map the path back to the migrated original.
 */
const WP_UPLOADS_RE = /\/wp-content\/uploads\/(.+)$/;
const wpEntries: Map<string, string> = new Map(
	((wpMediaMap as { entries?: [string, string][] }).entries ?? []).map(([path, key]) => [path.toLowerCase(), key]),
);

function wpMediaKey(url: unknown): string | null {
	if (typeof url !== "string") return null;
	const m = WP_UPLOADS_RE.exec(url.split(/[?#]/)[0]);
	if (!m) return null;
	let path = decodeURIComponent(m[1]).toLowerCase();
	const direct = wpEntries.get(path);
	if (direct) return direct;
	path = path.replace(/-\d+x\d+(\.[a-z0-9]+)$/, "$1").replace(/-scaled(\.[a-z0-9]+)$/, "$1");
	return wpEntries.get(path) ?? null;
}

interface ImageNode {
	_type?: string;
	asset?: { _ref?: string; url?: string; provider?: string };
	width?: number;
	height?: number;
	[key: string]: unknown;
}

interface D1Like {
	prepare(sql: string): {
		bind(...values: unknown[]): { all<T = Record<string, unknown>>(): Promise<{ results?: T[] }> };
	};
}

function keyFromPath(p: unknown): string | null {
	if (typeof p !== "string" || !p) return null;
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

function collect(value: unknown, out: ImageNode[]): void {
	if (Array.isArray(value)) {
		for (const v of value) collect(v, out);
		return;
	}
	if (!value || typeof value !== "object") return;
	const node = value as ImageNode;
	if (node._type === "image") {
		out.push(node);
		return;
	}
	for (const v of Object.values(node)) collect(v, out);
}

export async function hydrateBodyImageDims<T>(content: T): Promise<T> {
	// Astro 6 + @astrojs/cloudflare: bindings come from cloudflare:workers, not Astro.locals.runtime
	const db = (env as unknown as { DB?: D1Like }).DB;
	if (!content) return content;

	const nodes: ImageNode[] = [];
	collect(content, nodes);

	const pending = new Map<string, ImageNode[]>();
	for (const node of nodes) {
		if (typeof node.width === "number" && typeof node.height === "number") continue;
		const asset = node.asset;
		if (!asset || (asset.provider && asset.provider !== "local")) continue;
		let key = keyFromPath(asset.url) ?? keyFromPath(asset._ref);
		if (!key) {
			// Legacy WordPress reference: rewrite to the migrated original so it renders at all.
			key = wpMediaKey(asset.url) ?? wpMediaKey(asset._ref);
			if (!key) continue;
			asset.url = MEDIA_PREFIX + key;
			asset._ref = MEDIA_PREFIX + key;
		}
		const list = pending.get(key) ?? [];
		list.push(node);
		pending.set(key, list);
	}
	if (pending.size === 0 || !db) return content;

	const keys = [...pending.keys()];
	const dims = new Map<string, { width: number; height: number }>();
	try {
		for (let i = 0; i < keys.length; i += 50) {
			const chunk = keys.slice(i, i + 50);
			const placeholders = chunk.map(() => "?").join(",");
			const { results } = await db
				.prepare(
					`SELECT storage_key, width, height FROM media WHERE storage_key IN (${placeholders}) AND width IS NOT NULL AND height IS NOT NULL`,
				)
				.bind(...chunk)
				.all<{ storage_key: string; width: number; height: number }>();
			for (const row of results ?? []) {
				if (row.width > 0 && row.height > 0) {
					dims.set(row.storage_key, { width: row.width, height: row.height });
				}
			}
		}
	} catch (err) {
		// Dimensions are an optimisation; never fail the page over them.
		console.warn("[body-image-dims] lookup failed", err);
		return content;
	}

	for (const [key, list] of pending) {
		const d = dims.get(key);
		if (!d) continue;
		for (const node of list) {
			node.width = d.width;
			node.height = d.height;
		}
	}
	return content;
}
