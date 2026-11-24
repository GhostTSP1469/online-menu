export default defineEventHandler(async event=>{
  const phone=digits(getRouterParam(event,'phone'))
  if((await allowedPhones()).fixed.includes(phone))throw bad(409,'Этот номер задан в .env, удалить его можно только там')
  await removePhone(phone)
  return {ok:true}
})
