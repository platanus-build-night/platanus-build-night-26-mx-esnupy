import { NextResponse } from "next/server";

import { requireCompletedBaulDoc } from "@/lib/baul";
import { compareContracts } from "@/lib/compare";
import { createPageIndexClient, getDocumentFullText } from "@/lib/pageindex";
import type { CompareRequest, CompareResponse } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(request: Request): Promise<NextResponse> {
  let body: CompareRequest;
  try {
    body = (await request.json()) as CompareRequest;
  } catch {
    return NextResponse.json({ error: "Cuerpo JSON inválido." }, { status: 400 });
  }

  const { docIdA, docIdB } = body;
  if (!docIdA || !docIdB) {
    return NextResponse.json(
      { error: "Debes indicar docIdA y docIdB de documentos indexados en el baúl." },
      { status: 400 },
    );
  }

  if (docIdA === docIdB) {
    return NextResponse.json(
      { error: "Elige dos documentos distintos para comparar." },
      { status: 400 },
    );
  }

  const startedAt = Date.now();
  const client = createPageIndexClient();
  try {
    console.info(`[api/compare] Petición recibida: A=${docIdA} B=${docIdB}. Verificando documentos…`);
    const [docA, docB] = await Promise.all([
      requireCompletedBaulDoc(client, docIdA),
      requireCompletedBaulDoc(client, docIdB),
    ]);

    console.info("[api/compare] Documentos verificados. Extrayendo texto completo desde PageIndex…");
    const [textA, textB] = await Promise.all([
      getDocumentFullText(client, docA.docId),
      getDocumentFullText(client, docB.docId),
    ]);

    const docAProcessed = { docId: docA.docId, name: docA.name, text: textA };
    let docBProcessed = { docId: docB.docId, name: docB.name, text: textB };

    if (docA.name === docB.name) {
      docBProcessed = { ...docBProcessed, name: `${docB.name} (v2)` };
    }

    const diff = await compareContracts(docAProcessed, docBProcessed);

    const payload: CompareResponse = {
      diff,
      docs: {
        a: { docId: docAProcessed.docId, name: docAProcessed.name },
        b: { docId: docBProcessed.docId, name: docBProcessed.name },
      },
    };
    const totalSeconds = ((Date.now() - startedAt) / 1000).toFixed(1);
    console.info(`[api/compare] Comparación completada en ${totalSeconds}s.`);
    return NextResponse.json(payload);
  } catch (error) {
    const totalSeconds = ((Date.now() - startedAt) / 1000).toFixed(1);
    const message = error instanceof Error ? error.message : "Error inesperado al comparar.";
    console.error(`[api/compare] Falló tras ${totalSeconds}s: ${message}`);
    return NextResponse.json({ error: message }, { status: 500 });
  } finally {
    await client.close().catch(() => {});
  }
}
