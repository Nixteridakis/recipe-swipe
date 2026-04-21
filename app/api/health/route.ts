import { NextResponse } from "next/server";
import { client } from "@/sanity/lib/client";

export const runtime = "nodejs";

export async function GET() {
  try {
    // Simple Sanity connectivity probe for deploy smoke tests.
    const sanityOk = await client
      .fetch<number>("count(*[_type == 'recipe'])")
      .then((count) => Number.isFinite(count))
      .catch(() => false);

    const status = sanityOk ? 200 : 503;
    return NextResponse.json(
      {
        ok: sanityOk,
        sanity: sanityOk ? "reachable" : "unreachable",
        timestamp: new Date().toISOString(),
      },
      { status },
    );
  } catch {
    return NextResponse.json(
      {
        ok: false,
        sanity: "unreachable",
        timestamp: new Date().toISOString(),
      },
      { status: 503 },
    );
  }
}
