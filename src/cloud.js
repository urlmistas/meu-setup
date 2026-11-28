import {createClient} from '@supabase/supabase-js'

const url=import.meta.env.VITE_SUPABASE_URL
const key=import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

export const supabase=url&&key?.startsWith('sb_publishable_')?createClient(url,key,{
  auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false},
}):null

export async function openCloudSetup(accessKey) {
  async function call(action,payload=null,revision=null) {
    const {data,error}=await supabase.rpc('meu_setup_access',{
      p_key:accessKey,p_action:action,p_payload:payload,p_revision:revision,
    })
    if (error?.code==='42501') {
      const denied=new Error('Este link não dá acesso ao espaço compartilhado.')
      denied.code='access-denied'
      throw denied
    }
    if (error?.code==='40001') throw new Error('A lista mudou em outro dispositivo. Recarregue antes de salvar novamente.')
    if (error||!data) throw new Error('Não foi possível conectar ao espaço no Supabase. Tente novamente.')
    return data
  }

  const data=await call('read')
  const revisions={setup:data.setup_revision,games:data.games_revision}
  async function save(field,value) {
    const result=await call(field,value,revisions[field])
    revisions[field]=result.revision
  }
  return {
    setup:data.setup,
    games:data.games,
    saveSetup:value=>save('setup',value),
    saveGames:value=>save('games',value),
    async readRadar() {
      const {data,error}=await supabase.rpc('unisetup_read_radar',{p_key:accessKey})
      if (error) throw error
      return data
    },
    async importBackup(backup) {
      const {revision}=await call('import',backup)
      revisions.setup=revisions.games=revision
    },
  }
}
