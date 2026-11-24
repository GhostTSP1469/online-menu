export default defineEventHandler(async()=>{
  const st=(globalThis as any).__bot||{}
  const {tgToken,tgChat}=useRuntimeConfig()
  const alive=!!st.running&&Date.now()-(st.lastPoll||0)<60000
  return {
    configured:!!tgToken,
    username:st.username||'',
    running:alive,
    lastError:st.lastError||'',
    lastPoll:st.lastPoll||0,
    subscribers:await readChats(),
    pending:(await readPending()).length,
    phones:await allowedPhones(),
    fixedChats:String(tgChat||'').split(',').map(s=>s.trim()).filter(Boolean)
  }
})
