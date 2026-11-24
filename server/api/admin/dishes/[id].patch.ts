export default defineEventHandler(async event=>{
  const id=getRouterParam(event,'id')
  const body=await readBody(event)
  return mutateMenu(async m=>{
    const i=m.items.findIndex(d=>d.id===id)
    if(i<0)throw bad(404,'Блюдо не найдено')
    const prev=m.items[i]!
    const next=cleanDish({...prev,...body},m,prev)
    if(next.category!==prev.category){
      m.items.splice(i,1)
      let at=-1
      m.items.forEach((d,k)=>{if(d.category===next.category)at=k})
      if(at<0)m.items.push(next)
      else m.items.splice(at+1,0,next)
    }else m.items[i]=next
    if(prev.image!==next.image)await dropUnusedImage(prev.image,m)
    return next
  })
})
