import { modelOf, selectQuotes, unpackSearch } from "./catalog.mjs";
import { formatCatalogAlert, postAlert } from "./telegram.mjs";

const cronHash = "094bee2ae551a639e61a48264afb8577bb826da68316ba7308b09dabe70f5958";
const backend = Deno.env.get("SUPABASE_URL");
const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const botToken = Deno.env.get("UNISETUP_TELEGRAM_BOT_TOKEN");
const channel = "@unisetup";
const catalogue = "https://mcp.pcfinder.com.br";

type Target = { id: string; name: string; details: string | null; url: string | null; target: number };

async function allowed(key: string) {
  if (!/^[a-f0-9]{64}$/.test(key)) return false;
  const bytes = new Uint8Array(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(key)));
  let mismatch = 0;
  for (let i = 0; i < bytes.length; i++) mismatch |= bytes[i] ^ parseInt(cronHash.slice(i * 2, i * 2 + 2),16);
  return mismatch === 0;
}

async function rpc(name: string, payload: Record<string, unknown>) {
  const response = await fetch(`${backend}/rest/v1/rpc/${name}`,{
    method:"POST",headers:{apikey:serviceKey!,authorization:`Bearer ${serviceKey}`,"content-type":"application/json"},
    body:JSON.stringify(payload),signal:AbortSignal.timeout(8000),
  });
  if (!response.ok) throw new Error("database_error");
  if (response.status === 204) return null;
  return response.json();
}

async function findProducts(search: string) {
  const r = await fetch(catalogue,{
    method:"POST",redirect:"error",
    headers:{accept:"application/json, text/event-stream","content-type":"application/json","MCP-Protocol-Version":"2025-03-26"},
    body:JSON.stringify({jsonrpc:"2.0",id:1,method:"tools/call",params:{
      name:"search_products",arguments:{search,pageSize:10,orderBy:"asc"},
    }}),signal:AbortSignal.timeout(8000),
  });
  if (!r.ok) throw new Error("catalogue_error");
  return unpackSearch(await r.text());
}

async function check(target: Target, mode: string) {
  const model = modelOf(target);
  const result = (status: string, data = {}) => ({id:target.id,status,...data});
  if (!model) return result("modelo_sem_codigo");
  let quotes = selectQuotes(target,await findProducts(model));
  if (!quotes.length && target.name !== model) quotes = selectQuotes(target,await findProducts(target.name.slice(0,140)));
  const quote = quotes[0];
  if (!quote) return result("sem_oferta_exata");
  const data = {store:quote.store,cents:quote.cents,stores:quotes.map(item=>item.store)};
  if (mode !== "check") {
    try {
      await rpc("unisetup_record_radar", {
        p_id: target.id, p_name: target.name, p_details: target.details, p_part_url: target.url,
        p_store: quote.store, p_url: quote.url, p_cents: quote.cents,
      });
    } catch {
      console.error("radar_write_error");
      if (mode === "radar") return result("radar_indisponivel", data);
    }
  }
  if (mode === "radar") return result("radar_atualizado", data);
  if (quote.cents >= Math.round(target.target * 100)) return result("acima_do_alvo",data);
  if (mode === "check") return result("abaixo_do_alvo",data);
  const reservation = {p_id:target.id,p_sku:quote.offerKey,p_cents:quote.cents};
  const claimed = await rpc("unisetup_claim_catalog_alert",{
    p_id:target.id,p_offer:quote.offerKey,p_name:target.name,p_details:target.details,p_cents:quote.cents,
  });
  if (claimed !== true) return result("ja_avisado_ou_item_alterado",data);
  let sent;
  try {
    sent = await postAlert({token:botToken!,channel,photo:quote.photo,
      text:formatCatalogAlert({...quote,name:target.name,target:target.target})});
  } catch {
    // An uncertain Telegram result must not trigger a duplicate on the next run.
    return result("envio_nao_confirmado",data);
  }
  if (sent.ok !== true) {
    if (sent.ok === false) await rpc("unisetup_finish_price_alert",{...reservation,p_message_id:null});
    return result("telegram_rejeitou",data);
  }
  await rpc("unisetup_finish_price_alert",{...reservation,p_message_id:sent.result.message_id});
  return result("publicado",{...data,messageId:sent.result.message_id});
}

Deno.serve(async req=>{
  if (req.method !== "POST") return new Response(null,{status:405});
  if (!await allowed(req.headers.get("x-unisetup-cron")??"")) return new Response(null,{status:401});
  const body = await req.json().catch(()=>null);
  if (body?.mode !== "check" && body?.mode !== "run" && body?.mode !== "radar") return new Response(null,{status:400});
  if (!backend || !serviceKey || (body.mode === "run" && !botToken)) return Response.json({error:"missing_env"},{status:503});
  try {
    const targets = await rpc("unisetup_catalog_targets",{}) as Target[];
    const results = [];
    for (let i = 0; i < targets.length; i += 3) {
      results.push(...await Promise.all(targets.slice(i,i+3).map(async target=>{
        try {return await check(target,body.mode);}
        catch {return {id:target.id,status:"consulta_indisponivel"};}
      })));
    }
    return Response.json({results});
  } catch {
    return Response.json({error:"database_error"},{status:502});
  }
});
