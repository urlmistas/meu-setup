import React from 'react'
import { DayPicker } from 'react-day-picker'
import { ptBR } from 'react-day-picker/locale'
import 'react-day-picker/style.css'

export default function Calendar({selected,onSelect}) {
  return <DayPicker mode="single" locale={ptBR} className="calendar"
    selected={selected} defaultMonth={selected} onSelect={onSelect}/>
}
