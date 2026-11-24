import fs from 'node:fs/promises'
import path from 'node:path'

export default defineEventHandler(async event=>{
  const name=getRouterParam(event,'name')||''
  if(!/^[a-z0-9]+\.webp$/i.test(name))throw bad(404,'Нет такого файла')
  try{
    const buf=await fs.readFile(path.join(uploadsDir,name))
    setResponseHeader(event,'content-type','image/webp')
    setResponseHeader(event,'cache-control','public, max-age=31536000, immutable')
    return buf
  }catch{
    throw bad(404,'Нет такого файла')
  }
})
