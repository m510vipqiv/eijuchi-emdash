/** Resolved media reference from getSiteSettings() */
export interface MediaReference {
	mediaId: string;
	alt?: string;
	url?: string;
}

export interface BlogSiteIdentitySettings {
	title?: string;
	tagline?: string;
	logo?: MediaReference;
	favicon?: MediaReference;
}

// Defaults for eijuchi.com. Admin → Settings → Site overrides these.
const DEFAULT_SITE_TITLE = "永住地";
const DEFAULT_SITE_TAGLINE = "PCゲーム・ネトゲのニュース、攻略、コラム、レビュー";

/**
 * Logo assets (EmDash media). Two variants: the original navy/glitch logo
 * for light mode and a white-text variant for dark mode (§7.1.1).
 */
export const LOGO_LIGHT_URL = "/_emdash/api/media/file/01M1GHYK92QSX48CQ3EEV62VFQ.png";
export const LOGO_DARK_URL = "/_emdash/api/media/file/01M1JDA5PT11YVYEMNSJDG36TK.png";
export const LOGO_WIDTH = 348;
export const LOGO_HEIGHT = 133;

/**
 * Canonical origin. Leave null while staging on workers.dev so every
 * absolute URL (canonical, OGP, sitemap, RSS) follows the request origin.
 * Set to "https://www.eijuchi.com" at cutover so the workers.dev preview
 * never advertises itself as canonical.
 */
export const CANONICAL_ORIGIN: string | null = "https://www.eijuchi.com";

export function siteOrigin(url: URL): string {
	return CANONICAL_ORIGIN ?? url.origin;
}

/**
 * True when the request is served from the real site domain. Staging and
 * branch previews live on *.workers.dev and are served with noindex +
 * robots Disallow so they never compete with the canonical domain.
 */
export function isCanonicalHost(url: URL): boolean {
	if (url.hostname.endsWith(".workers.dev")) return false;
	if (CANONICAL_ORIGIN) return url.origin === CANONICAL_ORIGIN;
	return true;
}

/** Default share image (1200x630, EmDash media) for pages without their own. */
export const DEFAULT_OG_IMAGE_PATH = "/_emdash/api/media/file/01M1S3JYGPVXDZJNTG8Y0F8V4G.png";

export function resolveBlogSiteIdentity(settings?: BlogSiteIdentitySettings) {
	return {
		siteTitle: settings?.title ?? DEFAULT_SITE_TITLE,
		siteTagline: settings?.tagline ?? DEFAULT_SITE_TAGLINE,
		siteLogo: settings?.logo?.url ? settings.logo : null,
	};
}
