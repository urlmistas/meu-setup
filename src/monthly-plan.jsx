import React, {useState} from 'react'
import {Calendar, Check} from '@untitledui/icons'
import {Button, Input} from './ui'
import {currency, dayKey} from './purchase-data'

const monthFormat = new Intl.DateTimeFormat('pt-BR', {month:'long', year:'numeric', timeZone:'UTC'})
const validMonth = value => /^\d{4}-(0[1-9]|1[0-2])$/.test(value ?? '') && value.slice(0, 4) !== '0000'
const monthOf = value => typeof value === 'string' && validMonth(value.slice(0, 7)) ? value.slice(0, 7) : ''
const monthName = value => value ? monthFormat.format(new Date(value + '-01T00:00:00Z')) : 'Sem mês definido'
const cents = value => Number.isFinite(value) && value >= 0 ? Math.round(value * 100) : null
const money = value => currency.format(value / 100)

export default function MonthlyPlan({parts, limits = {}, saving, onSave}) {
  const currentMonth = dayKey().slice(0, 7)
  const [budgetMonth, setBudgetMonth] = useState(currentMonth)
  const [simulation, setSimulation] = useState({id:'', month:currentMonth})
  const [message, setMessage] = useState(null)
  const pending = parts.filter(part => !part.bought)
  const moving = pending.find(part => part.id === simulation.id)
  const target = moving && validMonth(simulation.month) ? simulation.month : ''
  const months = new Set([currentMonth, ...Object.keys(limits).filter(validMonth)])
  const grouped = new Map()

  for (const part of parts) {
    const month = part.bought ? monthOf(part.boughtDate)
      : part === moving && target ? target : monthOf(part.dueDate)
    if (!month && part.bought) continue
    months.add(month)
    const group = grouped.get(month) ?? {paid:0, planned:0, missingPaid:0, missingPrice:0, pending:[]}
    const amount = cents(part.bought ? part.paidPrice : part.price)
    if (part.bought) {
      group.paid += amount ?? 0
      if (amount === null) group.missingPaid++
    } else {
      group.planned += amount ?? 0
      if (amount === null) group.missingPrice++
      group.pending.push(part)
    }
    grouped.set(month, group)
  }
  if (target && monthOf(moving.dueDate)) months.add(monthOf(moving.dueDate))
  const ordered = [...months].sort((a,b) => (a || '9999-99').localeCompare(b || '9999-99'))

  async function save(event) {
    event.preventDefault()
    const raw = new FormData(event.currentTarget).get('monthlyLimit')
    const value = raw === '' ? null : cents(Number(raw))
    if (!validMonth(budgetMonth) || (raw !== '' && value === null)) return
    const updated = {...limits}
    if (value === null) delete updated[budgetMonth]
    else updated[budgetMonth] = value / 100
    const success = await onSave(updated, monthName(budgetMonth))
    setMessage(success ? {text:'Limite mensal atualizado.'} : {text:'Não foi possível salvar o limite.', error:true})
  }

  return <div className="purchase-tab-content monthly-plan">
    <h3>Plano de compras por mês</h3>
    <p>As compras pendentes seguem a data «Comprar até». Os valores pagos entram no mês da compra.</p>
    <form className="monthly-controls" onSubmit={save}>
      <label>Mês do limite<Input required type="month" value={budgetMonth} onChange={event => {
        setBudgetMonth(event.target.value)
        setMessage(null)
      }}/></label>
      <label>Limite de gastos (R$)<Input key={budgetMonth} name="monthlyLimit" type="number" min="0" step="0.01" max="9999999" inputMode="decimal" defaultValue={limits[budgetMonth] ?? ''} placeholder="Vazio remove o limite"/></label>
      <Button type="submit" variant="outline" disabled={saving}><Check size={14} aria-hidden="true"/>Salvar limite</Button>
    </form>
    {message && <p role={message.error ? 'alert' : 'status'}>{message.text}</p>}
    {pending.length > 0 && <fieldset className="monthly-controls monthly-simulation">
      <legend>Simular mudança de mês</legend>
      <label>Peça<select className="field" value={simulation.id} onChange={event => setSimulation({...simulation, id:event.target.value})}>
        <option value="">Escolha uma peça</option>
        {pending.map(part => <option key={part.id} value={part.id}>{part.name}</option>)}
      </select></label>
      <label>Mês simulado<Input type="month" value={simulation.month} onChange={event => setSimulation({...simulation, month:event.target.value})}/></label>
      {moving && <Button variant="ghost" onClick={() => setSimulation({id:'', month:currentMonth})}><Calendar size={14} aria-hidden="true"/>Limpar simulação</Button>}
    </fieldset>}
    {target && <p className="month-simulation-note" role="status">Simulação de {moving.name} para {monthName(target)}. A data cadastrada continua igual.</p>}
    <ul className="monthly-grid">{ordered.map(month =>
      <Month key={month} month={month} group={grouped.get(month)} limit={cents(limits[month])}/>
    )}</ul>
    {parts.some(part => part.bought && !monthOf(part.boughtDate)) && <p>Compras sem data ficam fora dos totais mensais.</p>}
  </div>
}

function Month({month, group, limit}) {
  const {paid, planned, missingPaid, missingPrice, pending} = group ?? {paid:0, planned:0, missingPaid:0, missingPrice:0, pending:[]}
  const balance = limit === null ? null : limit - paid - planned
  return <li className="monthly-card">
    <h4>{monthName(month)}</h4>
    <dl><div><dt>A comprar</dt><dd>{money(planned)}</dd></div>
      {month && <><div><dt>Pago</dt><dd>{money(paid)}</dd></div><div><dt>Limite</dt><dd>{limit === null ? 'A definir' : money(limit)}</dd></div></>}
    </dl>
    {balance !== null && <p className={balance < 0 ? 'purchase-urgent' : 'month-balance'}>
      {balance === 0 ? 'No limite' : `${money(Math.abs(balance))} ${balance < 0 ? 'acima do limite' : 'disponíveis'}`}
    </p>}
    {missingPaid + missingPrice > 0 && <p>{missingPaid + missingPrice} {missingPaid + missingPrice === 1 ? 'item sem valor informado' : 'itens sem valor informado'}</p>}
    {pending.length > 0 && <ul className="monthly-items">{pending.map(part =>
      <li key={part.id}><span>{part.name}</span><span>{cents(part.price) === null ? 'A definir' : money(cents(part.price))}</span></li>
    )}</ul>}
  </li>
}
