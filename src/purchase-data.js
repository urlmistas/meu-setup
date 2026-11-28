export const deliveryLabels = {
  unset: 'A informar',
  awaiting: 'Aguardando envio',
  transit: 'Em trânsito',
  received: 'Recebido',
  tested: 'Testado',
}

export const received = part => ['received', 'tested'].includes(part.purchase?.delivery)
export const readList = value => Array.isArray(value) ? value : []
export const currency = new Intl.NumberFormat('pt-BR', {style: 'currency', currency: 'BRL'})
export const formatDateTime = new Intl.DateTimeFormat('pt-BR', {dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Sao_Paulo'})
const formatDate = new Intl.DateTimeFormat('pt-BR', {dateStyle: 'short', timeZone: 'UTC'})
export const dayKey = () => new Intl.DateTimeFormat('sv-SE', {timeZone: 'America/Sao_Paulo'}).format()
export const safeLink = value => typeof value === 'string' && /^https?:\/\//i.test(value) ? value : null

export function deadline(date, today) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date || '')) return null
  const time = Date.parse(date + 'T00:00:00Z')
  if (!Number.isFinite(time)) return null
  const days = (time - Date.parse(today + 'T00:00:00Z')) / 86400000
  return {
    date: formatDate.format(time),
    label: days < 0 ? 'Vencido' : days === 0 ? 'Vence hoje' : days <= 14 ? `Vence em ${days} d` : '',
    urgent: days >= 0 && days <= 14,
  }
}

export function logChange(data, label, description, at = new Date().toISOString()) {
  return {...data, activity: [{id: crypto.randomUUID(), label, description, at}, ...readList(data.activity)].slice(0, 100)}
}

export function radarChanges(quotes) {
  return Object.entries(quotes).flatMap(([id, history]) => {
    const changes = []
    const rows = history.quotes ?? []
    for (let index = 0; index < rows.length - 1; index++) {
      const current = rows[index]
      const previous = rows[index + 1]
      if (current.cents === previous.cents) continue
      changes.push({
        id: 'radar-' + id + '-' + current.at,
        label: current.cents < previous.cents ? 'Preço caiu' : 'Preço subiu',
        description: `${history.name} · ${currency.format(previous.cents / 100)} → ${currency.format(current.cents / 100)} · ${current.store}`,
        at: current.at,
      })
    }
    return changes
  })
}
