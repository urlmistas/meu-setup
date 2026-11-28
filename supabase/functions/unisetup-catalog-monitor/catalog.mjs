const stores = {
  kabum: "KaBuM!",
  pichau: "Pichau",
  terabyte: "Terabyte",
  terabyteshop: "Terabyte",
  amazon: "Amazon",
  amazoncombr: "Amazon",
  amazonbrasil: "Amazon",
};

const normalize = value => String(value ?? "").normalize("NFKD")
  .replace(/[\u0300-\u036f]/g, "").toLowerCase();
const tokens = value => normalize(value).match(/[a-z0-9]+/g) ?? [];
const lettersAndNumbers = value => /[a-z]/i.test(value) && /[0-9]/.test(value);

export function modelOf(target) {
  const details = String(target.details ?? "").split("·")[0].trim();
  const last = String(target.name ?? "").trim().split(/\s+/).at(-1) ?? "";
  const code = /^[a-z0-9][a-z0-9-]{3,47}$/i;
  if (code.test(details) && lettersAndNumbers(details)) return details;
  if (code.test(last) && lettersAndNumbers(last) && !/^(cl\d+|ddr\d+|\d+gb)$/i.test(last)) return last;
  return "";
}

function providerUrl(raw, path) {
  try {
    const url = new URL(raw);
    if (url.origin === "https://api.pcfinder.com.br" && !url.username && !url.password &&
      url.pathname.startsWith(path) && url.href.length <= 700) return url.href;
  } catch {}
  return "";
}

function exactModel(model, title) {
  const parts = tokens(model);
  if (!parts.length) return false;
  const pattern = parts.join("[^a-z0-9]*");
  const regex = new RegExp(`(?:^|[^a-z0-9])${pattern}(?:$|[^a-z0-9])`);
  return regex.test(normalize(title));
}

export function selectQuotes(target, products) {
  const model = modelOf(target);
  if (!model) return [];
  const quotes = new Map();
  for (const offer of products) {
    const store = stores[tokens(offer.soldBy).join("")];
    if (typeof store !== "string" || !exactModel(model, offer.name)) continue;
    const url = providerUrl(offer.offerUrl, "/api/v1/r/");
    const cents = Math.round(Number(offer.priceAmount) * 100);
    if (!url || !Number.isInteger(cents) || cents <= 0 || cents > 100_000_000) continue;
    const photo = providerUrl(offer.imageUrl, "/api/v1/i/");
    const existingKabumSku = store === "KaBuM!" && typeof target.url === "string" &&
      target.url.match(/^https:\/\/(?:www\.)?kabum\.com\.br\/produto\/(\d+)(?:\/|$)/)?.[1];
    const offerKey = existingKabumSku || `catalog:${store}:${tokens(model).join("")}`;
    const existing = quotes.get(store);
    if (!existing || cents < existing.cents) quotes.set(store, { store, cents, url, photo, offerKey });
  }
  return [...quotes.values()].sort((a, b) => a.cents - b.cents);
}

export function unpackSearch(raw) {
  const body = raw.trim();
  const data = body.startsWith("{") ? body : body.split(/\r?\n/).filter(line => line.startsWith("data:")).at(-1)?.slice(5).trim();
  if (!data) throw new Error("Catálogo sem resposta");
  const message = JSON.parse(data);
  if (message.error || message.result?.isError) throw new Error("Catálogo indisponível");
  const payload = message.result?.structuredContent ??
    JSON.parse(message.result?.content?.find(item => item.type === "text")?.text ?? "null");
  if (!Array.isArray(payload?.products)) throw new Error("Catálogo sem produtos válidos");
  return payload.products;
}
