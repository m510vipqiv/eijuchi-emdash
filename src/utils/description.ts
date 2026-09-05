import { extractPlainText } from "emdash";

/**
 * Build a meta description when an entry has no excerpt: the first ~110
 * characters of the body text, cut on a sentence boundary where possible.
 * (AIOSEO on the old site did the same from the post content.)
 */
export function fallbackDescription(excerpt: unknown, content: unknown, max = 110): string {
	if (typeof excerpt === "string" && excerpt.trim()) return squash(excerpt);
	let text = "";
	try {
		text = squash(extractPlainText(content as never) ?? "");
	} catch {
		text = "";
	}
	if (!text) return "";
	if (text.length <= max) return text;
	const head = text.slice(0, max);
	const cut = Math.max(head.lastIndexOf("。"), head.lastIndexOf("."), head.lastIndexOf("！"), head.lastIndexOf("？"));
	return (cut > max * 0.5 ? head.slice(0, cut + 1) : head.replace(/[、,\s]+$/, "") + "…");
}

function squash(s: string): string {
	return s.replace(/\s+/g, " ").trim();
}
