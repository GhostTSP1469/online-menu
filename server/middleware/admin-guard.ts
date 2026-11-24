export default defineEventHandler(async event=>{
  const path=getRequestURL(event).pathname
  if(!path.startsWith('/api/admin'))return
  checkOrigin(event)
  if(path==='/api/admin/login')return
  if(!(await isAdmin(event)))throw bad(401,'Нужно войти')
})
