import { NextResponse } from "next/server";
import { client } from "@/sanity/lib/client";
import { recipesByIdsQuery } from "@/sanity/lib/queries";

export const runtime = "nodejs";

const MAX_CART_RECIPES = 100;

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const ids =
    typeof body === "object" && body !== null && "ids" in body
      ? (body as { ids: unknown }).ids
      : undefined;

  if (
    !Array.isArray(ids) ||
    ids.length > MAX_CART_RECIPES ||
    !ids.every((id) => typeof id === "string" && id.trim().length > 0)
  ) {
    return NextResponse.json({ error: "Invalid recipe IDs." }, { status: 400 });
  }

  try {
    const recipes = await client.fetch(recipesByIdsQuery, {
      ids: Array.from(new Set(ids)),
    });
    return NextResponse.json({ recipes });
  } catch (error) {
    console.error("Unable to load cart recipes from Sanity", error);
    return NextResponse.json(
      { error: "Unable to load cart recipes." },
      { status: 502 },
    );
  }
}
