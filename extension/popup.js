import {
  formatMXN,
  getProfile,
  getWishlist,
  setWishlist,
} from "./lib/storage.js";

const $ = (id) => document.getElementById(id);
const ANIM_MS = 220;

const setStatus = (text, isError = false) => {
  const el = $("status");
  el.textContent = text;
  el.classList.toggle("error", isError);
  if (text) {
    el.style.animation = "none";
    void el.offsetWidth;
    el.style.animation = "";
  }
};

const setButtonLoading = (btn, loading) => {
  btn.classList.toggle("is-loading", loading);
  btn.disabled = loading || btn.dataset.disabledWhenIdle === "true";
};

const flashButtonSuccess = (btn) => {
  btn.classList.add("btn-success-flash");
  setTimeout(() => btn.classList.remove("btn-success-flash"), 550);
};

const verdictClass = (v) => {
  if (v === "buy") return "verdict-buy";
  if (v === "wait") return "verdict-wait";
  return "verdict-skip";
};

const verdictLabel = (v) => {
  if (v === "buy") return "Comprar";
  if (v === "wait") return "Esperar";
  return "No comprar";
};

const createThumb = (item) => {
  if (item.imageUrl) {
    const img = document.createElement("img");
    img.className = "item-thumb";
    img.src = item.imageUrl;
    img.alt = "";
    img.onerror = () => {
      const fallback = document.createElement("div");
      fallback.className = "item-thumb item-thumb--empty";
      fallback.textContent = "·";
      img.replaceWith(fallback);
    };
    return img;
  }
  const fallback = document.createElement("div");
  fallback.className = "item-thumb item-thumb--empty";
  fallback.textContent = "·";
  return fallback;
};

const renderList = async ({
  verdictMap = null,
  animateVerdicts = false,
  newItemId = null,
  stagger = true,
} = {}) => {
  const list = await getWishlist();
  const ul = $("wishlist");
  const empty = $("empty");
  const btnPrioritize = $("btnPrioritize");
  const listCount = $("listCount");

  ul.innerHTML = "";
  empty.classList.toggle("hidden", list.length > 0);
  btnPrioritize.dataset.disabledWhenIdle = list.length === 0 ? "true" : "false";
  btnPrioritize.disabled = list.length === 0 || btnPrioritize.classList.contains("is-loading");
  listCount.textContent = list.length > 0 ? `${list.length} items` : "";

  const sorted = [...list];
  if (verdictMap) {
    sorted.sort((a, b) => {
      const ra = verdictMap[a.id]?.rank ?? 999;
      const rb = verdictMap[b.id]?.rank ?? 999;
      return ra - rb;
    });
  }

  sorted.forEach((item, index) => {
    const li = document.createElement("li");
    li.className = "item item--enter";
    li.dataset.id = item.id;

    if (stagger) {
      li.style.animationDelay = `${Math.min(index * 45, 320)}ms`;
    }

    if (item.id === newItemId) {
      li.classList.add("item--new");
    }

    const body = document.createElement("div");
    body.className = "item-body";

    const top = document.createElement("div");
    top.className = "item-top";

    const title = document.createElement("p");
    title.className = "item-title";
    title.textContent = item.title || "Sin título";
    top.append(title);

    if (verdictMap?.[item.id]) {
      const v = verdictMap[item.id];
      const badge = document.createElement("span");
      badge.className = `verdict ${verdictClass(v.verdict)}`;
      if (animateVerdicts) {
        badge.classList.add("verdict--pop");
        badge.style.animationDelay = `${120 + index * 70}ms`;
      }
      badge.textContent = verdictLabel(v.verdict);
      top.append(badge);

      if (v.reason) {
        const reason = document.createElement("p");
        reason.className = "item-reason";
        if (animateVerdicts) {
          reason.classList.add("item-reason--enter");
          reason.style.animationDelay = `${180 + index * 70}ms`;
        }
        reason.textContent = v.reason;
        body.append(reason);
      }
    }

    const priceLabel =
      item.price > 0 ? formatMXN(item.price) : "Precio no detectado";
    const meta = document.createElement("p");
    meta.className = "item-meta";
    meta.textContent = `${priceLabel} · ${item.site || "tienda"}`;

    const footer = document.createElement("div");
    footer.className = "item-footer";

    const del = document.createElement("button");
    del.type = "button";
    del.className = "item-remove";
    del.textContent = "Quitar";
    del.setAttribute("aria-label", `Quitar ${item.title}`);
    del.addEventListener("click", async () => {
      li.classList.remove("item--enter");
      li.classList.add("item--exit");
      await new Promise((r) => setTimeout(r, ANIM_MS));

      const next = (await getWishlist()).filter((x) => x.id !== item.id);
      await setWishlist(next);
      await renderList({ verdictMap, animateVerdicts: false, stagger: true });
    });
    footer.append(del);

    body.prepend(top);
    body.append(meta, footer);

    li.append(createThumb(item), body);
    ul.append(li);
  });
};

const hideAiResult = () => {
  const card = $("aiResult");
  card.classList.remove("ai-card--visible");
  card.classList.add("hidden");
};

const renderAiResult = (data) => {
  const card = $("aiResult");
  card.classList.remove("ai-card--visible", "hidden");

  $("aiSummary").textContent = data.summary || "";

  const budgetLine =
    data.availableBudgetMXN != null &&
    data.availableBudgetMXN < data.budgetMXN
      ? `Disponible ${formatMXN(data.availableBudgetMXN)}`
      : `Presupuesto ${formatMXN(data.budgetMXN)}`;

  const stats = $("aiStats");
  stats.innerHTML = "";

  const pills = [
    { text: `Lista ${formatMXN(data.totalListedMXN)}` },
    { text: budgetLine },
  ];

  if (data.overBudget) {
    pills.push({ text: "Te pasas del disponible", warn: true });
  } else if (data.availableBudgetMXN > data.totalListedMXN) {
    const headroom = data.availableBudgetMXN - data.totalListedMXN;
    pills.push({ text: `Te sobran ${formatMXN(headroom)}` });
  }

  for (const pill of pills) {
    const el = document.createElement("span");
    el.className = pill.warn ? "stat-pill stat-pill--warn" : "stat-pill";
    el.textContent = pill.text;
    stats.append(el);
  }

  void card.offsetWidth;
  card.classList.add("ai-card--visible");
};

const isSavableUrl = (url) =>
  typeof url === "string" && /^https?:\/\//i.test(url);

const readProductFromTab = async (tabId) => {
  try {
    return await chrome.tabs.sendMessage(tabId, { type: "GET_PRODUCT" });
  } catch {
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ["content.js"],
    });
    return chrome.tabs.sendMessage(tabId, { type: "GET_PRODUCT" });
  }
};

const saveCurrentPage = async () => {
  const btnSave = $("btnSave");
  setButtonLoading(btnSave, true);
  setStatus("Leyendo producto…");

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) {
    setButtonLoading(btnSave, false);
    setStatus("No hay pestaña activa.", true);
    return;
  }

  if (!isSavableUrl(tab.url)) {
    setButtonLoading(btnSave, false);
    setStatus(
      "Abre una página de producto en cualquier tienda (http/https).",
      true,
    );
    return;
  }

  let product;
  try {
    const res = await readProductFromTab(tab.id);
    if (!res?.ok || !res.product?.title) {
      setButtonLoading(btnSave, false);
      setStatus(
        "No detecté un producto en esta página. Prueba en la ficha del artículo.",
        true,
      );
      return;
    }
    product = res.product;
  } catch {
    setButtonLoading(btnSave, false);
    setStatus("No pude leer esta página. Recarga e intenta de nuevo.", true);
    return;
  }

  const list = await getWishlist();
  const item = {
    id: crypto.randomUUID(),
    title: product.title,
    price: product.price || 0,
    currency: product.currency || "MXN",
    url: product.url || tab.url,
    imageUrl: product.imageUrl || "",
    addedAt: Date.now(),
    site: product.site,
  };

  const dup = list.find((x) => x.url === item.url);
  if (dup) {
    setButtonLoading(btnSave, false);
    setStatus("Ese producto ya está en tu wishlist.");
    return;
  }

  await setWishlist([item, ...list]);
  setButtonLoading(btnSave, false);
  flashButtonSuccess(btnSave);
  setStatus("Guardado en tu wishlist.");
  hideAiResult();
  await renderList({ newItemId: item.id, stagger: true });
};

const prioritize = async () => {
  const profile = await getProfile();
  const items = await getWishlist();
  const btnPrioritize = $("btnPrioritize");
  const wishlist = $("wishlist");

  if (!profile.monthlyBudgetMXN || profile.monthlyBudgetMXN <= 0) {
    setStatus("Configura tu presupuesto en Perfil.", true);
    return;
  }

  setButtonLoading(btnPrioritize, true);
  wishlist.classList.add("is-prioritizing");
  hideAiResult();
  setStatus("Priorizando con IA…");

  chrome.runtime.sendMessage(
    { type: "PRIORITIZE", items, profile },
    async (response) => {
      wishlist.classList.remove("is-prioritizing");
      setButtonLoading(btnPrioritize, false);
      btnPrioritize.disabled = items.length === 0;

      if (chrome.runtime.lastError) {
        setStatus(chrome.runtime.lastError.message, true);
        return;
      }

      if (!response?.ok) {
        setStatus(response?.error || "Error desconocido", true);
        return;
      }

      renderAiResult(response.data);
      setStatus("Listo.");

      const map = {};
      for (const v of response.data.verdicts || []) {
        map[v.id] = v;
      }
      await renderList({
        verdictMap: map,
        animateVerdicts: true,
        stagger: true,
      });
    },
  );
};

$("btnSave").addEventListener("click", saveCurrentPage);
$("btnPrioritize").addEventListener("click", prioritize);
$("openOptions").addEventListener("click", (e) => {
  e.preventDefault();
  chrome.runtime.openOptionsPage();
});

renderList({ stagger: true });
