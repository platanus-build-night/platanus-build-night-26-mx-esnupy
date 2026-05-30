/** Claves y helpers de chrome.storage.local */

export const KEYS = {
  wishlist: "prioraWishlist",
  profile: "prioraProfile",
  apiUrl: "prioraApiUrl",
  anthropicApiKey: "prioraAnthropicApiKey",
};

/** Indica si hay key guardada sin exponerla en la UI. */
export const hasAnthropicApiKey = async () => {
  const { [KEYS.anthropicApiKey]: key } = await chrome.storage.local.get(
    KEYS.anthropicApiKey,
  );
  return typeof key === "string" && key.trim().length > 0;
};

/** Lee la API key solo para uso interno (background). No usar en popup/options DOM. */
export const getAnthropicApiKey = async () => {
  const { [KEYS.anthropicApiKey]: key } = await chrome.storage.local.get(
    KEYS.anthropicApiKey,
  );
  return typeof key === "string" ? key.trim() : "";
};

/** Guarda o reemplaza la API key. */
export const setAnthropicApiKey = async (key) => {
  await chrome.storage.local.set({ [KEYS.anthropicApiKey]: key.trim() });
};

/** Elimina la API key del dispositivo. */
export const clearAnthropicApiKey = async () => {
  await chrome.storage.local.remove(KEYS.anthropicApiKey);
};

export const defaultProfile = () => ({
  monthlyBudgetMXN: 5000,
  spentThisMonthMXN: 0,
  priority: "balance",
  tastes: "",
  mustBuyThisMonth: "",
  avoidThisMonth: "",
  regretPurchases: "",
  notes: "",
});

export const getWishlist = async () => {
  const { [KEYS.wishlist]: list } = await chrome.storage.local.get(KEYS.wishlist);
  return Array.isArray(list) ? list : [];
};

export const setWishlist = async (list) => {
  await chrome.storage.local.set({ [KEYS.wishlist]: list });
};

export const getProfile = async () => {
  const { [KEYS.profile]: profile } = await chrome.storage.local.get(KEYS.profile);
  return { ...defaultProfile(), ...profile };
};

export const setProfile = async (profile) => {
  await chrome.storage.local.set({ [KEYS.profile]: profile });
};

export const formatMXN = (n) =>
  new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    maximumFractionDigits: 0,
  }).format(n);
