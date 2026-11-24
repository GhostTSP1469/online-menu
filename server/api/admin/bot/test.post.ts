export default defineEventHandler(async()=>{
  const r=await sendToAll('✅ Проверка связи: бот работает, заказы будут приходить сюда.')
  if(!r.total)throw bad(409,'Некому отправлять: никто не нажал «Старт» у бота')
  if(!r.ok)throw bad(502,'Telegram не принял сообщение. Попробуйте нажать «Старт» у бота заново')
  return r
})
