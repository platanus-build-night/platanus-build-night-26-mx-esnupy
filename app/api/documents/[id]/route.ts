import { NextResponse } from "next/server";

import { deleteBaulDoc, getBaulDocDetail } from "@/lib/baul";
import { createPageIndexClient } from "@/lib/pageindex";

export const runtime = "nodejs";
export const maxDuration = 60;

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, context: RouteContext): Promise<NextResponse> {
  const { id } = await context.params;
  const client = createPageIndexClient();

  try {
    const document = await getBaulDocDetail(client, id);
    return NextResponse.json(document);
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo obtener el documento.";
    const status = message.includes("NOT_FOUND") || message.includes("404") ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  } finally {
    await client.close().catch(() => {});
  }
}

export async function DELETE(_request: Request, context: RouteContext): Promise<NextResponse> {
  const { id } = await context.params;
  const client = createPageIndexClient();

  try {
    await deleteBaulDoc(client, id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo eliminar el documento.";
    return NextResponse.json({ error: message }, { status: 500 });
  } finally {
    await client.close().catch(() => {});
  }
}
