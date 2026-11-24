export default defineEventHandler(async event=>{
  setResponseHeader(event,'cache-control','no-store')
  return getMenu()
})
