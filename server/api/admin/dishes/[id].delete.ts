export default defineEventHandler(async event=>{
  const id=getRouterParam(event,'id')
  return mutateMenu(async m=>{
    const i=m.items.findIndex(d=>d.id===id)
    if(i<0)throw bad(404,'Блюдо не найдено')
    const [gone]=m.items.splice(i,1)
    await dropUnusedImage(gone!.image,m)
    return {ok:true}
  })
})
