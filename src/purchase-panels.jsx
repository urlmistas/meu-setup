import React, {useEffect, useState} from 'react'
import {ArrowRight, ArrowUpRight, Edit03, Plus} from '@untitledui/icons'
import {Button, DateField, Input, SelectField, Tabs} from './ui'
import {currency, dayKey, deadline, deliveryLabels, formatDateTime, radarChanges, safeLink} from './purchase-data'
import './purchase-panels.css'

const displayMoney = value => Number.isFinite(value) ? currency.format(value) : '—'
const sum = (rows, field) => rows.reduce((total, row) => total + Math.round(row[field] * 100), 0) / 100
const panels = [
  ['spend', 'Gastos'], ['delivery', 'Entregas'], ['warranty', 'Garantias'], ['activity', 'Atividade'], ['upgrades', 'Upgrades'],
]

export function PurchasePanels({parts, upgrades, activity, radar, cloud, saving, onEdit, onUpgrade, onMove}) {
  const purchased = parts.filter(part => part.bought)
  const visitsKey = 'meu-setup-visit-v1:' + (cloud ? 'shared' : 'local')
  const [previousVisit] = useState(() => {
    try { return localStorage.getItem(visitsKey) } catch { return null }
  })
  useEffect(() => {
    try { localStorage.setItem(visitsKey, new Date().toISOString()) } catch {}
  }, [visitsKey])

  return <section className="setup-panel purchase-hub" aria-labelledby="purchase-hub-title">
    <h2 id="purchase-hub-title">Acompanhar o setup</h2>
    <Tabs.Root defaultValue="spend">
      <Tabs.List className="purchase-tabs" aria-label="Acompanhamento do setup">
        {panels.map(([id, label]) => <Tabs.Tab key={id} value={id} render={<Button variant="ghost"/>}>{label}</Tabs.Tab>)}
      </Tabs.List>
      <Tabs.Panel value="spend"><Spending parts={purchased} onEdit={onEdit}/></Tabs.Panel>
      <Tabs.Panel value="delivery"><Deliveries parts={purchased} onEdit={onEdit}/></Tabs.Panel>
      <Tabs.Panel value="warranty"><Warranty parts={purchased} onEdit={onEdit}/></Tabs.Panel>
      <Tabs.Panel value="activity"><Activity events={[...activity, ...radarChanges(radar)]} previousVisit={previousVisit}/></Tabs.Panel>
      <Tabs.Panel value="upgrades"><Upgrades items={upgrades} saving={saving} onEdit={onUpgrade} onMove={onMove}/></Tabs.Panel>
    </Tabs.Root>
  </section>
}

function EditButton({part, onEdit}) {
  return <Button variant="ghost" onClick={() => onEdit(part)}><Edit03 size={14} aria-hidden="true"/>Editar</Button>
}

function Spending({parts, onEdit}) {
  const paid = parts.filter(part => Number.isFinite(part.paidPrice))
  const comparable = paid.filter(part => Number.isFinite(part.price))
  const difference = Math.round((sum(comparable, 'price') - sum(comparable, 'paidPrice')) * 100) / 100
  return <div className="purchase-tab-content">
    <h3>Paguei quanto?</h3>
    <dl className="spending-totals">
      <div><dt>Previsto nas compras</dt><dd>{displayMoney(sum(parts.filter(part => Number.isFinite(part.price)), 'price'))}</dd></div>
      <div><dt>Total pago registrado</dt><dd>{displayMoney(sum(paid, 'paidPrice'))}</dd></div>
      <div><dt>{difference < 0 ? 'Acima do previsto' : 'Economia registrada'}</dt><dd>{comparable.length ? displayMoney(Math.abs(difference)) : '—'}</dd></div>
    </dl>
    {paid.length < parts.length && <p>{parts.length - paid.length} {parts.length - paid.length === 1 ? 'compra sem valor pago' : 'compras sem valor pago'}.</p>}
    {parts.length ? <ul className="purchase-rows">{parts.map(part =>
      <li key={part.id}><div><strong>{part.name}</strong><p>Previsto {displayMoney(part.price)} · Pago {displayMoney(part.paidPrice)}</p></div><EditButton part={part} onEdit={onEdit}/></li>
    )}</ul> : <p>Nenhuma compra registrada.</p>}
  </div>
}

function Deliveries({parts, onEdit}) {
  const sorted = [...parts].sort((a,b) =>
    Object.keys(deliveryLabels).indexOf(a.purchase?.delivery || 'unset') -
    Object.keys(deliveryLabels).indexOf(b.purchase?.delivery || 'unset'))
  return <div className="purchase-tab-content">
    <h3>Comprei, mas ainda não chegou</h3>
    {parts.length ? <ul className="purchase-rows">{sorted.map(part => <li key={part.id}>
      <div><strong>{part.name}</strong><p>{deliveryLabels[part.purchase?.delivery] || deliveryLabels.unset}</p>
        <PurchaseLink url={part.purchase?.orderUrl}>Abrir pedido</PurchaseLink>
        <PurchaseLink url={part.purchase?.trackingUrl}>Rastrear entrega</PurchaseLink>
      </div><EditButton part={part} onEdit={onEdit}/>
    </li>)}</ul> : <p>As peças aparecem aqui quando você marca a compra.</p>}
  </div>
}

function PurchaseLink({url, children}) {
  const href = safeLink(url)
  return href && <a className="purchase-link" href={href} target="_blank" rel="noreferrer">{children}<ArrowUpRight size={12} aria-hidden="true"/></a>
}

function Warranty({parts, onEdit}) {
  const today = dayKey()
  return <div className="purchase-tab-content">
    <h3>Garantia e devolução</h3>
    {parts.length ? <ul className="purchase-rows">{parts.map(part => {
      const purchase = part.purchase ?? {}
      return <li key={part.id}><div><strong>{part.name}</strong>
        <Deadline label="Garantia" value={deadline(purchase.warrantyUntil, today)}/>
        <Deadline label="Devolução" value={deadline(purchase.returnUntil, today)}/>
        <PurchaseLink url={purchase.receiptUrl}>Comprovante</PurchaseLink>
        <PurchaseLink url={purchase.orderUrl}>Pedido</PurchaseLink>
      </div><EditButton part={part} onEdit={onEdit}/></li>
    })}</ul> : <p>Os prazos e comprovantes ficam nas peças compradas.</p>}
  </div>
}

function Deadline({label, value}) {
  return <p>{label} {value ? `até ${value.date}` : 'a informar'}{value?.label && <span className={value.urgent ? 'purchase-urgent' : ''}> · {value.label}</span>}</p>
}

function Activity({events, previousVisit}) {
  const sorted = [...events].filter(event => Number.isFinite(Date.parse(event.at))).sort((a,b) => b.at.localeCompare(a.at))
  const newCount = previousVisit ? sorted.filter(event => Date.parse(event.at) > Date.parse(previousVisit)).length : 0
  return <div className="purchase-tab-content">
    <h3>O que mudou desde a última visita</h3>
    {previousVisit && <p>{newCount ? `${newCount} ${newCount === 1 ? 'novidade' : 'novidades'} desde a última visita neste navegador.` : 'Nenhuma novidade desde a última visita neste navegador.'}</p>}
    {sorted.length ? <ol className="purchase-rows">{sorted.slice(0, 20).map(event => <li key={event.id}>
      <div><strong>{event.label}</strong><p>{event.description}</p></div>
      <time dateTime={event.at}>{formatDateTime.format(new Date(event.at))}</time>
    </li>)}</ol> : <p>As próximas alterações do espaço aparecem aqui.</p>}
  </div>
}

function Upgrades({items, saving, onEdit, onMove}) {
  return <div className="purchase-tab-content">
    <div className="setup-panel-heading"><h3>Upgrades futuros</h3><Button variant="outline" disabled={saving} onClick={() => onEdit()}><Plus size={14} aria-hidden="true"/>Adicionar upgrade</Button></div>
    {items.length ? <ul className="purchase-rows">{items.map(item =>
      <li key={item.id}><div><strong>{item.name}</strong><p>{item.category} · {displayMoney(item.price)}</p></div>
        <div className="purchase-row-actions"><EditButton part={item} onEdit={onEdit}/>
          <Button variant="outline" disabled={saving} onClick={() => onMove(item)}>Planejar compra<ArrowRight size={14} aria-hidden="true"/></Button>
        </div>
      </li>
    )}</ul> : <p>Guarde ideias para a próxima versão do PC.</p>}
  </div>
}

export function PurchaseFields({purchase = {}}) {
  return <fieldset className="purchase-fields">
    <legend>Entrega, garantia e devolução</legend>
    <SelectField name="delivery" label="Entrega" defaultValue={purchase.delivery || 'unset'} options={deliveryLabels}/>
    <div className="form-pair"><DateField name="returnUntil" label="Devolução até" defaultValue={purchase.returnUntil}/><DateField name="warrantyUntil" label="Garantia até" defaultValue={purchase.warrantyUntil}/></div>
    {[
      ['orderUrl','Link do pedido'], ['trackingUrl','Link de rastreio'], ['receiptUrl','Link do comprovante'],
    ].map(([field, label]) => <label key={field}>{label}<Input type="url" pattern="https?://.+" name={field} maxLength={2048} placeholder="https://" defaultValue={purchase[field]}/></label>)}
  </fieldset>
}
