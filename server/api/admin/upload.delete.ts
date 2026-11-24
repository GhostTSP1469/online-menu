import fs from 'node:fs/promises'
import path from 'node:path'

export default defineEventHandler(async event=>{
  const url=String(getQuery(event).url||'')
  if(!/^\/uploads\/[a-z0-9]+\.webp$/i.test(url))throw bad(400,'Недопустимый адрес')
  const m=await getMenu()
  if(m.items.some(d=>d.image===url))return {ok:true,kept:true}
  await fs.rm(path.join(uploadsDir,path.basename(url)),{force:true})
  return {ok:true}
})
