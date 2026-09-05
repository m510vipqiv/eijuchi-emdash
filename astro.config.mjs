import cloudflare from "@astrojs/cloudflare";
import { cacheCloudflare } from "@astrojs/cloudflare/cache";
import react from "@astrojs/react";
import { d1, r2 } from "@emdash-cms/cloudflare";
import { formsPlugin } from "@emdash-cms/plugin-forms";
import { defineConfig, fontProviders } from "astro/config";
import emdash from "emdash/astro";

// NOTE: sandboxed plugins (webhookNotifier) and sandboxRunner removed —
// Dynamic Worker Loaders require the Workers Paid plan. Free-plan build.
export default defineConfig({
	output: "server",
	adapter: cloudflare(),
	// Workers Cache (free on every plan): cached HTML/images are served without
	// invoking the Worker, which is what keeps the free-plan CPU limit (error
	// 1102) from firing under crawler / traffic bursts. Pages opt in via
	// Astro.cache.set() in Base.astro; EmDash purges by tag on publish.
	cache: { provider: cacheCloudflare() },
	image: {
		layout: "constrained",
		responsiveStyles: true,
	},
	integrations: [
		react(),
		emdash({
			database: d1({ binding: "DB", session: "auto" }),
			storage: r2({ binding: "MEDIA" }),
			plugins: [formsPlugin()],
			// Keep public HTML identical for every visitor so the edge cache stays
			// effective; editors get an "Edit" pill that reloads uncached.
			toolbar: "client",
		}),
	],
	// Noto Sans JP is loaded via a Google Fonts <link> in Base.astro: the Astro
	// font pipeline would inline ~490 @font-face slices (380KB) into every page.
	fonts: [
		{
			provider: fontProviders.google(),
			name: "JetBrains Mono",
			cssVariable: "--font-mono",
			weights: [400, 500],
			optimizedFallbacks: false,
			fallbacks: ["monospace"],
		},
	],
	devToolbar: { enabled: false },
});
