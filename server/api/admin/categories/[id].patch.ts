export default defineEventHandler(async event=>{
  const id=getRouterParam(event,'id')
  const body=await readBody(event)
  return mutateMenu(m=>{
    const i=m.categories.findIndex(c=>c.id===id)
    if(i<0)throw bad(404,'Категория не найдена')
    if(body?.move===-1||body?.move===1){
      const j=i+body.move
      if(j>=0&&j<m.categories.length){const t=m.categories[i]!;m.categories[i]=m.categories[j]!;m.categories[j]=t}
      return {ok:true}
    }
    const c=cleanCategory({title:body?.title??m.categories[i]!.title,en:body?.en??m.categories[i]!.en},m,id)
    m.categories[i]=c
    return c
  })
})
