const KILL=`self.addEventListener('install',()=>self.skipWaiting())
self.addEventListener('activate',e=>{e.waitUntil((async()=>{
  const keys=await caches.keys()
  await Promise.all(keys.map(k=>caches.delete(k)))
  await self.registration.unregister()
  const list=await self.clients.matchAll({type:'window'})
  list.forEach(c=>c.navigate(c.url))
})())})
`

export default defineEventHandler(event=>{
  setResponseHeader(event,'content-type','application/javascript; charset=utf-8')
  setResponseHeader(event,'cache-control','no-store')
  return KILL
})
