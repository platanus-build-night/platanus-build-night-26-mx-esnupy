import Anthropic from "@anthropic-ai/sdk";

import type { ContractDiff, ProcessedDoc } from "@/lib/types";

const DEFAULT_MODEL = "claude-sonnet-4-6";

const SYSTEM_PROMPT = `Eres un abogado corporativo senior especializado en contratos comerciales de retail con proveedores.
Tu trabajo es comparar DOS versiones de un mismo contrato y detectar TODAS las diferencias materiales que importan al equipo de negociación de la empresa de retail (el comprador).

Recibes el texto completo de ambas versiones (extraído y estructurado por PageIndex). Léelas a fondo y básate SOLO en lo que aparece en los textos. No inventes contenido.

Enfócate en cambios que afecten al negocio: precios y descuentos, plazos de pago, vigencia y renovación, penalizaciones, niveles de servicio (SLA), exclusividad, responsabilidad e indemnización, garantías, condiciones de entrega, terminación, propiedad intelectual y confidencialidad.

Responde EXCLUSIVAMENTE con un objeto JSON válido (sin texto adicional, sin markdown, sin \`\`\`) con esta forma exacta:
{
  "summary": "resumen ejecutivo en 2-4 frases, en español",
  "riskLevel": "alto" | "medio" | "bajo",
  "recommendation": "recomendación accionable para el negociador, en español",
  "changes": [
    {
      "clause": "cláusula o sección afectada",
      "category": "categoría de negocio",
      "changeType": "agregado" | "eliminado" | "modificado",
      "severity": "alta" | "media" | "baja",
      "versionA": "cómo estaba en la versión anterior (A)",
      "versionB": "cómo quedó en la versión nueva (B)",
      "impact": "por qué importa para la empresa de retail"
    }
  ]
}
Ordena "changes" de mayor a menor severidad. Si no hay diferencias materiales, devuelve "changes": [].`;

/** Documento ya procesado en PageIndex junto con su texto completo. */
export type ProcessedDocWithText = ProcessedDoc & { text: string };

const extractJson = (text: string): ContractDiff => {
  const fenced = text.replace(/```(?:json)?/gi, "").trim();
  const start = fenced.indexOf("{");
  const end = fenced.lastIndexOf("}");
  if (start === -1 || end === -1) {
    throw new Error("Claude no devolvió un JSON válido con las diferencias.");
  }
  return JSON.parse(fenced.slice(start, end + 1)) as ContractDiff;
};

/**
 * Compara dos contratos cuyo texto completo ya fue extraído de PageIndex.
 * Hace una sola inferencia con Claude (sin round-trips al MCP), por lo que es
 * rápida y predecible.
 * @param docA Versión anterior del contrato (con su texto completo).
 * @param docB Versión nueva del contrato (con su texto completo).
 * @returns El diff estructurado entre ambas versiones.
 * @throws si falta ANTHROPIC_API_KEY o si la respuesta no es parseable.
 */
export const compareContracts = async (
  docA: ProcessedDocWithText,
  docB: ProcessedDocWithText,
): Promise<ContractDiff> => {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("Falta la variable de entorno ANTHROPIC_API_KEY.");
  }

  const anthropic = new Anthropic({ apiKey });
  const model = process.env.CLAUDE_MODEL || DEFAULT_MODEL;

  const userPrompt = `Compara estas dos versiones del mismo contrato comercial.

=== DOCUMENTO A (versión ANTERIOR): "${docA.name}" ===

${docA.text}

=== DOCUMENTO B (versión NUEVA, propuesta por el proveedor): "${docB.name}" ===

${docB.text}

=== FIN DE LOS DOCUMENTOS ===

Entrega el JSON de diferencias según las instrucciones del sistema.`;

  const startedAt = Date.now();
  const elapsed = () => `${((Date.now() - startedAt) / 1000).toFixed(1)}s`;
  const log = (msg: string) => console.info(`[compare +${elapsed()}] ${msg}`);

  log(`Iniciando comparación con Claude (${model}).`);
  log(
    `A="${docA.name}" (${docA.text.length} chars) · B="${docB.name}" (${docB.text.length} chars).`,
  );

  // Streaming para peticiones largas: en modo no-streaming el SDK no recibe
  // headers hasta terminar toda la generación y puede abortar con "Request
  // timed out". Con SSE los headers llegan al instante y el cuerpo se lee sin
  // ese límite.
  const stream = anthropic.messages.stream({
    model,
    max_tokens: 8_000,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: userPrompt }],
  });

  stream.on("connect", () => log("Conectado al stream de Anthropic. Claude está analizando…"));

  const response = await stream.finalMessage();

  const text = response.content
    .filter((block): block is Anthropic.TextBlock => block.type === "text")
    .map((block) => block.text)
    .join("");

  log(`Comparación lista. ${text.length} chars de respuesta.`);
  return extractJson(text);
};
