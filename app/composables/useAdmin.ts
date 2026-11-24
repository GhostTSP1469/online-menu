import axios from 'axios'

const authed=ref<boolean|null>(null)
const toasts=ref<{id:number;text:string;kind:'ok'|'err'}[]>([])
const dialog=ref<null|{title:string;text:string;ok:string;danger:boolean;resolve:(v:boolean)=>void}>(null)
let tid=0

export const adminApi=axios.create({baseURL:'/api/admin'})
adminApi.interceptors.response.use(r=>r,e=>{
  if(e?.response?.status===401&&!String(e.config?.url||'').includes('login'))authed.value=false
  return Promise.reject(e)
})

export const errText=(e:any)=>e?.response?.data?.statusMessage||e?.response?.data?.message||(e?.response?'Ошибка сервера. Попробуйте ещё раз':'Нет связи с сервером')

export function useAdmin(){
  const toast=(text:string,kind:'ok'|'err'='ok')=>{
    const id=++tid
    toasts.value.push({id,text,kind})
    setTimeout(()=>{toasts.value=toasts.value.filter(t=>t.id!==id)},kind==='err'?5200:2600)
  }
  const confirm=(o:{title:string;text?:string;ok?:string;danger?:boolean})=>new Promise<boolean>(resolve=>{
    dialog.value={title:o.title,text:o.text||'',ok:o.ok||'Подтвердить',danger:!!o.danger,resolve}
  })
  const answer=(v:boolean)=>{dialog.value?.resolve(v);dialog.value=null}
  return {authed,toasts,dialog,toast,confirm,answer}
}
