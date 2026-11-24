import fs from 'node:fs/promises'
import path from 'node:path'
import crypto from 'node:crypto'

export const dataDir=path.resolve(process.env.DATA_DIR||'data')
export const logsDir=path.resolve(process.env.LOGS_DIR||'logs')
export const uploadsDir=path.join(dataDir,'uploads')

const locks=new Map<string,Promise<unknown>>()

export const uid=()=>Date.now().toString(36)+crypto.randomBytes(3).toString('hex')

export async function readJson<T>(file:string,fallback:T):Promise<T>{
  try{return JSON.parse(await fs.readFile(file,'utf8'))}catch{return fallback}
}

export async function writeJson(file:string,data:unknown){
  await fs.mkdir(path.dirname(file),{recursive:true})
  const tmp=`${file}.${process.pid}.tmp`
  const body=JSON.stringify(data,null,1)
  try{
    await fs.writeFile(tmp,body)
    await fs.rename(tmp,file)
  }catch{
    await fs.writeFile(file,body)
    await fs.rm(tmp,{force:true})
  }
}

export function withLock<T>(key:string,fn:()=>Promise<T>):Promise<T>{
  const prev=locks.get(key)||Promise.resolve()
  const next=prev.then(fn,fn)
  locks.set(key,next.catch(()=>{}))
  return next
}

export const bad=(code:number,msg:string)=>createError({statusCode:code,statusMessage:msg})
