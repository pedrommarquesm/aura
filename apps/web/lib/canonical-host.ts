const APEX = "aurarankd.com";
const WWW = `www.${APEX}`;

/**
 * Apex is canonical (docs/deployment.md). `www` is the same app; once DNS
 * answers for both, keep one host so Open Graph, cookies, and hreflang do
 * not split across two origins.
 */
export function isWwwHost(host: string | null | undefined): boolean {
  const hostname = (host ?? "").split(":")[0].toLowerCase();
  return hostname === WWW;
}
