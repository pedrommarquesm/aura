/**
 * Liveness probe for the container platform. Kept off the landing route so a
 * health check does not render the whole page on every poll.
 */
export const dynamic = "force-dynamic";

export function GET() {
  return Response.json({ status: "ok" });
}
