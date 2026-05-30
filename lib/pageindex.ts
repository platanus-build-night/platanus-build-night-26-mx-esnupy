import { PageIndexClient, type TreeNode } from "@pageindex/sdk";

import type { IndexStatus, ProcessedDoc } from "@/lib/types";

const DEFAULT_FOLDER_NAME = "contract-diff-baul";

/**
 * Nombre de la carpeta del baúl en PageIndex.
 */
export const getBaulFolderName = (): string =>
  process.env.PAGEINDEX_FOLDER_NAME?.trim() || DEFAULT_FOLDER_NAME;

/**
 * Crea un cliente de PageIndex usando la clave de API del entorno.
 * @throws si falta PAGEINDEX_API_KEY.
 */
export const createPageIndexClient = (): PageIndexClient => {
  const apiKey = process.env.PAGEINDEX_API_KEY;
  if (!apiKey) {
    throw new Error("Falta la variable de entorno PAGEINDEX_API_KEY.");
  }
  return new PageIndexClient({ apiKey });
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

interface SubmitAndWaitOptions {
  timeoutMs?: number;
  intervalMs?: number;
  /** Número de intentos totales (PageIndex falla de forma transitoria a veces). */
  maxAttempts?: number;
  folderId?: string;
}

interface PageIndexDocMetadata {
  id?: string;
  status?: string;
  name?: string;
  file_name?: string;
  createdAt?: string;
  created_at?: string;
  pageNum?: number;
  error?: string;
  message?: string;
}

/** Normaliza el status de PageIndex al tipo de la app. */
export const normalizeIndexStatus = (status: string | undefined): IndexStatus => {
  if (status === "completed") return "completed";
  if (status === "failed") return "failed";
  return "processing";
};

/** Sube el PDF una vez y hace poll hasta completed/failed/timeout. */
const submitOnce = async (
  client: PageIndexClient,
  file: Blob,
  fileName: string,
  timeoutMs: number,
  intervalMs: number,
  folderId?: string,
): Promise<{ docId: string; status: "completed" | "failed" | "timeout" }> => {
  const { doc_id: docId } = await client.api.submitDocument(file, fileName, { folderId });
  const start = Date.now();

  while (Date.now() - start < timeoutMs) {
    const metadata = (await client.api.getDocument(docId)) as PageIndexDocMetadata;
    const status = metadata.status;
    if (status === "completed") return { docId, status: "completed" };
    if (status === "failed") return { docId, status: "failed" };
    await sleep(intervalMs);
  }

  return { docId, status: "timeout" };
};

/**
 * Aplana el árbol indexado de PageIndex a texto markdown (títulos + contenido),
 * recorriendo la jerarquía completa de secciones.
 */
const flattenTreeToText = (nodes: TreeNode[] | undefined, depth = 0): string => {
  if (!nodes?.length) return "";

  return nodes
    .map((node) => {
      const heading = node.title ? `${"#".repeat(Math.min(depth + 2, 6))} ${node.title}` : "";
      const body = node.text?.trim() ?? "";
      const children = flattenTreeToText(node.nodes, depth + 1);
      return [heading, body, children].filter(Boolean).join("\n\n");
    })
    .filter(Boolean)
    .join("\n\n");
};

const PAGEINDEX_API_URL = "https://api.pageindex.ai";

/** Texto completo del documento vía OCR raw (markdown concatenado de todas las páginas). */
const fetchOcrRawText = async (docId: string, apiKey: string): Promise<string> => {
  const url = `${PAGEINDEX_API_URL}/doc/${encodeURIComponent(docId)}/?type=ocr&format=raw`;
  const response = await fetch(url, { headers: { api_key: apiKey } });
  if (!response.ok) {
    throw new Error(`PageIndex devolvió ${response.status} al leer el texto del documento ${docId}.`);
  }
  const data = (await response.json()) as { result?: unknown };
  return typeof data.result === "string" ? data.result : "";
};

/**
 * Trae el texto completo de un documento indexado en una sola llamada REST,
 * sin pasar por las herramientas del MCP (que son lentas y hacen un round-trip
 * por página). Usa OCR raw como fuente principal (texto íntegro de todas las
 * páginas) y, si no hay OCR disponible, cae al texto del árbol indexado.
 * @throws si falta PAGEINDEX_API_KEY o si no se obtiene contenido de texto.
 */
export const getDocumentFullText = async (
  client: PageIndexClient,
  docId: string,
): Promise<string> => {
  const apiKey = process.env.PAGEINDEX_API_KEY;
  if (!apiKey) {
    throw new Error("Falta la variable de entorno PAGEINDEX_API_KEY.");
  }

  const ocrText = await fetchOcrRawText(docId, apiKey).catch(() => "");
  if (ocrText.trim()) return ocrText;

  const tree = await client.api.getTree(docId);
  const treeText = flattenTreeToText(tree.result);
  if (!treeText.trim()) {
    throw new Error(`PageIndex no devolvió contenido de texto para el documento ${docId}.`);
  }
  return treeText;
};

/**
 * Consulta el metadata de un documento en PageIndex.
 */
export const getDocumentMetadata = async (
  client: PageIndexClient,
  docId: string,
): Promise<PageIndexDocMetadata & { docId: string }> => {
  const metadata = (await client.api.getDocument(docId)) as PageIndexDocMetadata;
  return { ...metadata, docId: metadata.id ?? docId };
};

/**
 * Sube un PDF a PageIndex y espera (poll) hasta que termine de procesarse.
 * Reintenta automáticamente si PageIndex devuelve un fallo transitorio.
 * @param client Cliente de PageIndex.
 * @param file Contenido binario del PDF.
 * @param fileName Nombre del archivo (sirve como identificador en el MCP).
 * @returns El doc_id y nombre del documento procesado.
 * @throws si el procesamiento falla tras los reintentos o supera el timeout.
 */
export const submitAndWait = async (
  client: PageIndexClient,
  file: Blob,
  fileName: string,
  { timeoutMs = 240_000, intervalMs = 3_000, maxAttempts = 3, folderId }: SubmitAndWaitOptions = {},
): Promise<ProcessedDoc> => {
  let lastStatus: "failed" | "timeout" = "failed";

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const { docId, status } = await submitOnce(
      client,
      file,
      fileName,
      timeoutMs,
      intervalMs,
      folderId,
    );
    console.info(`[pageindex] "${fileName}" intento ${attempt}/${maxAttempts} → ${status} (${docId})`);

    if (status === "completed") return { docId, name: fileName };

    lastStatus = status;
    await client.api.deleteDocument(docId).catch(() => {});
  }

  if (lastStatus === "timeout") {
    throw new Error(`Tiempo de espera agotado procesando "${fileName}".`);
  }

  throw new Error(
    `PageIndex no pudo procesar "${fileName}" tras ${maxAttempts} intentos. ` +
      "Suele pasar con PDFs exportados desde Word con control de cambios, comentarios o texto tachado: " +
      "acepta/rechaza los cambios, elimina comentarios y vuelve a exportar el PDF (o imprime a PDF para aplanarlo).",
  );
};
