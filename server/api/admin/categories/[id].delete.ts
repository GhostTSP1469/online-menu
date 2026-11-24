export default defineEventHandler(async event=>{
  const id=getRouterParam(event,'id')
  return mutateMenu(m=>{
    const i=m.categories.findIndex(c=>c.id===id)
    if(i<0)throw bad(404,'Категория не найдена')
    const n=m.items.filter(d=>d.category===id).length
    if(n)throw bad(409,`В категории ещё ${n} блюд. Сначала удалите их или перенесите в другую категорию.`)
    m.categories.splice(i,1)
    return {ok:true}
  })
})
