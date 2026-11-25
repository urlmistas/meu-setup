import React, {useEffect,useState} from 'react'
import {createRoot} from 'react-dom/client'
import {ArrowUpRight as ExternalLink, Edit03 as Pencil, Calendar, Check, Image01, Plus, SearchMd as Search, Wallet02 as Wallet} from '@untitledui/icons'
import {Button,Input,Modal,Tooltip,TooltipProvider,Badge,Empty,Progress,Tabs,SelectField,DateField,Toaster,toast} from './ui'
import '@fontsource-variable/inter'
import {freshSetup,loadSetup,storeSetup} from './setup-data'
import GamesCarousel,{loadGames} from './games-carousel'
import CloudGate from './cloud-gate'
import {supabase} from './cloud'
import ImageAttachment,{resolveImageAttachment} from './image-attachment'
import './style.css'

const categories=['Fonte','Gabinete','Placa de vídeo','Processador','Placa-mãe','Memória','SSD','Cooler','Mouse','Mousepad','Monitor','Outros']
const empty={category:'Fonte',name:'',details:'',price:null,bought:false,url:''}
const money=new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'})
const statuses={pending:'A comprar',research:'Pesquisando',bought:'Comprado'}
const tabs=[['all','Todos'],['pending','A comprar'],['research','Pesquisando'],['bought','Comprados']]
const priorities=['Alta','Média','Baixa']
const statusOf=part=>part.bought?'bought':part.researching?'research':'pending'
const dateFormat=new Intl.DateTimeFormat('pt-BR',{day:'2-digit',month:'short',year:'numeric',timeZone:'UTC'})
const showDate=value=>value?dateFormat.format(new Date(value+'T00:00:00Z')):'—'
const today=()=>new Date().toLocaleDateString('sv-SE')
const showPrice=value=>value==null?'A definir':value===0?'Incluso':money.format(value)

function PartImage({image}) {
 return <span className="part-image" aria-hidden="true">
  {image?<img src={image} alt="" loading="lazy" referrerPolicy="no-referrer"/>:<Image01 size={17}/>}
 </span>
}

function App({cloud}){
 const [data,setData]=useState(()=>cloud?(cloud.setup??freshSetup()):loadSetup())
 const [filter,setFilter]=useState('all')
 const [query,setQuery]=useState('')
 const [editor,setEditor]=useState(null)
 const [savingPart,setSavingPart]=useState(false)
 const [partError,setPartError]=useState('')
 const [budgetEditor,setBudgetEditor]=useState(false)
 const [storageError,setStorageError]=useState('')
 const [savingSetup,setSavingSetup]=useState(false)
 const {parts,budget}=data
 useEffect(()=>{if(!cloud){try{storeSetup(data)}catch{setStorageError('O navegador bloqueou o salvamento das alterações.')}}},[data,cloud])
 const pendingParts=parts.filter(part=>!part.bought)
 const completed=parts.length-pendingParts.length
 const progress=parts.length?Math.round(completed/parts.length*100):0
 const sum=list=>list.reduce((total,p)=>total+Math.round((p.price??0)*100),0)/100
 const planned=sum(pendingParts)
 const spent=sum(parts.filter(p=>p.bought).map(p=>({...p,price:p.paidPrice??p.price})))
 const normalized=query.trim().toLocaleLowerCase('pt-BR')
 const matching=parts.filter(p=>[p.name,p.category,p.details].some(value=>value?.toLocaleLowerCase('pt-BR').includes(normalized)))
 const visible=matching.filter(p=>filter==='all'||statusOf(p)===filter)
 const upcoming=[...pendingParts].sort((a,b)=>(a.dueDate||'9999').localeCompare(b.dueDate||'9999')||
  priorities.indexOf(a.priority||'Baixa')-priorities.indexOf(b.priority||'Baixa')).slice(0,2)

 async function persistSetup(updated) {
  if (savingSetup) return false
  setSavingSetup(true)
  try {
   if(cloud) await cloud.saveSetup(updated)
   else storeSetup(updated)
   setData(updated)
   setStorageError('')
   return true
  } catch(error) {
   setStorageError(cloud?error.message:'O navegador bloqueou o salvamento das alterações.')
   return false
  } finally {
   setSavingSetup(false)
  }
 }

 async function markBought(part) {
  const updatedParts=parts.map(item=>item.id===part.id?{
   ...item,bought:true,researching:false,boughtDate:today()
  }:item)
  if(await persistSetup({...data,parts:updatedParts})) toast.add({title:'Item comprado',description:part.name})
 }

 async function saveBudget(event) {
  event.preventDefault()
  const value=Number(new FormData(event.currentTarget).get('budget'))
  if(await persistSetup({...data,budget:value})) {
   setBudgetEditor(false)
   toast.add({title:'Meta atualizada'})
  }
 }

 function exportLocal() {
  const backup=new Blob([JSON.stringify({setup:data,games:loadGames()})],{type:'application/json'})
  const url=URL.createObjectURL(backup)
  const link=document.createElement('a')
  link.href=url
  link.download='meu-setup-backup.json'
  link.click()
  setTimeout(()=>URL.revokeObjectURL(url),1000)
 }
 function openPart(part) {
  setPartError('')
  setEditor(part)
 }

 async function save(event){
  event.preventDefault()
  if(savingPart) return
  const fields=new FormData(event.currentTarget)
  const name=String(fields.get('name')).trim()
  if(!name){event.currentTarget.elements.name.setCustomValidity('Informe o nome da peça.');event.currentTarget.elements.name.reportValidity();return}
  const status=fields.get('status')
  const bought=status==='bought'
  setSavingPart(true)
  setPartError('')
  try {
   let image
   try {
    image=await resolveImageAttachment(fields,editor.image,{square:true})
   } catch(error) {
    setPartError(error.message)
    return
   }
   const row={...editor,id:editor.id??crypto.randomUUID(),name,image,category:fields.get('category'),details:String(fields.get('details')).trim(),url:String(fields.get('url')).trim(),price:fields.get('price')===''?null:Number(fields.get('price')),bought,researching:status==='research',priority:fields.get('priority')==='unset'?'':fields.get('priority'),dueDate:fields.get('dueDate'),boughtDate:bought?(fields.get('boughtDate')||(!editor.bought?today():'')):'',paidPrice:fields.get('paidPrice')===''?null:Number(fields.get('paidPrice'))}
   const updatedParts=editor.id?parts.map(part=>part.id===row.id?row:part):[...parts,row]
   if(!await persistSetup({...data,parts:updatedParts})) {
    if(!cloud) setPartError('Não foi possível salvar no navegador. Se você enviou uma imagem, tente um arquivo menor.')
    return
   }
   let title=editor.id?'Item atualizado':'Item adicionado'
   if (bought&&!editor.bought) title='Item comprado'
   if (!bought&&editor.bought) title='Compra desfeita'
   toast.add({title,description:name})
   setEditor(null)
  } finally {
   setSavingPart(false)
  }
 }
 return <>
  <header><div className="shell masthead"><div className="brand">setup.<small>Planejador de compras</small></div><div className="masthead-actions"><Button className="desktop-budget" variant="outline" disabled={savingSetup} onClick={()=>setBudgetEditor(true)}><Wallet size={16}/> Meta {money.format(budget)}</Button>{cloud&&<Button variant="ghost" onClick={cloud.signOut}>Sair do espaço</Button>}</div></div></header>
  <main className="shell">
   <section className="intro">
    <div><h1>Seu setup, um item de cada vez.</h1><p>Organize suas escolhas, defina quando comprar e acompanhe cada conquista.</p></div>
    <Button onClick={()=>openPart(empty)}><Plus size={18}/> Adicionar item</Button>
   </section>
   <section className="stats" aria-label="Resumo">
    <article><div className="stat-label">Planejado</div><strong>{money.format(sum(parts))}</strong><p>{parts.length} itens na sua lista</p></article>
    <article><div className="stat-label">Já comprado</div><strong>{money.format(spent)}</strong><p>{completed} de {parts.length} itens concluídos</p></article>
    <article className="investment"><div className="stat-label">Falta investir</div><strong>{money.format(planned)}</strong><p>{parts.length-completed} itens para completar o setup</p></article>
   </section>
   <section className="inventory">
    <div className="section-head"><div className="list-title"><h2>Minha lista</h2><span>{parts.length} itens</span></div></div>
    <Tabs.Root value={filter} onValueChange={setFilter}>
    <div className="inventory-toolbar">
    <Tabs.List className="filters" aria-label="Filtrar peças">
     {tabs.map(([id,label])=><Tabs.Tab key={id} value={id} render={<Button variant="ghost"/>}>{label} · {id==='all'?matching.length:matching.filter(p=>statusOf(p)===id).length}</Tabs.Tab>)}
    </Tabs.List>
     <label className="search"><Search size={17}/><Input type="search" aria-label="Buscar peça" placeholder="Buscar peça..." value={query} onChange={e=>setQuery(e.target.value)}/></label>
    </div>
    <Tabs.Panel value={filter}>
    <div className="table-frame">{visible.length>0?<table role="table" aria-label="Peças do setup">
     <thead role="rowgroup"><tr role="row">{['Item / Categoria','Status','Prioridade','Comprar até','Valor previsto','Comprado em','Ações'].map(label=><th role="columnheader" key={label} scope="col">{label}</th>)}</tr></thead>
     <tbody role="rowgroup">{visible.map(p=>{
      const status=statusOf(p)
      return <tr role="row" key={p.id}>
       <td role="cell" className="part"><div className="part-identity"><PartImage image={p.image}/><div><strong>{p.name}</strong><small>{p.category}{p.details?' · '+p.details:''}</small></div></div></td>
       <td role="cell"><Badge variant={status}>{statuses[status]}</Badge></td>
       <td role="cell" data-label="Prioridade" className={!p.bought&&p.priority==='Alta'?'high':''}>{p.bought?'Concluída':(p.priority||'—')}</td>
       <td role="cell" data-label="Comprar até">{p.bought?'—':showDate(p.dueDate)}</td>
       <td role="cell" data-label="Valor previsto" className="price">{showPrice(p.price)}</td>
       <td role="cell" data-label="Comprado em">{p.bought?showDate(p.boughtDate):'—'}</td>
       <td role="cell"><div className="actions">
        <Tooltip label="Editar peça"><Button variant="ghost" aria-label={'Editar '+p.name} onClick={()=>openPart(p)}><Pencil size={16}/></Button></Tooltip>
        {/^https?:\/\//i.test(p.url)&&<Tooltip label="Abrir oferta em nova aba"><Button asChild variant="ghost" aria-label={'Abrir link de '+p.name}><a href={p.url} target="_blank" rel="noreferrer"><ExternalLink size={16}/></a></Button></Tooltip>}
        {!p.bought&&<Tooltip label="Marcar como comprado"><Button className="row-buy" variant="ghost" disabled={savingSetup} aria-label={'Marcar '+p.name+' como comprado'} onClick={()=>markBought(p)}><Check size={16}/></Button></Tooltip>}
       </div></td>
      </tr>
     })}</tbody>
    </table>:parts.length===0?
     <Empty title="Nenhum item cadastrado" description="Adicione a primeira peça para começar a planejar seu setup.">
      <Button onClick={()=>openPart(empty)}><Plus size={16}/> Adicionar item</Button>
     </Empty>:
     <Empty title="Nenhum item encontrado" description="Experimente outra busca ou selecione outro filtro."/>
    }</div>
    </Tabs.Panel>
    </Tabs.Root>
   </section>
   <section className="overview" aria-label="Planejamento e progresso">
    <article className="next-purchase">
     <h2>Próximas compras</h2>
     {upcoming.length>0?<ol className="next-purchase-list">
      {upcoming.map(part=><li key={part.id} className="next-purchase-body">
       <div className="part-identity">
        <PartImage image={part.image}/>
        <div>
         <div className="next-purchase-name"><h3>{part.name}</h3>{part.priority&&<span className="priority-chip">Prioridade {part.priority}</span>}</div>
         <p><Calendar size={12}/> {part.dueDate?'Até '+showDate(part.dueDate):'Sem prazo definido'}</p>
        </div>
       </div>
       <div className="next-purchase-side">
        <strong>{showPrice(part.price)}</strong>
        {/^https?:\/\//i.test(part.url)&&<div className="next-purchase-actions">
         <Button asChild variant="outline"><a href={part.url} target="_blank" rel="noreferrer" aria-label={'Ver produto: '+part.name}><ExternalLink size={14}/> Ver produto</a></Button>
        </div>}
       </div>
      </li>)}
     </ol>:<p>{parts.length>0?'Todas as peças foram compradas.':'Adicione uma peça para planejar a próxima compra.'}</p>}
    </article>
    <article className="setup-progress">
     <div className="overview-heading"><h2>Seu setup está tomando forma</h2><span>{completed} de {parts.length} itens</span></div>
     <Progress value={progress} label="Peças compradas"/>
     <p>{progress}% dos itens comprados · {money.format(spent)} já investidos</p>
     {pendingParts.length>0?<div className="progress-pending">
      <h3>A comprar · {pendingParts.length}</h3>
      <ul className="progress-parts" aria-label="Peças a comprar">
       {pendingParts.map(part=><li key={part.id}><span className="progress-dot" aria-hidden="true"/>{part.name}</li>)}
      </ul>
     </div>:parts.length>0&&<p>Todas as peças foram compradas.</p>}
    </article>
   </section>
   <GamesCarousel cloud={cloud}/>
   <footer>{(storageError||cloud?.accountError)&&<div role="alert" data-slot="alert">{storageError||cloud.accountError}</div>}
    <div className="footer-storage"><span>{cloud?'Salvamento no espaço compartilhado.':'Dados salvos neste navegador.'}</span>
     {!cloud&&<Button variant="ghost" onClick={exportLocal}>Exportar backup</Button>}
     {cloud?.importFile&&<label className="backup-import">{cloud.importing?'Importando…':'Importar backup'}<input type="file" className="sr-only" accept=".json,application/json" onChange={cloud.importFile} disabled={cloud.importing}/></label>}
    </div>
   </footer>
  </main>
  <Modal open={!!editor} onClose={()=>{if(!savingPart) setEditor(null)}} title={editor?.id?'Editar peça':'Adicionar peça'}>{editor&&<form onSubmit={save}>
   <label>Nome<Input name="name" required maxLength={120} defaultValue={editor.name} onInput={e=>e.currentTarget.setCustomValidity('')}/></label>
   <div className="form-pair"><SelectField name="category" label="Tipo de peça" defaultValue={editor.category} options={Object.fromEntries(categories.map(value=>[value,value]))}/><label>Valor previsto (R$)<Input name="price" type="number" min="0" step="0.01" defaultValue={editor.price??''}/></label></div>
   <label>Modelo, código ou observação<Input name="details" maxLength={180} defaultValue={editor.details}/></label>
   <label>Link da oferta<Input name="url" type="url" pattern="https?://.+" placeholder="https://" defaultValue={editor.url}/></label>
   <div className="form-pair">
    <SelectField name="status" label="Status" defaultValue={statusOf(editor)} options={statuses}/>
    <SelectField name="priority" label="Prioridade" defaultValue={editor.priority||'unset'} options={{unset:'A definir',...Object.fromEntries(priorities.map(value=>[value,value]))}}/>
   </div>
   <div className="form-pair"><DateField name="dueDate" label="Comprar até" defaultValue={editor.dueDate}/><DateField name="boughtDate" label="Comprado em" defaultValue={editor.boughtDate}/></div>
   <label>Valor pago (R$)<Input name="paidPrice" type="number" min="0" step="0.01" defaultValue={editor.paidPrice??''}/></label>
   <ImageAttachment label="Imagem da peça" initialImage={editor.image} disabled={savingPart}/>
   {(partError||(cloud&&storageError))&&<div role="alert" data-slot="alert">{partError||storageError}</div>}
   <div className="form-actions"><Button type="button" variant="outline" disabled={savingPart} onClick={()=>setEditor(null)}>Cancelar</Button><Button type="submit" disabled={savingPart}>{savingPart?'Salvando…':'Salvar peça'}</Button></div>
  </form>}</Modal>
  <Modal open={budgetEditor} onClose={()=>{if(!savingSetup) setBudgetEditor(false)}} title="Editar meta">
   <form onSubmit={saveBudget}>
    <label>Meta de gasto (R$)<Input name="budget" type="number" min="0" step=".01" required defaultValue={budget}/></label>
    {storageError&&<div role="alert" data-slot="alert">{storageError}</div>}
    <div className="form-actions"><Button type="submit" disabled={savingSetup}>Salvar meta</Button></div>
   </form>
  </Modal>
 </>
}
createRoot(document.getElementById('root')).render(<TooltipProvider delayDuration={280} skipDelayDuration={350}><Toaster>{supabase&&!new URLSearchParams(location.search).has('local')?<CloudGate>{cloud=><App key={cloud.imported?'imported':'account'} cloud={cloud}/>}</CloudGate>:<App/>}</Toaster></TooltipProvider>)
