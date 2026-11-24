import fs from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'

export default defineEventHandler(async event=>{
  const size=Number(getRequestHeader(event,'content-length')||0)
  if(size>12*1024*1024)throw bad(413,'Файл слишком большой (максимум 10 МБ)')
  const parts=await readMultipartFormData(event)
  const file=parts?.find(p=>p.name==='file')
  if(!file?.data?.length)throw bad(400,'Выберите файл')
  if(file.data.length>10*1024*1024)throw bad(413,'Файл слишком большой (максимум 10 МБ)')
  let out:Buffer
  try{
    out=await sharp(file.data,{limitInputPixels:80_000_000}).rotate().resize({width:900,withoutEnlargement:true}).webp({quality:80}).toBuffer()
  }catch{
    throw bad(400,'Это не картинка. Подойдут JPG, PNG, WebP')
  }
  const name=uid()+'.webp'
  await fs.mkdir(uploadsDir,{recursive:true})
  await fs.writeFile(path.join(uploadsDir,name),out)
  return {url:'/uploads/'+name}
})
