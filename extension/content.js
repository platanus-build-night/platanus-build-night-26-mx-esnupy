/**
 * Extrae datos de producto en cualquier tienda.
 * Amazon y Mercado Libre tienen extractores dedicados; el resto usa heurísticas genéricas.
 */

const PRIORA_FLAG = "__prioraContentLoaded";

const parsePrice = (text) => {
  if (!text) return 0;
  const normalized = String(text).trim();
  const match = normalized.match(/[\d][\d.,]*/);
  if (!match) return 0;
  let num = match[0];
  if (num.includes(",") && num.includes(".")) {
    num = num.replace(/,/g, "");
  } else if (num.includes(",") && !num.includes(".")) {
    const parts = num.split(",");
    num = parts.length === 2 && parts[1].length <= 2
      ? `${parts[0]}.${parts[1]}`
      : num.replace(/,/g, "");
  }
  const n = parseFloat(num);
  return Number.isFinite(n) ? n : 0;
};

const siteLabel = () => {
  const host = location.hostname.replace(/^www\./i, "");
  const parts = host.split(".");
  if (parts.length >= 2) {
    return parts.slice(-2).join(".");
  }
  return host || "tienda";
};

const pickImageUrl = (value) => {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (Array.isArray(value)) {
    for (const entry of value) {
      const url = pickImageUrl(entry);
      if (url) return url;
    }
    return "";
  }
  if (typeof value === "object") {
    return value.url || value.contentUrl || value["@id"] || "";
  }
  return "";
};

const collectJsonLdProducts = (node, out = []) => {
  if (!node) return out;
  if (Array.isArray(node)) {
    for (const item of node) collectJsonLdProducts(item, out);
    return out;
  }
  if (typeof node !== "object") return out;

  const type = node["@type"];
  const types = Array.isArray(type) ? type : type ? [type] : [];
  if (types.some((t) => /product/i.test(String(t)))) {
    out.push(node);
  }

  if (node["@graph"]) collectJsonLdProducts(node["@graph"], out);
  return out;
};

const priceFromOffer = (offers) => {
  if (!offers) return 0;
  const list = Array.isArray(offers) ? offers : [offers];
  for (const offer of list) {
    const raw =
      offer?.price ??
      offer?.lowPrice ??
      offer?.highPrice ??
      offer?.priceSpecification?.price;
    const price = parsePrice(raw);
    if (price > 0) return price;
  }
  return 0;
};

const extractFromJsonLd = () => {
  const scripts = document.querySelectorAll(
    'script[type="application/ld+json"]',
  );
  for (const script of scripts) {
    try {
      const data = JSON.parse(script.textContent);
      const products = collectJsonLdProducts(data);
      for (const product of products) {
        const title = product.name || product.title || "";
        const price = priceFromOffer(product.offers);
        const imageUrl = pickImageUrl(product.image);
        if (title) {
          return { title, price, imageUrl, currency: product.offers?.priceCurrency || "MXN" };
        }
      }
    } catch {
      /* siguiente script */
    }
  }
  return null;
};

const metaContent = (selectors) => {
  for (const selector of selectors) {
    const el = document.querySelector(selector);
    const value = el?.getAttribute("content") || el?.content;
    if (value?.trim()) return value.trim();
  }
  return "";
};

const extractFromMeta = () => {
  const title =
    metaContent([
      'meta[property="og:title"]',
      'meta[name="twitter:title"]',
      'meta[itemprop="name"]',
    ]) || "";

  const imageUrl =
    metaContent([
      'meta[property="og:image"]',
      'meta[name="twitter:image"]',
      'meta[itemprop="image"]',
    ]) || "";

  const priceRaw =
    metaContent([
      'meta[property="product:price:amount"]',
      'meta[property="og:price:amount"]',
      'meta[itemprop="price"]',
      'meta[name="price"]',
    ]) || "";

  const currency =
    metaContent([
      'meta[property="product:price:currency"]',
      'meta[property="og:price:currency"]',
      'meta[itemprop="priceCurrency"]',
    ]) || "MXN";

  return {
    title,
    price: parsePrice(priceRaw),
    imageUrl,
    currency,
  };
};

const extractFromDom = () => {
  const title =
    document.querySelector('[itemprop="name"]')?.textContent?.trim() ||
    document.querySelector("h1")?.textContent?.trim() ||
    document.title?.trim() ||
    "";

  const priceEl =
    document.querySelector('[itemprop="price"]') ||
    document.querySelector("[data-price]") ||
    document.querySelector(".price") ||
    document.querySelector(".product-price");

  const price =
    parsePrice(priceEl?.getAttribute("content")) ||
    parsePrice(priceEl?.getAttribute("data-price")) ||
    parsePrice(priceEl?.textContent);

  const imageEl =
    document.querySelector('[itemprop="image"]') ||
    document.querySelector(".product-image img") ||
    document.querySelector("main img");

  const imageUrl =
    imageEl?.src ||
    imageEl?.getAttribute("content") ||
    imageEl?.getAttribute("href") ||
    "";

  return { title, price, imageUrl, currency: "MXN" };
};

const mergeProduct = (...parts) => {
  const merged = { title: "", price: 0, imageUrl: "", currency: "MXN" };
  for (const part of parts) {
    if (!part) continue;
    if (!merged.title && part.title) merged.title = part.title;
    if (!merged.price && part.price) merged.price = part.price;
    if (!merged.imageUrl && part.imageUrl) merged.imageUrl = part.imageUrl;
    if (part.currency) merged.currency = part.currency;
  }
  return merged;
};

const extractAmazon = () => {
  const title =
    document.querySelector("#productTitle")?.textContent?.trim() ||
    document.querySelector("h1")?.textContent?.trim() ||
    "";

  const priceEl =
    document.querySelector(".a-price .a-offscreen") ||
    document.querySelector("#corePrice_feature_div .a-offscreen") ||
    document.querySelector("#priceblock_ourprice");

  const price = parsePrice(priceEl?.textContent || "");

  const image =
    document.querySelector("#landingImage")?.src ||
    document.querySelector("#imgTagWrapperId img")?.src ||
    "";

  return {
    title,
    price,
    currency: "MXN",
    url: location.href,
    imageUrl: image,
    site: "amazon",
  };
};

const extractMercadoLibre = () => {
  const title =
    document.querySelector("h1.ui-pdp-title")?.textContent?.trim() ||
    document.querySelector("h1")?.textContent?.trim() ||
    "";

  const priceContainer =
    document.querySelector(".ui-pdp-price__second-line") ||
    document.querySelector("[data-testid='price-part']") ||
    document.querySelector(".andes-money-amount");

  const fraction =
    priceContainer?.querySelector(".andes-money-amount__fraction")
      ?.textContent || priceContainer?.textContent;
  const price = parsePrice(fraction || "");

  const image =
    document.querySelector(".ui-pdp-gallery__figure img")?.src ||
    document.querySelector("figure img")?.src ||
    "";

  return {
    title,
    price,
    currency: "MXN",
    url: location.href,
    imageUrl: image,
    site: "mercadolibre",
  };
};

const extractGeneric = () => {
  const fromLd = extractFromJsonLd();
  const fromMeta = extractFromMeta();
  const fromDom = extractFromDom();
  const { title, price, imageUrl, currency } = mergeProduct(
    fromLd,
    fromMeta,
    fromDom,
  );

  return {
    title,
    price,
    currency,
    url: location.href,
    imageUrl,
    site: siteLabel(),
  };
};

const extractProduct = () => {
  const host = location.hostname;
  if (host.includes("amazon")) return extractAmazon();
  if (host.includes("mercadolibre")) return extractMercadoLibre();
  return extractGeneric();
};

if (!globalThis[PRIORA_FLAG]) {
  globalThis[PRIORA_FLAG] = true;

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message?.type === "GET_PRODUCT") {
      const data = extractProduct();
      sendResponse({ ok: true, product: data });
    }
    return true;
  });
}
