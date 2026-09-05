/**
 * Helpers for article-body embeds (Portable Text `embed` + `htmlBlock`).
 *
 * WordPress rendered oEmbeds (tweets, Amazon cards, …) at request time, so the
 * imported `embed` blocks only carry the source URL plus the WP wrapper markup.
 * These helpers classify that URL so ContentEmbed.astro can rebuild each one.
 */
import sanitizeHtml from "sanitize-html";

export type EmbedKind =
	| "twitter"
	| "youtube"
	| "vimeo"
	| "amazon"
	| "reddit"
	| "internal"
	| "video"
	| "audio"
	| "link";

const YOUTUBE_ID =
	/(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/|v\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/;
const YOUTUBE_START = /[?&](?:t|start)=(\d+)/;
const VIMEO_ID = /vimeo\.com\/(?:video\/)?(\d+)/;
const TWEET = /^https?:\/\/(?:(?:www|mobile)\.)?(?:twitter|x)\.com\/([A-Za-z0-9_]{1,15})\/status(?:es)?\/(\d+)/;
const AMAZON_ASIN = /\/(?:dp|gp\/product|ASIN)\/([A-Z0-9]{10})/i;
const INTERNAL_HOSTS = new Set(["eijuchi.com", "www.eijuchi.com"]);

export function safeUrl(input: string | undefined): URL | null {
	if (!input) return null;
	try {
		const u = new URL(input.trim());
		return u.protocol === "https:" || u.protocol === "http:" ? u : null;
	} catch {
		return null;
	}
}

export function youtubeId(url: string): string | null {
	return url.match(YOUTUBE_ID)?.[1] ?? null;
}

export function youtubeStart(url: string): number | undefined {
	const m = url.match(YOUTUBE_START);
	return m ? Number(m[1]) : undefined;
}

export function vimeoId(url: string): string | null {
	return url.match(VIMEO_ID)?.[1] ?? null;
}

/** Canonical tweet URL (no query string) or null. Accepts twitter.com and x.com. */
export function tweetUrl(url: string): string | null {
	const m = url.match(TWEET);
	return m ? `https://twitter.com/${m[1]}/status/${m[2]}` : null;
}

export function amazonAsin(url: string): string | null {
	return url.match(AMAZON_ASIN)?.[1]?.toUpperCase() ?? null;
}

/** Amazon affiliate URLs sometimes carry the product name as the first path segment. */
export function amazonTitle(u: URL): string | null {
	const first = u.pathname.split("/").filter(Boolean)[0];
	if (!first || first === "dp" || first === "gp" || first === "ASIN") return null;
	try {
		const decoded = decodeURIComponent(first).replace(/-/g, " ").trim();
		return decoded.length > 2 ? decoded : null;
	} catch {
		return null;
	}
}

export function internalSlug(u: URL): string | null {
	if (!INTERNAL_HOSTS.has(u.hostname)) return null;
	const parts = u.pathname.split("/").filter(Boolean);
	return parts.length >= 2 ? decodeURIComponent(parts[parts.length - 1]) : null;
}

export function classify(url: string, provider?: string): EmbedKind {
	if (provider === "video") return "video";
	if (provider === "audio") return "audio";
	const u = safeUrl(url);
	if (!u) return "link";
	if (tweetUrl(url)) return "twitter";
	if (youtubeId(url)) return "youtube";
	if (vimeoId(url)) return "vimeo";
	if (/(^|\.)amazon\.(co\.jp|com)$|(^|\.)amzn\.(to|asia)$/.test(u.hostname)) return "amazon";
	if (/(^|\.)reddit\.com$/.test(u.hostname)) return "reddit";
	if (internalSlug(u)) return "internal";
	return "link";
}

/**
 * Sanitizer for imported WordPress "Custom HTML" blocks. Same policy as EmDash's
 * default, plus the iframe hosts this site's archive actually uses (Steam store
 * widgets, Twitch, bilibili, YouTube nocookie). <script> is always dropped —
 * Twitter's widgets.js is loaded once per page by ContentEmbed instead.
 */
export function sanitizeBodyHtml(html: string): string {
	return sanitizeHtml(html, {
		allowedTags: [...sanitizeHtml.defaults.allowedTags, "img", "span", "iframe", "figure", "figcaption"],
		allowedAttributes: {
			...sanitizeHtml.defaults.allowedAttributes,
			"*": ["class", "id", "data-*", "lang", "dir", "style"],
			a: ["href", "name", "target", "rel", "title"],
			iframe: [
				"src",
				"width",
				"height",
				"frameborder",
				"allow",
				"allowfullscreen",
				"scrolling",
				"loading",
				"title",
				"referrerpolicy",
				"sandbox",
			],
			img: ["src", "srcset", "sizes", "alt", "title", "width", "height", "loading", "decoding"],
		},
		allowedIframeHostnames: [
			"www.youtube.com",
			"www.youtube-nocookie.com",
			"player.vimeo.com",
			"store.steampowered.com",
			"player.twitch.tv",
			"clips.twitch.tv",
			"player.bilibili.com",
			"platform.twitter.com",
			"www.google.com",
			"docs.google.com",
			"open.spotify.com",
			"embed.music.apple.com",
		],
		allowedSchemes: ["http", "https", "mailto"],
		// Old WP markup often has protocol-relative iframe src ("//player.bilibili.com/…").
		transformTags: {
			iframe: (tagName, attribs) => {
				const src = attribs.src?.startsWith("//") ? `https:${attribs.src}` : attribs.src;
				return { tagName, attribs: { ...attribs, src, loading: "lazy" } };
			},
			a: (tagName, attribs) => {
				const external = /^https?:\/\//.test(attribs.href ?? "") && !/eijuchi\.com/.test(attribs.href ?? "");
				return {
					tagName,
					attribs: external ? { ...attribs, rel: "noopener noreferrer" } : attribs,
				};
			},
		},
	});
}

export function htmlHasTweet(html: string | undefined): boolean {
	return !!html && /class="[^"]*twitter-tweet/.test(html);
}
