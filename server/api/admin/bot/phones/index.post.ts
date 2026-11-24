export default defineEventHandler(async event=>{
  const body=await readBody(event)
  const phone=await addPhone(String(body?.phone||''))
  return {ok:true,phone}
})
