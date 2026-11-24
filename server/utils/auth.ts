import fs from 'node:fs/promises'
import path from 'node:path'
import crypto from 'node:crypto'
import type {H3Event} from 'h3'

const COOKIE='nb_admin'
const WEEK=7*24*3600
const sha=(s:string)=>crypto.createHash('sha256').update(s).digest()
const fails=new Map<string,{n:number;until:number}>()
let secretCache=''

async function secret(){
  if(secretCache)return secretCache
  const f=path.join(dataDir,'.secret')
  try{secretCache=(await fs.readFile(f,'utf8')).trim()}catch{}
  if(!secretCache){
    secretCache=crypto.randomBytes(32).toString('hex')
    await fs.mkdir(dataDir,{recursive:true})
    await fs.writeFile(f,secretCache)
  }
  return secretCache
}

async function sign(exp:number){
  const {adminLogin,adminPassword}=useRuntimeConfig()
  const key=`${await secret()}|${adminLogin}|${adminPassword}`
  return crypto.createHmac('sha256',key).update(String(exp)).digest('hex')
}

const same=(a:string,b:string)=>{
  const x=Buffer.from(a),y=Buffer.from(b)
  return x.length===y.length&&crypto.timingSafeEqual(x,y)
}

export const adminConfigured=()=>{
  const {adminLogin,adminPassword}=useRuntimeConfig()
  return !!adminLogin&&!!adminPassword
}

export async function isAdmin(event:H3Event){
  if(!adminConfigured())return false
  const token=getCookie(event,COOKIE)||''
  const [expRaw,sig]=token.split('.')
  const exp=Number(expRaw)
  if(!exp||!sig||exp<Date.now()/1000)return false
  return same(sig,await sign(exp))
}

export async function startSession(event:H3Event){
  const exp=Math.floor(Date.now()/1000)+WEEK
  setCookie(event,COOKIE,`${exp}.${await sign(exp)}`,{
    httpOnly:true,
    sameSite:'strict',
    secure:getRequestProtocol(event,{xForwardedProto:true})==='https',
    path:'/',
    maxAge:WEEK
  })
}

export const endSession=(event:H3Event)=>deleteCookie(event,COOKIE,{path:'/'})

export function checkCredentials(login:string,password:string){
  const {adminLogin,adminPassword}=useRuntimeConfig()
  const a=crypto.timingSafeEqual(sha(login),sha(String(adminLogin)))
  const b=crypto.timingSafeEqual(sha(password),sha(String(adminPassword)))
  return a&&b
}

export function loginGuard(event:H3Event){
  const ip=getRequestIP(event,{xForwardedFor:true})||'local'
  const rec=fails.get(ip)
  if(rec&&rec.until>Date.now()){
    const min=Math.ceil((rec.until-Date.now())/60000)
    throw bad(429,`Слишком много попыток. Подождите ${min} мин.`)
  }
  return {
    fail(){
      const r=fails.get(ip)||{n:0,until:0}
      r.n++
      if(r.n>=5){r.until=Date.now()+15*60000;r.n=0}
      fails.set(ip,r)
    },
    ok(){fails.delete(ip)}
  }
}

export function checkOrigin(event:H3Event){
  if(['GET','HEAD','OPTIONS'].includes(event.method))return
  const origin=getRequestHeader(event,'origin')
  if(!origin)return
  let host=''
  try{host=new URL(origin).host}catch{throw bad(403,'Запрещено')}
  const allowed=[getRequestHeader(event,'host'),getRequestHeader(event,'x-forwarded-host')].filter(Boolean)
  if(!allowed.includes(host))throw bad(403,'Запрещено')
}
