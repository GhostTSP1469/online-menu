export default defineEventHandler(async event=>{
  await removeChat(Number(getRouterParam(event,'id')))
  return {ok:true}
})
