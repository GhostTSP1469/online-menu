import type {CartLine,Dish,Menu,Variant} from '~~/shared/types'

const KEY='naberezhnaya-cart'

export function useCart(){
  const lines=useState<CartLine[]>('cart',()=>[])
  const ready=useState('cart-ready',()=>false)
  const loaded=useState('cart-loaded',()=>false)

  if(import.meta.client&&!ready.value){
    ready.value=true
    onNuxtReady(()=>{
      try{lines.value=JSON.parse(localStorage.getItem(KEY)||'[]')}catch{lines.value=[]}
      loaded.value=true
      watch(lines,v=>localStorage.setItem(KEY,JSON.stringify(v)),{deep:true})
    })
  }

  function sync(menu:Menu){
    const next=lines.value.map(l=>{
      const d=menu.items.find(i=>i.id===l.id)
      const v=d?.variants.find(v=>v.label===l.variant)
      return d&&v&&d.available!==false?{...l,name:d.name,price:v.price,image:d.image}:null
    }).filter(Boolean) as CartLine[]
    if(JSON.stringify(next)!==JSON.stringify(lines.value))lines.value=next
  }

  const count=computed(()=>lines.value.reduce((s,l)=>s+l.qty,0))
  const total=computed(()=>lines.value.reduce((s,l)=>s+l.qty*l.price,0))

  const qtyOf=(dish:Dish,v:Variant)=>lines.value.find(l=>l.key===dish.id+'|'+v.label)?.qty||0

  function add(dish:Dish,v:Variant){
    const key=dish.id+'|'+v.label
    const line=lines.value.find(l=>l.key===key)
    if(line)line.qty=Math.min(line.qty+1,99)
    else lines.value.push({key,id:dish.id,name:dish.name,variant:v.label,price:v.price,qty:1,image:dish.image})
  }
  function dec(key:string){
    const line=lines.value.find(l=>l.key===key)
    if(!line)return
    line.qty--
    if(line.qty<=0)lines.value=lines.value.filter(l=>l.key!==key)
  }
  function inc(key:string){
    const line=lines.value.find(l=>l.key===key)
    if(line)line.qty=Math.min(line.qty+1,99)
  }
  const clear=()=>{lines.value=[]}

  return {lines,loaded,count,total,qtyOf,add,inc,dec,clear,sync}
}
