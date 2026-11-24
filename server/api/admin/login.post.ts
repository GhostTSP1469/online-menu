export default defineEventHandler(async event=>{
  if(!adminConfigured())throw bad(503,'Логин и пароль админа не заданы в .env')
  const guard=loginGuard(event)
  const body=await readBody(event)
  const login=String(body?.login||'').slice(0,100)
  const password=String(body?.password||'').slice(0,200)
  if(!checkCredentials(login,password)){
    guard.fail()
    await new Promise(r=>setTimeout(r,600))
    throw bad(401,'Неверный логин или пароль')
  }
  guard.ok()
  await startSession(event)
  return {ok:true}
})
