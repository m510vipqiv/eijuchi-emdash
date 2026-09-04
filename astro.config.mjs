import cloudflare from "@astrojs/cloudflare";
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
