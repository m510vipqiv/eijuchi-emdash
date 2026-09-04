import type { APIRoute } from "astro";

// Mirrors the ads.txt served by the WordPress site (Google AdSense).
export const GET: APIRoute = () =>
	new Response("google.com, pub-5799363994039959, DIRECT, f08c47fec0942fa0\n", {
		headers: {
			"Content-Type": "text/plain; charset=utf-8",
			"Cache-Control": "public, max-age=86400",
		},
	});
