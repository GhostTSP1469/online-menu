import type {Order} from '../../shared/types'

export default defineEventHandler(async event=>{
  const body=await readBody(event)
  const lines=Array.isArray(body?.items)?body.items:[]
  const f=body?.form||{}
  const name=String(f.name||'').trim().slice(0,60)
  const phone=String(f.phone||'').replace(/[^\d+]/g,'').slice(0,16)
  const type=(f.type in TYPES?f.type:'hall') as Order['type']
  if(!name)throw bad(400,'Укажите имя')
  if(phone.replace(/\D/g,'').length<9)throw bad(400,'Укажите номер телефона')
  if(type==='hall'&&!String(f.table||'').trim())throw bad(400,'Укажите номер стола')
  if(type==='delivery'&&!String(f.address||'').trim())throw bad(400,'Укажите адрес доставки')

  const menu=await getMenu()
  const items=lines.map((l:any)=>{
    const dish=menu.items.find(d=>d.id===l.id)
    if(!dish||dish.available===false)return null
    const v=dish.variants.find(v=>v.label===l.variant)
    const qty=Math.min(Math.max(parseInt(l.qty)||0,0),99)
    return v&&qty?{name:dish.name,variant:dish.variants.length>1?v.label:'',price:v.price,qty}:null
  }).filter(Boolean) as Order['items']
  if(!items.length)throw bad(400,'Этих блюд уже нет в меню. Обновите страницу и соберите корзину заново')

  const order:Order={
    id:Date.now().toString(36).toUpperCase().slice(-6),
    createdAt:new Date().toISOString(),
    name,phone,type,
    table:String(f.table||'').trim().slice(0,10),
    address:String(f.address||'').trim().slice(0,200),
    comment:String(f.comment||'').trim().slice(0,300),
    items,
    total:Math.round(items.reduce((s,i)=>s+i.price*i.qty,0)*100)/100
  }

  await saveOrder(order)
  const text=formatOrder(order)
  const sending=sendToAll(text).then(r=>r.ok>0,e=>{console.error('[order] telegram:',e?.data?.description||e?.message);return false})
  sending.then(ok=>{if(!ok)return addPending(order.id,text)})
  const delivered=await Promise.race([sending,new Promise<boolean>(r=>setTimeout(()=>r(false),5000))])
  return {id:order.id,total:order.total,delivered}
})
