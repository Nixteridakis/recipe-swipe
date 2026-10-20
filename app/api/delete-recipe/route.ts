export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { revalidateRecipePages } from "@/lib/revalidate-recipes";
import { getSanityWriteClient } from "@/sanity/lib/write-client";

export async function DELETE(req: Request) {
  const body = (await req.json().catch(() => null)) as { id?: unknown } | null;
  const id = typeof body?.id === "string" ? body.id : null;

  if (!id) {
    return NextResponse.json(
      { error: "bad_request", message: "Recipe ID is required." },
      { status: 400 }
    );
  }

  const writeClient = getSanityWriteClient();
  if (!writeClient) {
    return NextResponse.json(
      { error: "write_not_configured", message: "Recipe deletion is not configured on this server." },
      { status: 503 },
    );
  }

  try {
    const existing = await writeClient.fetch<{ _id: string; slug?: { current?: string } } | null>(
      '*[_id == $id && _type == "recipe"][0]{_id, slug}',
      { id },
    );
    if (!existing?._id) {
      return NextResponse.json(
        { error: "not_found", message: "Recipe not found." },
        { status: 404 }
      );
    }

    await writeClient.delete(id);
    revalidateRecipePages(existing.slug?.current);

    return NextResponse.json({ ok: true, deletedId: id });
  } catch (error) {
    console.error("delete-recipe failed:", error);
    const statusCode = typeof error === "object" && error && "statusCode" in error ? Number(error.statusCode) : 0;
    const isConfigurationError = statusCode === 401 || statusCode === 403;
    return NextResponse.json(
      {
        error: isConfigurationError ? "write_not_configured" : "delete_failed",
        message: isConfigurationError
          ? "Recipe deletion is not configured on this server. Check the Sanity write token."
          : "The recipe could not be deleted. Please try again.",
      },
      { status: isConfigurationError ? 503 : 500 },
    );
  }
}
