export default defineEventHandler(async event=>{
  const body=await readBody(event)
  return mutateMenu(m=>{
    const c=cleanCategory(body,m)
    m.categories.push(c)
    return c
  })
})
