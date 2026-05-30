import {
  clearAnthropicApiKey,
  defaultProfile,
  getProfile,
  hasAnthropicApiKey,
  setAnthropicApiKey,
  setProfile,
} from "./lib/storage.js";
import { isValidAnthropicKeyFormat } from "./lib/security.js";

const form = document.getElementById("profileForm");
const saved = document.getElementById("saved");
const keyDeleted = document.getElementById("keyDeleted");
const keyStatus = document.getElementById("keyStatus");
const btnDeleteKey = document.getElementById("btnDeleteKey");
const keyInput = document.getElementById("anthropicApiKey");

const setKeyStatus = (text, variant = "default") => {
  keyStatus.innerHTML = `<span class="status-dot" aria-hidden="true"></span>${text}`;
  keyStatus.classList.remove("status-pill--ok", "status-pill--error");
  if (variant === "ok") keyStatus.classList.add("status-pill--ok");
  if (variant === "error") keyStatus.classList.add("status-pill--error");
};

const updateKeyStatus = async () => {
  const has = await hasAnthropicApiKey();
  setKeyStatus(
    has ? "API key configurada en este navegador" : "Sin API key configurada",
    has ? "ok" : "default",
  );
  btnDeleteKey.disabled = !has;
};

const hideNotices = () => {
  saved.classList.add("hidden");
  keyDeleted.classList.add("hidden");
};

const getSelectedPriority = () => {
  const checked = form.querySelector('input[name="priority"]:checked');
  return checked?.value || "balance";
};

const setSelectedPriority = (value) => {
  const input = form.querySelector(`input[name="priority"][value="${value}"]`);
  if (input) input.checked = true;
};

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  hideNotices();

  const newKey = keyInput.value.trim();
  const hasKey = await hasAnthropicApiKey();

  if (newKey) {
    if (!isValidAnthropicKeyFormat(newKey)) {
      setKeyStatus(
        "Formato inválido — la key debe empezar con sk-ant-",
        "error",
      );
      return;
    }
    await setAnthropicApiKey(newKey);
    keyInput.value = "";
  } else if (!hasKey) {
    setKeyStatus("Agrega una API key para usar Priorizar con IA", "error");
    return;
  }

  const profile = {
    monthlyBudgetMXN: Number(
      document.getElementById("monthlyBudgetMXN").value,
    ),
    spentThisMonthMXN: Number(
      document.getElementById("spentThisMonthMXN").value || 0,
    ),
    priority: getSelectedPriority(),
    tastes: document.getElementById("tastes").value.trim(),
    mustBuyThisMonth: document
      .getElementById("mustBuyThisMonth")
      .value.trim(),
    avoidThisMonth: document.getElementById("avoidThisMonth").value.trim(),
    regretPurchases: document.getElementById("regretPurchases").value.trim(),
    notes: document.getElementById("notes").value.trim(),
  };

  await setProfile(profile);
  await updateKeyStatus();

  saved.classList.remove("hidden");
  setTimeout(() => saved.classList.add("hidden"), 3000);
});

btnDeleteKey.addEventListener("click", async () => {
  const ok = confirm(
    "¿Borrar tu API key de Anthropic en este navegador? Tendrás que volver a pegarla para usar la IA.",
  );
  if (!ok) return;

  hideNotices();
  await clearAnthropicApiKey();
  keyInput.value = "";
  await updateKeyStatus();

  keyDeleted.classList.remove("hidden");
  setTimeout(() => keyDeleted.classList.add("hidden"), 3000);
});

const load = async () => {
  const profile = await getProfile();
  document.getElementById("monthlyBudgetMXN").value =
    profile.monthlyBudgetMXN ?? defaultProfile().monthlyBudgetMXN;
  document.getElementById("spentThisMonthMXN").value =
    profile.spentThisMonthMXN ?? "";
  setSelectedPriority(profile.priority || "balance");
  document.getElementById("tastes").value = profile.tastes || "";
  document.getElementById("mustBuyThisMonth").value =
    profile.mustBuyThisMonth || "";
  document.getElementById("avoidThisMonth").value =
    profile.avoidThisMonth || "";
  document.getElementById("regretPurchases").value =
    profile.regretPurchases || "";
  document.getElementById("notes").value = profile.notes || "";
  keyInput.value = "";
  await updateKeyStatus();
};

load();
