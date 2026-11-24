export default defineNitroPlugin(()=>{
  const {tgToken}=useRuntimeConfig()
  const g=globalThis as any
  g.__bot={running:false,startedAt:0,lastPoll:0,lastError:'',updates:0,gen:(g.__bot?.gen||0)+1}
  const state=g.__bot,gen=state.gen
  if(!tgToken){state.lastError='NUXT_TG_TOKEN не задан';console.warn('[bot] токен не задан, бот выключен');return}
  if(import.meta.prerender)return
  const alive=()=>g.__bot?.gen===gen
  const sleep=(ms:number)=>new Promise(r=>setTimeout(r,ms))

  const say=(chat:number,text:string,extra:Record<string,unknown>={})=>tg('sendMessage',{chat_id:chat,text,...extra})
  const askPhone={reply_markup:{keyboard:[[{text:'📱 Поделиться номером',request_contact:true}]],resize_keyboard:true,one_time_keyboard:true}}
  const noKeyboard={reply_markup:{remove_keyboard:true}}
  const DENIED='Бот недоступен для вас.'

  async function handle(m:any){
    const chat=m.chat.id,text=String(m.text||'')
    const who={id:chat,name:[m.from?.first_name,m.from?.last_name].filter(Boolean).join(' ')||m.chat.title||'',username:m.from?.username||''}
    const subscribed=(await readChats()).some(c=>c.id===chat)

    if(m.contact){
      if(m.contact.user_id!==m.from?.id){await say(chat,'Нужен ваш собственный номер. Нажмите кнопку «Поделиться номером».',askPhone);return}
      if(!(await isAllowedPhone(m.contact.phone_number))){
        console.log('[bot] отказано',chat,who.name,m.contact.phone_number)
        await say(chat,DENIED,noKeyboard)
        return
      }
      const added=await addChat({...who,phone:digits(m.contact.phone_number)})
      console.log('[bot] допущен',chat,who.name,added?'(новый)':'(уже был)')
      await say(chat,added?'Готово. Сюда будут приходить заказы с онлайн-меню «Набережная».\n\nОтписаться: /stop':'Вы уже получаете заказы. Отписаться: /stop',noKeyboard)
      if(added)await flushPending(chat)
      return
    }
    if(text.startsWith('/start')){
      if(subscribed){await say(chat,'Вы уже получаете заказы. Отписаться: /stop');return}
      await say(chat,'Чтобы получать заказы, подтвердите номер телефона: нажмите кнопку ниже.',askPhone)
    }else if(!subscribed){
      await say(chat,'Нажмите /start и подтвердите номер телефона.')
    }else if(text.startsWith('/stop')){
      await removeChat(chat)
      console.log('[bot] /stop от',chat)
      await say(chat,'Заказы больше не будут приходить. Вернуться: /start')
    }else if(text.startsWith('/orders')){
      await say(chat,await lastOrdersText(),{parse_mode:'HTML'})
    }else{
      await say(chat,'Команды:\n/stop — перестать получать заказы\n/orders — последние заказы')
    }
  }

  async function loop(){
    state.running=true;state.startedAt=Date.now()
    try{const me=await tg('getMe');state.username=me.result?.username;console.log('[bot] запущен, @'+state.username)}catch(e:any){state.lastError=String(e?.message||e);console.error('[bot] getMe не прошёл:',state.lastError)}
    let offset=0,fails=0
    while(alive()){
      try{
        const res=await tg('getUpdates',{offset,timeout:20,allowed_updates:['message']},{timeout:30000,retries:0})
        state.lastPoll=Date.now();state.lastError='';fails=0
        for(const u of res.result||[]){
          offset=u.update_id+1
          state.updates++
          if(!u.message?.text&&!u.message?.contact)continue
          try{await handle(u.message)}catch(e:any){console.error('[bot] ошибка в обработчике:',e?.data?.description||e?.message||e)}
        }
      }catch(e:any){
        const retry=e?.data?.parameters?.retry_after
        state.lastError=e?.data?.description||'нет связи с Telegram'
        if(++fails===1||fails%20===0)console.error('[bot] getUpdates:',state.lastError,fails>1?`(подряд ошибок: ${fails})`:'')
        await sleep(retry?retry*1000:1500)
      }
    }
    state.running=false
  }
  loop()

  const timer=setInterval(()=>{
    if(!alive()){clearInterval(timer);return}
    retryPending().then(n=>{if(n)console.log('[bot] досланы заказы из очереди:',n)}).catch(()=>{})
  },30000)
})
