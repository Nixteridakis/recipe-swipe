export const runtime = "nodejs";

import { createClient } from "next-sanity";
import { NextResponse } from "next/server";

import { apiVersion, dataset, projectId } from "@/sanity/env";

export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json(
      { error: "bad_request", message: "Recipe ID is required." },
      { status: 400 }
    );
  }

  const writeToken = process.env.SANITY_WRITE_TOKEN;
  if (!writeToken) {
    return NextResponse.json(
      { error: "missing_write_token", message: "Delete operation is not configured." },
      { status: 500 }
    );
  }

  const writeClient = createClient({
    projectId,
    dataset,
    apiVersion,
    useCdn: false,
    token: writeToken,
  });

  try {
    const existing = await writeClient.fetch("*[_id == $id][0]{_id}", { id });
    if (!existing?._id) {
      return NextResponse.json(
        { error: "not_found", message: "Recipe not found." },
        { status: 404 }
      );
    }

    await writeClient.delete(id);

    return NextResponse.json({ ok: true, deletedId: id });
  } catch (error) {
    console.error("delete-recipe failed:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "delete_failed", message, details: String(error) },
      { status: 500 }
    );
  }
}
