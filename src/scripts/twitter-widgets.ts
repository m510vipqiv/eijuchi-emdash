/**
 * Loads X/Twitter's widgets.js once, only on pages that actually contain a
 * `blockquote.twitter-tweet`, and only once the first tweet is near the viewport.
 * Matches the site's light/dark theme (":root.dark" / ":root.light" classes).
 */
declare global {
	interface Window {
		twttr?: { widgets?: { load: (el?: Element) => void } };
	}
}

const WIDGETS_SRC = "https://platform.twitter.com/widgets.js";

function isDark(): boolean {
	const root = document.documentElement;
	if (root.classList.contains("dark")) return true;
	if (root.classList.contains("light")) return false;
	return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function inject(): void {
	if (document.querySelector(`script[src="${WIDGETS_SRC}"]`)) {
		window.twttr?.widgets?.load();
		return;
	}
	const s = document.createElement("script");
	s.async = true;
	s.src = WIDGETS_SRC;
	s.charset = "utf-8";
	document.head.appendChild(s);
}

function init(): void {
	const tweets = Array.from(document.querySelectorAll<HTMLElement>("blockquote.twitter-tweet"));
	if (tweets.length === 0) return;

	const dark = isDark();
	for (const b of tweets) {
		b.dataset.dnt = "true";
		if (dark) b.dataset.theme = "dark";
		else delete b.dataset.theme;
	}

	if (!("IntersectionObserver" in window)) {
		inject();
		return;
	}
	const io = new IntersectionObserver(
		(entries) => {
			if (entries.some((e) => e.isIntersecting)) {
				io.disconnect();
				inject();
			}
		},
		{ rootMargin: "800px 0px" },
	);
	for (const b of tweets) io.observe(b);
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
else init();

export {};
