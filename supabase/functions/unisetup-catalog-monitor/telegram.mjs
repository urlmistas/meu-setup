const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const escapeHtml = value => String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;").replaceAll('"', "&quot;");

export function formatAlert({ name, target, cents, installments, sku, url }) {
  return [
    `<b>${escapeHtml(String(name).replace(/[\r\n]+/g, " ").slice(0, 140))}</b> 🔥`,
    "",
    `❗️Valor previsto: ${money.format(target)}`,
    "",
    `Por ${money.format(cents / 100)} [PIX] + Frete`,
    ...(installments ? [`Ou em até ${installments}x sem juros 💳`] : []),
    "",
    `🔗 Link: <a href="${escapeHtml(url)}">kabum.com.br/produto/${escapeHtml(sku)}</a>`,
    "🛒 KaBuM!",
  ].join("\n");
}

export async function postAlert({ token, channel, text, photo, send = fetch }) {
  async function call(method, content) {
    const response = await send(`https://api.telegram.org/bot${token}/${method}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ chat_id: channel, parse_mode: "HTML", ...content }),
      signal: AbortSignal.timeout(12000),
    });
    return response.json();
  }
  if (photo) {
    const result = await call("sendPhoto", { photo, caption: text, show_caption_above_media: true });
    if (result.ok !== false) return result;
    // Retry without the photo only when Telegram explicitly rejected the first request.
    if (result.error_code !== 400) return result;
  }
  return call("sendMessage", { text, link_preview_options: { is_disabled: true } });
}

export function formatCatalogAlert({ name, target, cents, store, url }) {
  return [
    `<b>${escapeHtml(String(name).replace(/[\r\n]+/g, " ").slice(0, 140))}</b> 🔥`,
    "",
    `❗️Valor previsto: ${money.format(target)}`,
    "",
    `Preço encontrado: ${money.format(cents / 100)} + Frete`,
    "Confira estoque e forma de pagamento na loja.",
    "",
    `🔗 <a href="${escapeHtml(url)}">Ver oferta na ${escapeHtml(store)}</a>`,
    `🛒 ${escapeHtml(store)} · Via PCFinder`,
  ].join("\n");
}
