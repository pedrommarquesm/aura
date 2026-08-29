export const APEX_HOST = "aurarankd.com";
export const WWW_HOST = `www.${APEX_HOST}`;

/**
 * `www` is canonical (docs/deployment.md). The apex is the same app; keep
 * one host so Open Graph, cookies, and hreflang do not split across two
 * origins.
 */
export function isApexHost(host: string | null | undefined): boolean {
  const hostname = (host ?? "").split(":")[0].toLowerCase();
  return hostname === APEX_HOST;
}
