/**
 * Portal branding storage.
 * Used by /t/:slug (BW tenants) and /r/:slug (POPs/resellers) entry routes
 * to persist branding (logo, color, title) into localStorage, which PortalLayout reads.
 */

export interface PortalBranding {
  kind: "tenant" | "reseller";
  slug: string;
  id: string;
  branchId?: string | null;
  name: string;
  logoUrl?: string | null;
  brandColor?: string | null;
  title?: string | null;
}

const STORAGE_KEY = "portal_branding";

export function setBranding(b: PortalBranding) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(b)); } catch {}
  applyBrandingCss(b);
}

export function getBranding(): PortalBranding | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as PortalBranding) : null;
  } catch { return null; }
}

export function clearBranding() {
  try { localStorage.removeItem(STORAGE_KEY); } catch {}
  document.documentElement.style.removeProperty("--portal-brand");
}

/** Inject brand color as a CSS variable (--portal-brand) on <html>. */
export function applyBrandingCss(b: PortalBranding | null) {
  if (!b?.brandColor) {
    document.documentElement.style.removeProperty("--portal-brand");
    return;
  }
  // Accept either hex (#3b82f6) or HSL ("210 90% 50%") — store as-is.
  document.documentElement.style.setProperty("--portal-brand", b.brandColor);
}

/** Re-apply on app boot so branding survives refresh. */
export function initBrandingFromStorage() {
  applyBrandingCss(getBranding());
}
