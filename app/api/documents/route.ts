import { NextResponse } from "next/server";

import { listBaulDocs, uploadToBaul } from "@/lib/baul";
import { createPageIndexClient } from "@/lib/pageindex";
import type { BaulDocument, BaulListResponse } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 300;

const MAX_FILE_BYTES = 25 * 1024 * 1024;

const isPdf = (file: File) =>
  file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");

export async function GET(): Promise<NextResponse> {
  const client = createPageIndexClient();
  try {
    const { folderId, folderName, usesFolders, documents } = await listBaulDocs(client);
    const payload: BaulListResponse = { folderId, folderName, usesFolders, documents };
    return NextResponse.json(payload);
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo listar el baúl.";
    return NextResponse.json({ error: message }, { status: 500 });
  } finally {
    await client.close().catch(() => {});
  }
}

export async function POST(request: Request): Promise<NextResponse> {
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "Cuerpo de la petición inválido." }, { status: 400 });
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Debes subir un archivo PDF." }, { status: 400 });
  }

  if (!isPdf(file)) {
    return NextResponse.json({ error: "El archivo debe ser PDF." }, { status: 400 });
  }

  if (file.size > MAX_FILE_BYTES) {
    return NextResponse.json({ error: "El PDF debe pesar menos de 25 MB." }, { status: 400 });
  }

  const client = createPageIndexClient();
  try {
    const document: BaulDocument = await uploadToBaul(client, file, file.name);
    return NextResponse.json(document);
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo indexar el documento.";
    return NextResponse.json({ error: message }, { status: 500 });
  } finally {
    await client.close().catch(() => {});
  }
}
