import React, { useEffect, useState } from 'react'
import { ArrowUpRight, RefreshCw01 } from '@untitledui/icons'
import { Button, Progress } from './ui'
import './setup-panels.css'

const steps = [
  ['parts', 'Conferir as peças e os acessórios'],
  ['board', 'Instalar processador, memória e SSD'],
  ['cooling', 'Montar o cooler e as ventoinhas'],
  ['power', 'Instalar a fonte e conectar os cabos'],
  ['gpu', 'Instalar a placa de vídeo'],
  ['boot', 'Testar o primeiro boot'],
  ['bios', 'Configurar a BIOS e ativar o EXPO, se compatível'],
  ['drivers', 'Instalar o sistema e os drivers'],
  ['tests', 'Testar temperaturas, estabilidade e FPS'],
]
const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
const timestamp = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Sao_Paulo' })
const money = cents => currency.format(cents / 100)
const assemblyCategories = new Set(['Gabinete', 'Fonte', 'Placa-mãe', 'Processador', 'Cooler', 'Memória', 'SSD', 'Placa de vídeo', 'Ventoinha'])

export function AssemblyChecklist({ parts, value, saving, onChange }) {
  const checked = Array.isArray(value) ? new Set(value) : new Set()
  const count = steps.filter(([id]) => checked.has(id)).length
  const assemblyParts = parts.filter(part => assemblyCategories.has(part.category))
  const missing = assemblyParts.filter(part => !part.bought)
  const locked = !assemblyParts.length || missing.length > 0
  const bought = assemblyParts.length - missing.length
  const [failed, setFailed] = useState(false)

  async function toggle(id, done) {
    setFailed(false)
    const next = done ? [...checked, id] : [...checked].filter(item => item !== id)
    setFailed(!await onChange(next))
  }

  return <section className="setup-panel assembly-panel" aria-labelledby="assembly-title">
    <div className="setup-panel-heading">
      <h2 id="assembly-title">Checklist de montagem</h2>
      <span>{locked ? `${bought} de ${assemblyParts.length} peças` : `${count} de ${steps.length} etapas`}</span>
    </div>
    {locked ? <>
      <Progress label="Peças compradas para a montagem" value={assemblyParts.length ? bought / assemblyParts.length * 100 : 0}/>
      {missing.length ? <>
        <p className="assembly-lock">{missing.length === 1 ? 'Falta 1 peça' : `Faltam ${missing.length} peças`} para liberar a checklist.</p>
        <ul className="assembly-missing">{missing.map(part => <li key={part.id}>{part.name}</li>)}</ul>
      </> : <p className="assembly-lock">Cadastre as peças do PC para acompanhar o que falta para montar.</p>}
    </> : <>
      <Progress label="Progresso da montagem" value={count / steps.length * 100}/>
      <ul className="assembly-steps">
        {steps.map(([id, label]) => <li key={id}>
          <label><input type="checkbox" checked={checked.has(id)} disabled={saving} onChange={event => toggle(id, event.target.checked)}/><span>{label}</span></label>
        </li>)}
      </ul>
      {failed && <p role="alert">A etapa não foi salva. Confira o aviso no fim da página.</p>}
    </>}
  </section>
}

export function OfferRadar({ parts, readRadar }) {
  const [state, setState] = useState({ status: 'loading', quotes: {} })
  const [refresh, setRefresh] = useState(0)
  useEffect(() => {
    if (!readRadar) return
    let current = true
    readRadar().then(quotes => {
      if (current) setState({ status: 'ready', quotes: quotes ?? {} })
    }).catch(() => {
      if (current) setState(previous => ({ ...previous, status: 'error' }))
    })
    return () => { current = false }
  }, [readRadar, refresh])

  const targets = parts.filter(part => part.price > 0)
  const rows = targets.map(part => {
    const history = state.quotes[part.id]
    const matching = history?.name === part.name && history.details === (part.details ?? null) && history.partUrl === (part.url ?? null)
    return { part, history: matching ? history : null }
  }).sort((a, b) => Number(Boolean(b.history)) - Number(Boolean(a.history)))

  return <section className="setup-panel radar-panel" aria-labelledby="radar-title">
    <div className="setup-panel-heading">
      <h2 id="radar-title">Radar de ofertas</h2>
      {readRadar && <Button variant="ghost" disabled={state.status === 'loading'} onClick={() => {
        setState(previous => ({ ...previous, status: 'loading' }))
        setRefresh(value => value + 1)
      }}><RefreshCw01 size={14} aria-hidden="true"/>Atualizar</Button>}
    </div>
    {!readRadar ? <p>Abra o espaço compartilhado para consultar os preços do monitor.</p> : <>
      <p>Preços anunciados. Confira estoque, Pix e frete na loja.</p>
      {state.status === 'error' && <p role="alert">O radar está indisponível. Tente atualizar.</p>}
      {state.status === 'loading' && <p role="status">Carregando preços…</p>}
      {!rows.length && <p>Nenhuma peça pendente com valor previsto.</p>}
      {rows.length > 0 && <ul className="radar-items">{rows.map(({part, history}) => (
        <RadarItem key={part.id} part={part} history={history}/>
      ))}</ul>}
    </>}
  </section>
}

function RadarItem({ part, history }) {
  const latest = history?.quotes[0]
  const diff = latest ? Math.round(part.price * 100) - latest.cents : 0
  return <li><details>
    <summary><span>{part.name}</span><strong>{latest ? money(latest.cents) : 'Sem cotação'}</strong></summary>
    <div className="radar-offer">
      <span>Valor previsto <strong>{currency.format(part.price)}</strong></span>
      {latest && <>
        <span>Menor registrado <strong>{money(history.lowest)}</strong></span>
        <span className={diff > 0 ? 'radar-savings' : ''}>{diff ? money(Math.abs(diff)) + (diff > 0 ? ' abaixo do previsto' : ' acima do previsto') : 'No valor previsto'}</span>
        <a href={latest.url} target="_blank" rel="noreferrer">Ver em {latest.store} <ArrowUpRight size={13}/></a>
        <h3>Consultas recentes</h3>
        <ul className="radar-history">{history.quotes.map((quote, index) =>
          <li key={index}><time dateTime={quote.at}>{timestamp.format(new Date(quote.at))}</time><span>{quote.store}</span><strong>{money(quote.cents)}</strong></li>
        )}</ul>
      </>}
    </div>
  </details></li>
}
