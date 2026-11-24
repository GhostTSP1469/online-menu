export default defineEventHandler(async event=>{
  const body=await readBody(event)
  return mutateMenu(m=>{
    const dish=cleanDish(body,m)
    let at=-1
    m.items.forEach((d,i)=>{if(d.category===dish.category)at=i})
    if(at<0)m.items.push(dish)
    else m.items.splice(at+1,0,dish)
    return dish
  })
})
