export default defineEventHandler(async event=>{
  const limit=Math.min(Math.max(Number(getQuery(event).limit)||100,1),500)
  const waiting=new Set((await readPending()).map(o=>o.id))
  return (await readOrders(limit)).map(o=>({...o,delivered:!waiting.has(o.id)}))
})
