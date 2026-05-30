/**
 * Validación y manejo seguro de la API key (solo en el cliente).
 */

/** Formato esperado de keys de Anthropic. */
export const isValidAnthropicKeyFormat = (key) => {
  if (!key || typeof key !== "string") return false;
  const k = key.trim();
  return k.startsWith("sk-ant-") && k.length >= 20;
};

/** Nunca loguear ni incluir la key en errores. */
export const redactKey = (_key) => "[redactada]";
