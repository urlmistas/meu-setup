import React, { useState } from 'react'
import { ChevronLeft, ChevronRight, Check } from '@untitledui/icons'
import { Button } from './ui'
import './pc-build.css'

const positions = {
  Gabinete: 'case',
  'Placa-mãe': 'board',
  Processador: 'cpu',
  Cooler: 'cooler',
  Memória: 'ram',
  SSD: 'ssd',
  'Placa de vídeo': 'gpu',
  Fonte: 'psu',
}

const peripheralSlots = {
  Monitor: 'monitor',
  Teclado: 'keyboard',
  Mouse: 'mouse',
  Mousepad: 'mousepad',
}

export default function PcBuild({ parts }) {
  const [angle, setAngle] = useState(-28)
  const [fullView, setFullView] = useState(false)
  const purchased = parts.filter(part => part.bought)
  const internal = purchased.filter(part => Object.hasOwn(positions, part.category))
  const slots = new Set(internal.map(part => positions[part.category]))
  const accessories = purchased.filter(part => !Object.hasOwn(positions, part.category))
  const peripherals = new Set(accessories.filter(part => Object.hasOwn(peripheralSlots, part.category)).map(part => peripheralSlots[part.category]))
  const hasIncludedFans = internal.some(part => part.category === 'Gabinete' &&
    /xtreme\s+glacier|\br41b\b/i.test(part.name + ' ' + (part.details ?? '')))

  return (
    <section className="pc-build" aria-labelledby="pc-build-title">
      <div className="pc-build-stage">
        <div className={'pc-build-scene' + (fullView ? ' pc-full-view' : '')} aria-hidden="true">
          <div className="pc-build-shadow" />
          {fullView && <div className="pc-desk">
            {[...peripherals].map(slot => <div key={slot} className={'pc-desk-' + slot}><i /></div>)}
          </div>}
          <div className="pc-build-tower" style={{ '--pc-angle': angle + 'deg' }}>
            <div className={'pc-frame' + (slots.has('case') ? ' pc-frame-owned' : '')}>
              <i className="pc-frame-back" /><i className="pc-frame-top" />
              <i className="pc-frame-side" /><i className="pc-frame-front" />
            </div>
            {[...slots].filter(slot => slot !== 'case').map(slot => (
              <div key={slot} className={'pc-component pc-' + slot}>
                <i />{slot === 'psu' && <><b /><span>FONTE</span></>}
              </div>
            ))}
            {hasIncludedFans && <div className="pc-case-fans"><i /><i /><i /></div>}
          </div>
        </div>
        <div className="pc-build-controls" role="group" aria-label="Girar visualização do PC">
          <Button variant="ghost" aria-label="Girar para a esquerda" disabled={angle <= -55} onClick={() => setAngle(value => Math.max(-55, value - 16))}><ChevronLeft size={18} /></Button>
          <Button variant="ghost" onClick={() => setAngle(-28)} aria-label="Redefinir rotação">3D</Button>
          <Button variant="ghost" aria-label="Girar para a direita" disabled={angle >= 36} onClick={() => setAngle(value => Math.min(36, value + 16))}><ChevronRight size={18} /></Button>
        </div>
      </div>
      <div className="pc-build-details">
        <h2 id="pc-build-title">Seu PC em 3D</h2>
        <p>Marque uma peça como comprada para vê-la na montagem. Os modelos são ilustrativos.</p>
        <Button className="pc-view-switch" variant="outline" onClick={() => setFullView(value => !value)}>
          {fullView ? 'Voltar à visão do gabinete' : 'Ver setup completo'}
        </Button>
        <div className="pc-build-inventory" aria-live="polite">
          <h3>No PC · {internal.length}</h3>
          {internal.length ? <PartList parts={internal} /> : <p>Nenhuma peça interna comprada ainda.</p>}
          {hasIncludedFans && <p>3 ventoinhas inclusas no gabinete</p>}
          {accessories.length > 0 && <>
            <h3>Fora do gabinete · {accessories.length}</h3>
            <PartList parts={accessories} />
          </>}
        </div>
      </div>
    </section>
  )
}

function PartList({ parts }) {
  return <ul>{parts.map(part => (
    <li key={part.id}><Check size={14} aria-hidden="true" /><span>{part.name}</span></li>
  ))}</ul>
}
