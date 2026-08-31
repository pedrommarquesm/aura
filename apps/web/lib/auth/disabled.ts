import { NextResponse } from "next/server";

import { webAuthEnabled } from "@/lib/launch";

/** Web sign-in is parked for the waitlist. Do not load GIS or accept tokens. */
export function disabledAuthResponse() {
  if (webAuthEnabled) return null;

  return NextResponse.json(
    { error: { code: "forbidden", message: "Web sign-in is not open yet" } },
    { status: 404 },
  );
}
