import fs from 'node:fs/promises'
import path from 'node:path'
import type {Order} from '../../shared/types'

const logFile=path.join(logsDir,'orders.log')
export const TYPES={hall:'В зале',delivery:'Доставка',pickup:'Самовывоз'} as const

export function formatOrder(o:Order){
  const where=o.type==='hall'?`Стол № ${esc(o.table)}`:o.type==='delivery'?`Адрес: ${esc(o.address)}`:'Самовывоз'
  return [
    `🧾 <b>Заказ #${o.id}</b> · ${TYPES[o.type]}`,
    '',
    ...o.items.map(i=>`• ${esc(i.name)}${i.variant?` (${esc(i.variant)})`:''} × ${i.qty} = <b>${i.price*i.qty} с</b>`),
    '',
    `💰 <b>Итого: ${o.total} с</b>`,
    '',
    `👤 ${esc(o.name)}`,
    `📞 ${esc(o.phone)}`,
    `📍 ${where}`,
    o.comment?`💬 ${esc(o.comment)}`:'',
    `🕒 ${new Date(o.createdAt).toLocaleString('ru-RU',{timeZone:'Asia/Dushanbe'})}`
  ].filter(s=>s!=='').join('\n')
}

export async function saveOrder(o:Order){
  await fs.mkdir(logsDir,{recursive:true})
  await fs.appendFile(logFile,JSON.stringify(o)+'\n')
}

export async function readOrders(limit=100):Promise<Order[]>{
  try{
    const lines=(await fs.readFile(logFile,'utf8')).split('\n').filter(Boolean)
    return lines.slice(-limit).reverse().map(l=>{try{return JSON.parse(l)}catch{return null}}).filter(Boolean) as Order[]
  }catch{return []}
}

export async function lastOrdersText(){
  const list=(await readOrders(5))
  if(!list.length)return 'Заказов пока нет.'
  return list.map(o=>`<b>#${o.id}</b> · ${TYPES[o.type]} · ${esc(o.name)} · <b>${o.total} с</b>`).join('\n')
}
