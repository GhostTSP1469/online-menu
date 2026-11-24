import path from 'node:path'
import type {BotChat} from '../../shared/types'

const chatsFile=path.join(dataDir,'chats.json')
const pendingFile=path.join(dataDir,'pending.json')

const wait=(ms:number)=>new Promise(r=>setTimeout(r,ms))

export async function tg(method:string,body:Record<string,unknown>={},opts:{timeout?:number;retries?:number}={}){
  const {tgToken}=useRuntimeConfig()
  if(!tgToken)throw new Error('NUXT_TG_TOKEN не задан')
  const retries=opts.retries??3
  let last:any
  for(let i=0;i<=retries;i++){
    try{
      return await $fetch<any>(`https://api.telegram.org/bot${tgToken}/${method}`,{method:'POST',body,timeout:opts.timeout??12000,retry:0})
    }catch(e:any){
      last=e
      const code=e?.data?.error_code||e?.statusCode
      if(code&&code<500&&code!==429)throw e
      await wait(code===429?(e?.data?.parameters?.retry_after||2)*1000:500*2**i)
    }
  }
  throw last
}

export async function readChats():Promise<BotChat[]>{
  const raw=await readJson<any[]>(chatsFile,[])
  return raw.map(c=>typeof c==='number'?{id:c,name:'',username:'',addedAt:''}:c)
}

const phonesFile=path.join(dataDir,'phones.json')
export const digits=(s:unknown)=>String(s??'').replace(/\D/g,'')

export async function allowedPhones(){
  const {tgPhones}=useRuntimeConfig()
  const fixed=String(tgPhones||'').split(',').map(digits).filter(Boolean)
  const saved=(await readJson<string[]>(phonesFile,[])).map(digits).filter(Boolean)
  return {fixed:[...new Set(fixed)],saved:saved.filter(p=>!fixed.includes(p))}
}

export async function isAllowedPhone(phone:unknown){
  const p=digits(phone)
  if(!p)return false
  const {fixed,saved}=await allowedPhones()
  return fixed.includes(p)||saved.includes(p)
}

export async function addPhone(phone:string){
  const p=digits(phone)
  if(p.length<9||p.length>15)throw bad(400,'Номер должен быть в международном формате, например +992901234567')
  await withLock('phones',async()=>{
    const list=(await readJson<string[]>(phonesFile,[])).map(digits)
    if(!list.includes(p))list.push(p)
    await writeJson(phonesFile,list)
  })
  return p
}

export async function removePhone(phone:string){
  const p=digits(phone)
  await withLock('phones',async()=>{
    await writeJson(phonesFile,(await readJson<string[]>(phonesFile,[])).map(digits).filter(x=>x!==p))
  })
  const chats=await readChats()
  for(const c of chats)if(digits(c.phone)===p)await removeChat(c.id)
}

export async function addChat(who:{id:number;name?:string;username?:string;phone?:string}){
  return withLock('chats',async()=>{
    const list=await readChats()
    if(list.some(c=>c.id===who.id))return false
    list.push({id:who.id,name:who.name||'',username:who.username||'',phone:who.phone||'',addedAt:new Date().toISOString()})
    await writeJson(chatsFile,list)
    return true
  })
}

export async function removeChat(id:number){
  await withLock('chats',async()=>{
    await writeJson(chatsFile,(await readChats()).filter(c=>c.id!==id))
  })
}

export async function recipients(){
  const {tgChat}=useRuntimeConfig()
  const fromEnv=String(tgChat||'').split(',').map(s=>Number(s.trim())).filter(Boolean)
  return [...new Set([...fromEnv,...(await readChats()).map(c=>c.id)])]
}

type Pending={id:string;text:string}

export const readPending=()=>readJson<Pending[]>(pendingFile,[])

export async function addPending(id:string,text:string){
  await withLock('pending',async()=>{
    const list=await readPending()
    if(!list.some(o=>o.id===id))list.push({id,text})
    await writeJson(pendingFile,list.slice(-50))
  })
}

const dropPending=(ids:Set<string>)=>withLock('pending',async()=>{
  await writeJson(pendingFile,(await readPending()).filter(o=>!ids.has(o.id)))
})

export async function flushPending(chatId:number){
  const list=await readPending()
  if(!list.length)return 0
  await tg('sendMessage',{chat_id:chatId,text:`Пока вас не было, пришло заказов: ${list.length}. Отправляю.`})
  const sent=new Set<string>()
  for(const o of list){
    try{await tg('sendMessage',{chat_id:chatId,text:o.text,parse_mode:'HTML'});sent.add(o.id)}catch{}
  }
  await dropPending(sent)
  return sent.size
}

export async function sendToAll(text:string,opts:{retries?:number}={}){
  const to=await recipients()
  const res=await Promise.allSettled(to.map(chat_id=>tg('sendMessage',{chat_id,text,parse_mode:'HTML'},{retries:opts.retries??3})))
  res.forEach((r,i)=>{if(r.status==='rejected'&&(r.reason as any)?.data?.error_code===403)removeChat(to[i]!)})
  return {total:to.length,ok:res.filter(r=>r.status==='fulfilled').length}
}

export function retryPending(){
  return withLock('pending-run',async()=>{
    const list=await readPending()
    if(!list.length||!(await recipients()).length)return 0
    const sent=new Set<string>()
    for(const o of list){
      try{if((await sendToAll(o.text,{retries:1})).ok>0)sent.add(o.id)}catch{}
    }
    await dropPending(sent)
    return sent.size
  })
}

export const esc=(s:unknown)=>String(s??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
