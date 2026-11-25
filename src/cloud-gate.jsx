import React,{useEffect,useState} from 'react'
import {Button,Input} from './ui'
import {openCloudSetup} from './cloud'

const storageKey='meu-setup-link-privado'
const validKey=/^[a-f0-9]{64}$/

function readAccess() {
  const fromLink=new URLSearchParams(window.location.hash.slice(1)).get('chave')
  if (fromLink) return fromLink
  try {return localStorage.getItem(storageKey)??''} catch {return ''}
}

export default function CloudGate({children}) {
  const [accessKey,setAccessKey]=useState(readAccess)

  useEffect(()=>{
    if (new URLSearchParams(window.location.hash.slice(1)).has('chave')) {
      window.history.replaceState(null,'',window.location.pathname+window.location.search)
    }
  },[])

  function forgetAccess() {
    try {localStorage.removeItem(storageKey)} catch {}
    setAccessKey('')
  }

  if (!validKey.test(accessKey)) return <main className="account-card">
    <h1>Meu Setup compartilhado</h1>
    <p>Abra o link privado ou cole a chave de acesso.</p>
    <form onSubmit={event=>{
      event.preventDefault()
      setAccessKey(String(new FormData(event.currentTarget).get('accessKey')).trim())
    }}>
      <label>Chave de acesso<Input name="accessKey" type="password" required pattern="[a-f0-9]{64}" autoComplete="off"/></label>
      <Button type="submit">Abrir setup</Button>
      <Button asChild variant="ghost"><a href="?local=1">Abrir dados locais</a></Button>
    </form>
  </main>

  return <CloudWorkspace key={accessKey} accessKey={accessKey} forgetAccess={forgetAccess}>{children}</CloudWorkspace>
}

function CloudWorkspace({accessKey,forgetAccess,children}) {
  const [workspace,setWorkspace]=useState(null)
  const [error,setError]=useState('')
  const [attempt,setAttempt]=useState(0)
  const [importing,setImporting]=useState(false)
  const [hasCloudData,setHasCloudData]=useState(false)

  useEffect(()=>{
    let active=true
    openCloudSetup(accessKey).then(value=>{
      if (!active) return
      try {localStorage.setItem(storageKey,accessKey)} catch {}
      setWorkspace(value)
      setHasCloudData(value.setup!==null||value.games!==null)
    },error=>{
      if(active) setError(error.message)
    })
    return ()=>{active=false}
  },[accessKey,attempt])

  if (!workspace) return <main className="account-card">
    <h1>Meu Setup compartilhado</h1>
    {error?<><p role="alert">{error}</p><Button onClick={()=>{setError('');setAttempt(value=>value+1)}}>Tentar novamente</Button></>:<p role="status">Carregando seu setup…</p>}
    <Button variant="ghost" onClick={forgetAccess}>Trocar chave</Button>
  </main>
  async function importFile(event) {
    const file=event.currentTarget.files?.[0]
    event.currentTarget.value=''
    if (!file||importing) return
    setError('')
    setImporting(true)
    try {
      let backup
      try {
        backup=JSON.parse(await file.text())
        if (!Array.isArray(backup?.setup?.parts)||!Number.isFinite(backup.setup.budget)||
          !backup.setup.parts.every(part=>typeof part?.name==='string'&&typeof part.category==='string')||
          !Array.isArray(backup.games)||!backup.games.every(game=>typeof game?.title==='string')) throw new Error()
      } catch {
        setError('Selecione um backup JSON exportado pelo Meu Setup.')
        return
      }
      await workspace.importBackup(backup)
      setHasCloudData(true)
      setWorkspace(current=>({...current,setup:backup.setup,games:backup.games,imported:true}))
    } catch(importError) {
      setError(importError.message)
    } finally {
      setImporting(false)
    }
  }

  return children({
    ...workspace,signOut:forgetAccess,accountError:error,
    saveSetup:async value=>{await workspace.saveSetup(value);setHasCloudData(true)},
    saveGames:async value=>{await workspace.saveGames(value);setHasCloudData(true)},
    importFile:hasCloudData?null:importFile,
    importing,
  })
}

