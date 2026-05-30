/**
 * Llamada directa a Anthropic desde la extensión (BYOK).
 * La API key nunca sale del navegador del usuario hacia tu backend.
 */

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const DEFAULT_MODEL = "claude-sonnet-4-20250514";

const SYSTEM_PROMPT = `Eres un asesor de compras honesto para usuarios en México.
Responde SOLO con JSON válido (sin markdown, sin texto antes ni después) con esta forma exacta:
{
  "verdicts": [{"id":"...","verdict":"buy|wait|skip","reason":"...","rank":1}],
  "summary": "2-3 oraciones en español de México, tuteo, directo"
}

Reglas de verdict:
- buy = comprar este mes, wait = puede esperar, skip = no conviene ahora
- rank: 1 es lo más urgente/recomendado; sin empates duplicados
- Razones concretas en una línea, citando el perfil o el producto — nada genérico

REGLA CRÍTICA — presupuesto (léela con cuidado):
- El presupuesto es un TOPE de la SUMA de items con verdict "buy", NO un juicio sobre precio individual.
- Presupuesto disponible = monthlyBudgetMXN − spentThisMonthMXN (usa budgetContext si viene en el mensaje).
- PROHIBIDO marcar "wait" o "skip" solo porque un artículo "es caro", "cuesta mucho del presupuesto", "ocupa X% del presupuesto" o "busca alternativas más baratas" si ese artículo CABE dentro del presupuesto disponible junto con los demás "buy".
- Si budgetContext.allItemsFitInBudget es true, todos los items de la wishlist deben poder ser "buy" salvo avoidThisMonth, regretPurchases o tastes muy incompatibles.
- "wait" por presupuesto ÚNICAMENTE cuando incluir ese item como "buy" haría que la suma de todos los "buy" supere el presupuesto disponible — entonces wait/skip al de menor prioridad, no al que el usuario quiere más.
- Si no cabe todo, prioriza en este orden: mustBuyThisMonth → items que encajan con tastes → el resto; los demás pasan a wait o skip.

Wishlist = intención de compra:
- El usuario guardó cada item porque lo quiere. Si cabe en presupuesto y no viola avoidThisMonth/regretPurchases, el default es "buy".
- No seas conservador ni paternalista con el dinero si matemáticamente cabe.

Perfil del usuario:
- priority ahorro: preferir alternativas baratas SOLO si hay duplicados o sustitutos en la lista; NO rechazar un item deseado que ya cabe en presupuesto.
- priority calidad/balance: no penalizar precio alto si cabe en presupuesto.
- tastes: prioriza lo que encaja; skip/wait solo si claramente NO encaja con gustos declarados.
- mustBuyThisMonth: si el producto coincide (nombre, categoría o intención) → "buy" salvo que rompa el tope total del presupuesto.
- avoidThisMonth: skip agresivo si el producto cae en esa categoría.
- regretPurchases: skip o wait solo si el item es claramente similar al patrón de arrepentimiento.
- notes: contexto temporal — úsalo en summary y verdicts, no para inventar restricciones de presupuesto.`;

const parseJsonContent = (text) => {
  let content = text.trim();
  content = content.replace(/^```json\s*/i, "").replace(/^```\s*/i, "");
  content = content.replace(/\s*```$/i, "").trim();
  return JSON.parse(content);
};

export const prioritizeWithAnthropic = async (apiKey, items, profile) => {
  let totalListedMXN = 0;
  for (const it of items) totalListedMXN += it.price || 0;
  const budget = profile.monthlyBudgetMXN || 0;
  const spent = profile.spentThisMonthMXN || 0;
  const availableBudgetMXN = Math.max(0, budget - spent);

  const budgetContext = {
    monthlyBudgetMXN: budget,
    spentThisMonthMXN: spent,
    availableBudgetMXN,
    totalWishlistMXN: totalListedMXN,
    allItemsFitInBudget:
      availableBudgetMXN <= 0 || totalListedMXN <= availableBudgetMXN,
    headroomMXN: Math.max(0, availableBudgetMXN - totalListedMXN),
  };

  const res = await fetch(ANTHROPIC_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true",
    },
    body: JSON.stringify({
      model: DEFAULT_MODEL,
      max_tokens: 2048,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: JSON.stringify({ items, profile, budgetContext }),
        },
      ],
    }),
  });

  const raw = await res.json();

  if (!res.ok) {
    const msg = raw?.error?.message || res.statusText;
    throw new Error(`Anthropic (${res.status}): ${msg}`);
  }

  let text = "";
  for (const block of raw.content || []) {
    if (block.type === "text") text += block.text;
  }

  const parsed = parseJsonContent(text);

  return {
    verdicts: parsed.verdicts || [],
    summary: parsed.summary || "",
    totalListedMXN,
    budgetMXN: budget,
    availableBudgetMXN,
    overBudget: availableBudgetMXN > 0 && totalListedMXN > availableBudgetMXN,
  };
};
