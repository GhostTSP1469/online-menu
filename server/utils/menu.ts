import fs from 'node:fs/promises'
import path from 'node:path'
import seed from '../../shared/menu.json'
import type {Menu,Dish,Category} from '../../shared/types'

const file=path.join(dataDir,'menu.json')

export async function getMenu():Promise<Menu>{
  const m=await readJson<Menu|null>(file,null)
  if(m)return m
  await withLock('menu',async()=>{if(!(await readJson<Menu|null>(file,null)))await writeJson(file,seed)})
  return (await readJson<Menu|null>(file,null))||(seed as Menu)
}

export function mutateMenu<T>(fn:(m:Menu)=>T|Promise<T>):Promise<T>{
  return withLock('menu',async()=>{
    const m=(await readJson<Menu|null>(file,null))||structuredClone(seed as Menu)
    const result=await fn(m)
    await writeJson(file,m)
    return result
  })
}

const str=(v:unknown,max:number)=>String(v??'').replace(/\s+/g,' ').trim().slice(0,max)
const IMG=/^\/(dishes|uploads)\/[\w.-]+\.webp$/

export function cleanDish(b:any,m:Menu,prev?:Dish):Dish{
  const name=str(b.name,80)
  if(!name)throw bad(400,'Укажите название блюда')
  const category=String(b.category||'')
  if(!m.categories.some(c=>c.id===category))throw bad(400,'Выберите категорию')
  const raw=Array.isArray(b.variants)?b.variants:[]
  if(!raw.length||raw.length>6)throw bad(400,'Нужен от 1 до 6 вариантов цены')
  const variants=raw.map((v:any)=>{
    const price=Math.round(Number(String(v?.price).replace(',','.'))*100)/100
    if(!Number.isFinite(price)||price<=0||price>100000)throw bad(400,'Цена должна быть больше нуля')
    return {label:str(v?.label,24),price}
  })
  if(variants.length>1&&variants.some((v:any)=>!v.label))throw bad(400,'У каждого размера должна быть подпись')
  if(new Set(variants.map((v:any)=>v.label)).size!==variants.length)throw bad(400,'Подписи размеров не должны повторяться')
  const image=String(b.image||'')
  if(image&&!IMG.test(image))throw bad(400,'Недопустимый адрес фото')
  return {id:prev?.id||('d'+uid()),category,name,en:str(b.en,80),composition:str(b.composition,300),image,variants,available:b.available!==false}
}

export function cleanCategory(b:any,m:Menu,selfId?:string):Category{
  const title=str(b.title,40)
  if(!title)throw bad(400,'Укажите название категории')
  if(m.categories.some(c=>c.id!==selfId&&c.title.toLowerCase()===title.toLowerCase()))throw bad(400,'Такая категория уже есть')
  return {id:selfId||('c'+uid()),title,en:str(b.en,40)}
}

export async function dropUnusedImage(url:string|undefined,m:Menu){
  if(!url||!url.startsWith('/uploads/'))return
  if(m.items.some(d=>d.image===url))return
  await fs.rm(path.join(uploadsDir,path.basename(url)),{force:true})
}
