import React, {useEffect,useState} from 'react'
import useEmblaCarousel from 'embla-carousel-react'
import {ArrowUpRight, ChevronLeft, ChevronRight, Edit03, Plus, PauseCircle, PlayCircle, Trash01} from '@untitledui/icons'
import {Button,Empty,Input,Modal,SelectField,toast} from './ui'
import ImageAttachment,{resolveImageAttachment} from './image-attachment'

const review='https://www.back2gaming.com/review/zotac-rtx-5070-ti-amp-extreme-infinity-16gb/'
const steam='https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/'
const storageKey='meu-setup-jogos-v1'
const presets={Baixo:'Baixo','Médio':'Médio',Alto:'Alto','Muito alto':'Muito alto',Ultra:'Ultra',Competitivo:'Competitivo',Personalizado:'Personalizado'}
const fps=new Intl.NumberFormat('pt-BR',{maximumFractionDigits:1})
const newGame={title:'',resolution:'1080p',preset:'Alto',average:null,low:null,wallpaper:''}
const defaults=[
  {id:'dying-light',title:'Dying Light: The Beast',resolution:'1440p',preset:'Alto',settings:'DLSS 4 Qualidade',average:115.5,low:104,
    wallpaper:steam+'3008130/474a86847984d68aa1485734e450c0a86ada03b3/header.jpg',
    source:'https://www.computerbase.de/artikel/gaming/dying-light-the-beast-benchmark-test.94445/seite-2'},
  {id:'far-cry-6',title:'Far Cry 6',resolution:'1080p',preset:'Ultra',settings:'Texturas HD · TAA',average:243,low:null,
    wallpaper:steam+'2369390/64af0c6b70ef233bbdff1e5ffe0e397481efb3c9/header.jpg',
    source:'https://www.notebookcheck.net/NVIDIA-GeForce-RTX-5070-Ti-Benchmarks-and-Specs.935685.0.html'},
  {id:'warzone',title:'Call of Duty: Warzone',resolution:'1080p',preset:'Ultra',settings:'Sem DLSS e geração de quadros',average:null,low:null,range:'160–200',
    wallpaper:steam+'1962663/c5be0e42beb9bc881855e5d8cbac003576c0ab4c/header.jpg',
    source:'https://www.youtube.com/watch?v=37U58o40lCs'},
  ...[
    ['cyberpunk','Cyberpunk 2077','Ultra',160,70,11],
    ['hogwarts','Hogwarts Legacy','Muito alto',147,118,14],
    ['ghost','Ghost of Tsushima','Muito alto',136,125,13],
    ['last-of-us','The Last of Us Part II Remastered','Muito alto',144,89,16],
    ['flight-simulator','Microsoft Flight Simulator 2024','Ultra',106,80,18],
  ].map(([id,title,preset,average,low,page])=>({id,title,resolution:'1080p',preset,average,low,wallpaper:'',source:review+page+'/'})),
]

export function loadGames() {
  try {
    const saved=JSON.parse(localStorage.getItem(storageKey))
    if (Array.isArray(saved)) return saved
  } catch {}
  return defaults
}

export default function GamesCarousel({cloud}) {
  const [games,setGames]=useState(()=>cloud?(cloud.games??defaults):loadGames())
  const [editor,setEditor]=useState(null)
  const [saving,setSaving]=useState(false)
  const [removing,setRemoving]=useState(false)
  const [error,setError]=useState('')
  const [viewport,api]=useEmblaCarousel({align:'start',loop:true})
  const [playing,setPlaying]=useState(()=>!window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  const [hovered,setHovered]=useState(false)
  const [focused,setFocused]=useState(false)

  function openEditor(game) {
    setError('')
    setRemoving(false)
    setEditor(game)
  }

  async function persistGames(updated, errorMessage='O navegador não conseguiu salvar a lista de jogos.') {
    try {
      if (cloud) await cloud.saveGames(updated)
      else localStorage.setItem(storageKey,JSON.stringify(updated))
    } catch(error) {
      setError(cloud?error.message:errorMessage)
      return false
    }
    setGames(updated)
    return true
  }

  async function removeGame(event) {
    event.preventDefault()
    if (saving) return
    setSaving(true)
    try {
      if (!await persistGames(games.filter(game=>game.id!==editor.id))) return
      setEditor(null)
      toast.add({title:'Jogo removido',description:editor.title})
    } finally {
      setSaving(false)
    }
  }

  async function save(event) {
    event.preventDefault()
    if (saving) return
    const form=new FormData(event.currentTarget)
    const title=form.get('title').trim()
    const resolution=form.get('resolution').trim()
    const preset=form.get('preset')
    const average=form.get('average')===''?null:Number(form.get('average'))
    const low=form.get('low')===''?null:Number(form.get('low'))
    if (!title||!resolution) {
      setError('Preencha o nome e a resolução.')
      return
    }
    if (low!==null&&average!==null&&low>average) {
      setError('O 1% low deve ser menor ou igual ao FPS médio.')
      return
    }
    setSaving(true)
    setError('')
    try {
      let wallpaper
      try {
        wallpaper=await resolveImageAttachment(form,editor.wallpaper)
      } catch (imageError) {
        setError(imageError.message)
        return
      }
      const sameTest=editor.source&&title===editor.title&&resolution===editor.resolution&&preset===editor.preset&&average===editor.average&&low===editor.low
      const next={
        id:editor.id??crypto.randomUUID(),title,resolution,preset,average,low,wallpaper,
        ...(sameTest?{source:editor.source,settings:editor.settings,range:editor.range}:{})
      }
      const updated=editor.id?games.map(game=>game.id===editor.id?next:game):[next,...games]
      if (!await persistGames(updated,'Não foi possível salvar. Se você enviou uma imagem, tente um link ou um arquivo menor.')) return
      setEditor(null)
      toast.add({title:editor.id?'Jogo atualizado':'Jogo cadastrado',description:title})
      if (!editor.id) requestAnimationFrame(()=>api?.scrollTo(0,true))
    } finally {
      setSaving(false)
    }
  }

  function move(direction) {
    if (!api) return
    const jump=window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (direction<0) api.scrollPrev(jump)
    else if (api.canScrollNext()) api.scrollNext(jump)
    else api.scrollTo(0,jump)
  }

  useEffect(()=>{
    if (!api||games.length<2||!playing||hovered||focused||editor) return
    const timer=window.setInterval(()=>{
      if (document.hidden||window.matchMedia('(max-width: 620px), (prefers-reduced-motion: reduce)').matches) return
      if (api.canScrollNext()) api.scrollNext()
      else api.scrollTo(0)
    },6500)
    return ()=>window.clearInterval(timer)
  },[api,games.length,playing,hovered,focused,editor])

  return <><section className="games-card" aria-labelledby="games-title" aria-roledescription="carrossel"
    onMouseEnter={()=>setHovered(true)} onMouseLeave={()=>setHovered(false)}
    onFocusCapture={()=>setFocused(true)} onBlurCapture={event=>{
      if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false)
    }} onKeyDown={event=>{
      if (event.key!=='ArrowLeft'&&event.key!=='ArrowRight') return
      event.preventDefault()
      move(event.key==='ArrowLeft'?-1:1)
    }}>
    <div className="games-heading">
      <div><h2 id="games-title">Como os jogos rodam</h2><p>Benchmarks da RTX 5070 Ti e resultados que você cadastrar</p></div>
      <div className="games-actions">
        {games.length>1&&<><Button variant="ghost" onClick={()=>setPlaying(value=>!value)}>{playing?<PauseCircle size={14}/>:<PlayCircle size={14}/>} {playing?'Pausar':'Reproduzir'}</Button>
        <Button className="games-arrow" variant="ghost" aria-label="Jogo anterior" onClick={()=>move(-1)}><ChevronLeft size={17}/></Button>
        <Button className="games-arrow" variant="ghost" aria-label="Próximo jogo" onClick={()=>move(1)}><ChevronRight size={17}/></Button></>}
        <Button className="add-game" onClick={()=>openEditor(newGame)}><Plus size={16}/> Adicionar jogo</Button>
      </div>
    </div>
    {games.length>0?<div className="games-carousel-frame">
      {games.length>1&&<Button className="mobile-games-arrow mobile-games-previous" variant="ghost" aria-label="Jogo anterior" onClick={()=>move(-1)}><ChevronLeft size={19}/></Button>}
      <div className="games-viewport" ref={viewport}>
      <div className="games-slides">
        {games.map((game,index)=><div className="game-slide" key={game.id} role="group"
          aria-roledescription="slide" aria-label={`${index+1} de ${games.length}`}>
          <article className="game-result">
            {game.wallpaper&&<img className="game-wallpaper" key={game.wallpaper} src={game.wallpaper} alt="" loading="lazy"
              referrerPolicy="no-referrer" onError={event=>{event.currentTarget.hidden=true}}/>}
            <div className="game-result-heading">
              <div><h3>{game.title}</h3><p>{[game.resolution,game.preset,game.settings].filter(Boolean).join(' · ')}</p></div>
              <Button className="edit-game" variant="ghost" aria-label={'Editar jogo '+game.title} onClick={()=>openEditor(game)}><Edit03 size={15}/></Button>
            </div>
            <dl><div><dt>{game.range?'Faixa observada de FPS':'FPS médio'}</dt><dd>{game.range??(game.average===null?'—':fps.format(game.average))}</dd></div>{game.low!==null&&<div><dt>1% low</dt><dd>{fps.format(game.low)}</dd></div>}</dl>
            {game.source&&<a href={game.source} target="_blank" rel="noreferrer" aria-label={'Benchmark de '+game.title}>Ver teste <ArrowUpRight size={13}/></a>}
          </article>
        </div>)}
      </div>
    </div>
      {games.length>1&&<Button className="mobile-games-arrow mobile-games-next" variant="ghost" aria-label="Próximo jogo" onClick={()=>move(1)}><ChevronRight size={19}/></Button>}
    </div>:<Empty title="Nenhum jogo cadastrado" description="Use Adicionar jogo para começar."/>}
    {games.length>0&&<p className="games-note">O 1% low ajuda a entender as quedas de FPS. Os testes usaram configurações diferentes. Com o Ryzen 5 7600, o desempenho pode variar.</p>}
  </section>
  <Modal open={!!editor} onClose={()=>{if (!saving) setEditor(null)}} title={removing?'Remover jogo':editor?.id?'Editar jogo':'Adicionar jogo'}>
    {editor&&(removing?<form onSubmit={removeGame}>
      <p>Remover <strong>{editor.title}</strong> do carrossel?</p>
      {error&&<div role="alert" data-slot="alert">{error}</div>}
      <div className="form-actions">
        <Button type="button" variant="outline" autoFocus disabled={saving} onClick={()=>{setError('');setRemoving(false)}}>Voltar</Button>
        <Button type="submit" className="confirm-remove-game" disabled={saving}>Remover jogo</Button>
      </div>
    </form>:<form onSubmit={save}>
      <label>Nome do jogo<Input name="title" required maxLength={100} defaultValue={editor.title}/></label>
      <div className="form-pair">
        <label>Resolução<Input name="resolution" required maxLength={32} placeholder="Ex.: 1080p" defaultValue={editor.resolution}/></label>
        <SelectField name="preset" label="Qualidade gráfica" options={presets} defaultValue={editor.preset}/>
      </div>
      <div className="form-pair">
        <label>FPS médio<Input name="average" type="number" min="1" max="9999" step="0.1" defaultValue={editor.average??''}/></label>
        <label>1% low (opcional)<Input name="low" type="number" min="1" max="9999" step="0.1" defaultValue={editor.low??''}/></label>
      </div>
      <ImageAttachment label="Papel de parede" initialImage={editor.wallpaper} disabled={saving}/>
      {error&&<div role="alert" data-slot="alert">{error}</div>}
      <div className="form-actions">
        {editor.id&&<Button type="button" variant="ghost" className="remove-game" disabled={saving} onClick={()=>{setError('');setRemoving(true)}}><Trash01 size={15}/> Remover</Button>}
        <Button type="button" variant="outline" disabled={saving} onClick={()=>setEditor(null)}>Cancelar</Button>
        <Button type="submit" disabled={saving}>{saving?'Salvando…':'Salvar jogo'}</Button>
      </div>
    </form>)}
  </Modal></>
}
