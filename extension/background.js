/**
 * Priorización con IA: llamada directa a Anthropic (BYOK).
 * La API key no se envía a ningún backend propio.
 */

import { prioritizeWithAnthropic } from "./lib/anthropic.js";
import { getAnthropicApiKey } from "./lib/storage.js";
import { isValidAnthropicKeyFormat } from "./lib/security.js";

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type !== "PRIORITIZE") return;

  (async () => {
    try {
      const apiKey = await getAnthropicApiKey();
      if (!apiKey) {
        sendResponse({
          ok: false,
          error:
            "Agrega tu API key de Anthropic en Perfil (solo se guarda en este navegador).",
        });
        return;
      }

      if (!isValidAnthropicKeyFormat(apiKey)) {
        sendResponse({
          ok: false,
          error: "La API key no tiene formato válido (debe empezar con sk-ant-).",
        });
        return;
      }

      const data = await prioritizeWithAnthropic(
        apiKey,
        message.items,
        message.profile,
      );
      sendResponse({ ok: true, data });
    } catch (err) {
      sendResponse({
        ok: false,
        error: err?.message || "Error al priorizar",
      });
    }
  })();

  return true;
});
