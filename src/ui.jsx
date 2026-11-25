import React, {lazy, Suspense, useRef, useState} from 'react'
import { Dialog } from '@base-ui/react/dialog'
import { Input as InputPrimitive } from '@base-ui/react/input'
import { Progress as ProgressPrimitive } from '@base-ui/react/progress'
export { Tabs } from '@base-ui/react/tabs'
import { Popover } from '@base-ui/react/popover'
import { ScrollArea as ScrollAreaPrimitive } from '@base-ui/react/scroll-area'
import { Select } from '@base-ui/react/select'
import { Toast } from '@base-ui/react/toast'
import { Slot } from '@radix-ui/react-slot'
import { cva } from 'class-variance-authority'
import { Box, Calendar as CalendarIcon, Check, ChevronDown, XClose } from '@untitledui/icons'
import * as TooltipPrimitive from '@radix-ui/react-tooltip'

const Calendar = lazy(()=>import('./calendar'))
const button = cva('button inline-flex items-center justify-center gap-2', {variants:{variant:{default:'primary',outline:'outline',ghost:'ghost'}},defaultVariants:{variant:'default'}})

export function Button({asChild, variant, className='', ...props}) {
  const Component = asChild ? Slot : 'button'
  return <Component className={button({variant,className})} {...props}/>
}

export function Input({className='', ...props}) {
  return <InputPrimitive data-slot="input" className={'field '+className} {...props}/>
}

export function Badge({variant, ...props}) {
  return <span data-slot="badge" className={'badge '+variant} {...props}/>
}

export function Modal({open,onClose,title,children}) {
  const popupRef=useRef(null)
  return <Dialog.Root open={open} onOpenChange={value => !value && onClose()}>
    <Dialog.Portal>
      <Dialog.Backdrop className="overlay"/>
      <Dialog.Popup ref={popupRef} className="dialog" initialFocus={()=>popupRef.current?.querySelector('form input:not([type=hidden])')??true}>
        <Dialog.Title>{title}</Dialog.Title>
        <ScrollArea className="dialog-scroll">{children}</ScrollArea>
        <Tooltip label="Fechar" side="left">
          <Dialog.Close className={button({variant:'ghost',className:'close'})} aria-label="Fechar"><XClose size={19}/></Dialog.Close>
        </Tooltip>
      </Dialog.Popup>
    </Dialog.Portal>
  </Dialog.Root>
}

export const TooltipProvider = TooltipPrimitive.Provider

export function Tooltip({children, label, side = 'top'}) {
  return <TooltipPrimitive.Root>
    <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Content side={side} sideOffset={7} collisionPadding={12} className="tooltip">
        {label}<TooltipPrimitive.Arrow width={12} height={6} className="tooltip-arrow"/>
      </TooltipPrimitive.Content>
    </TooltipPrimitive.Portal>
  </TooltipPrimitive.Root>
}

export function Empty({title,description,children}) {
  return <div className="empty-state" data-slot="empty">
    <div data-slot="empty-header">
      <span data-slot="empty-media"><Box size={23}/></span>
      <h3 data-slot="empty-title">{title}</h3>
      {description&&<p data-slot="empty-description">{description}</p>}
    </div>
    {children&&<div data-slot="empty-content">{children}</div>}
  </div>
}

export function Progress({value,label}) {
  return <ProgressPrimitive.Root value={value} aria-label={label} data-slot="progress">
    <ProgressPrimitive.Track className="track">
      <ProgressPrimitive.Indicator className="progress-indicator"/>
    </ProgressPrimitive.Track>
  </ProgressPrimitive.Root>
}

export function SelectField({name, label, defaultValue, options}) {
  return <div className="form-field">
    <span id={name+'-label'}>{label}</span>
    <Select.Root name={name} defaultValue={defaultValue} items={options}>
      <Select.Trigger className="field field-trigger" aria-labelledby={name+'-label'}>
        <Select.Value/><Select.Icon><ChevronDown size={15}/></Select.Icon>
      </Select.Trigger>
      <Select.Portal><Select.Positioner sideOffset={6} alignItemWithTrigger={false} className="popup-positioner">
        <Select.Popup className="popup-list select-popup">
          <ScrollArea className="select-scroll" viewport={<Select.List/>}>{Object.entries(options).map(([value,text])=><Select.Item key={value} value={value} className="popup-item">
            <Select.ItemText>{text}</Select.ItemText><Select.ItemIndicator><Check size={14}/></Select.ItemIndicator>
          </Select.Item>)}</ScrollArea>
        </Select.Popup>
      </Select.Positioner></Select.Portal>
    </Select.Root>
  </div>
}

export function DateField({name, label, defaultValue}) {
  const [value,setValue]=useState(defaultValue??'')
  const [open,setOpen]=useState(false)
  const [year,month,day]=value.split('-').map(Number)
  const selected=value?new Date(year,month-1,day):undefined
  const formatted=selected?selected.toLocaleDateString('pt-BR'):'Selecionar data'

  function selectDate(date) {
    setValue(date?date.toLocaleDateString('sv-SE'):'')
    setOpen(false)
  }

  return <div className="form-field">
    <span id={name+'-label'}>{label}</span>
    <input type="hidden" name={name} value={value}/>
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger className="field field-trigger" aria-labelledby={name+'-label '+name+'-value'}>
        <span id={name+'-value'}>{formatted}</span><CalendarIcon size={16}/>
      </Popover.Trigger>
      <Popover.Portal><Popover.Positioner sideOffset={6} collisionPadding={10} className="popup-positioner">
        <Popover.Popup className="popup-list calendar-popup">
          <Suspense fallback={<div className="calendar-skeleton" role="status"><span className="sr-only">Carregando calendário</span><div data-slot="skeleton"/></div>}>
            <Calendar selected={selected} onSelect={selectDate}/>
          </Suspense>
          {selected&&<Button type="button" variant="ghost" onClick={()=>selectDate()}>Limpar data</Button>}
        </Popover.Popup>
      </Popover.Positioner></Popover.Portal>
    </Popover.Root>
  </div>
}

export function ScrollArea({children,className,viewport}) {
  return <ScrollAreaPrimitive.Root className={className} data-slot="scroll-area">
    <ScrollAreaPrimitive.Viewport className="scroll-viewport" render={viewport}><ScrollAreaPrimitive.Content>{children}</ScrollAreaPrimitive.Content></ScrollAreaPrimitive.Viewport>
    {['vertical','horizontal'].map(orientation=><ScrollAreaPrimitive.Scrollbar key={orientation} orientation={orientation} className="scrollbar">
      <ScrollAreaPrimitive.Thumb className="scroll-thumb"/>
    </ScrollAreaPrimitive.Scrollbar>)}
    <ScrollAreaPrimitive.Corner/>
  </ScrollAreaPrimitive.Root>
}

export const toast=Toast.createToastManager()

export function Toaster({children}) {
  return <Toast.Provider toastManager={toast} timeout={3200}>
    {children}
    <Toast.Portal><Toast.Viewport className="toast-viewport"><ToastList/></Toast.Viewport></Toast.Portal>
  </Toast.Provider>
}

function ToastList() {
  const {toasts}=Toast.useToastManager()
  return toasts.map(item=><Toast.Root key={item.id} toast={item} className="toast">
    <Toast.Content className="toast-content">
      <Check size={17}/><div><Toast.Title/><Toast.Description/></div>
      <Toast.Close aria-label="Fechar aviso"><XClose size={17}/></Toast.Close>
    </Toast.Content>
  </Toast.Root>)
}
