<script setup lang="ts">
import type {Menu} from '~~/shared/types'
import data from '~~/shared/menu.json'
const menu=data as Menu
const q=ref('')
const active=ref(menu.categories[0]?.id||'')
const tabsEl=ref<HTMLElement>()

const groups=computed(()=>{
  const s=q.value.trim().toLowerCase()
  return menu.categories.map(c=>({...c,items:menu.items.filter(i=>i.category===c.id&&(!s||(i.name+' '+i.en+' '+i.composition).toLowerCase().includes(s)))})).filter(g=>g.items.length)
})

const drag={on:false,moved:false,x:0,left:0}
function dragStart(e:PointerEvent){
  if(e.pointerType!=='mouse'||e.button!==0||!tabsEl.value)return
  drag.on=true;drag.moved=false;drag.x=e.clientX;drag.left=tabsEl.value.scrollLeft
}
function dragMove(e:PointerEvent){
  if(!drag.on||!tabsEl.value)return
  const dx=e.clientX-drag.x
  if(!drag.moved&&Math.abs(dx)>4){drag.moved=true;tabsEl.value.setPointerCapture(e.pointerId);tabsEl.value.classList.add('dragging')}
  if(drag.moved)tabsEl.value.scrollLeft=drag.left-dx
}
function dragEnd(){
  drag.on=false
  tabsEl.value?.classList.remove('dragging')
  setTimeout(()=>{drag.moved=false},0)
}
function onTabsWheel(e:WheelEvent){
  if(!tabsEl.value||Math.abs(e.deltaX)>Math.abs(e.deltaY))return
  tabsEl.value.scrollLeft+=e.deltaY
  e.preventDefault()
}
function go(id:string){
  if(drag.moved){drag.moved=false;return}
  active.value=id
  document.getElementById('cat-'+id)?.scrollIntoView({behavior:'smooth',block:'start'})
}
watch(active,id=>{
  const t=tabsEl.value?.querySelector<HTMLElement>(`[data-id="${id}"]`)
  t?.scrollIntoView({behavior:'smooth',inline:'center',block:'nearest'})
})
let obs:IntersectionObserver|undefined
function observe(){
  obs?.disconnect()
  obs=new IntersectionObserver(es=>{
    const vis=es.filter(e=>e.isIntersecting).sort((a,b)=>a.boundingClientRect.top-b.boundingClientRect.top)[0]
    if(vis)active.value=(vis.target as HTMLElement).dataset.cat!
  },{rootMargin:'-130px 0px -60% 0px'})
  document.querySelectorAll('[data-cat]').forEach(el=>obs!.observe(el))
}
onMounted(observe)
watch(groups,()=>nextTick(observe))
onBeforeUnmount(()=>obs?.disconnect())
</script>

<template>
  <div class="page">
    <header class="hero">
      <img src="/logo.png" alt="Набережная" class="logo" width="120" height="120">
      <div class="hero-text">
        <p class="kicker">Ресторан</p>
        <h1>Набережная</h1>
        <p class="sub">Меню ресторана</p>
      </div>
    </header>

    <div class="bar">
      <div class="search">
        <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
        <input v-model="q" type="search" placeholder="Поиск по меню" aria-label="Поиск по меню" enterkeyhint="search">
      </div>
      <nav ref="tabsEl" class="tabs" aria-label="Категории" @pointerdown="dragStart" @pointermove="dragMove" @pointerup="dragEnd" @pointercancel="dragEnd" @wheel="onTabsWheel">
        <button v-for="g in groups" :key="g.id" type="button" :data-id="g.id" :class="{on:g.id===active}" @click="go(g.id)">{{g.title}}</button>
      </nav>
    </div>

    <main class="menu">
      <p v-if="!groups.length" class="nothing">Ничего не найдено</p>
      <section v-for="(g,gi) in groups" :id="'cat-'+g.id" :key="g.id" :data-cat="g.id" class="cat">
        <div class="cat-head">
          <h2>{{g.title}}</h2>
          <span>{{g.en}}</span>
        </div>
        <div class="grid">
          <DishCard v-for="(d,i) in g.items" :key="d.id" :dish="d" :num="i+1" :eager="gi===0&&i<4"/>
        </div>
      </section>
    </main>

    <footer class="site-foot">
      <img src="/logo.png" alt="" width="56" height="56">
      <p>Ресторан «Набережная» · цены в сомони</p>
    </footer>
  </div>
</template>

<style scoped>
.page{max-width:1240px;margin:0 auto;padding:0 max(16px,env(safe-area-inset-left)) calc(40px + env(safe-area-inset-bottom)) max(16px,env(safe-area-inset-right))}
.hero{display:flex;align-items:center;gap:20px;padding:28px 0 20px}
.logo{width:clamp(76px,18vw,120px);height:auto;border-radius:50%;flex:none;box-shadow:0 0 0 3px rgba(201,164,92,.25)}
.kicker{margin:0;color:var(--gold);font:600 12px/1 var(--body);letter-spacing:.25em;text-transform:uppercase}
h1{margin:6px 0 6px;font:400 clamp(40px,9vw,72px)/1 var(--script);color:#fff}
.sub{margin:0;color:var(--muted);font:500 12px/1 var(--body);letter-spacing:.35em;text-transform:uppercase}
.bar{position:sticky;top:0;z-index:20;margin:0 calc(-1*max(16px,env(safe-area-inset-left)));padding:8px max(16px,env(safe-area-inset-left)) 0;background:rgba(18,18,18,.55);backdrop-filter:blur(14px) saturate(1.2);-webkit-backdrop-filter:blur(14px) saturate(1.2);border-bottom:1px solid rgba(255,255,255,.05)}
.search{display:flex;align-items:center;gap:10px;border-bottom:1px solid rgba(255,255,255,.12);padding:0 2px;height:44px;transition:border-color .2s}
.search:focus-within{border-bottom-color:var(--gold)}
.search svg{width:18px;height:18px;fill:none;stroke:var(--muted);stroke-width:2;flex:none}
.search input{flex:1;min-width:0;background:transparent;border:0;outline:0;color:var(--ink);font:inherit;font-size:16px}
.search input::placeholder{color:var(--muted)}
.tabs{display:flex;gap:22px;overflow-x:auto;scrollbar-width:none;scroll-snap-type:x proximity}
.tabs::-webkit-scrollbar{display:none}
@media (hover:hover){.tabs{cursor:grab;user-select:none}}
.tabs.dragging{cursor:grabbing;scroll-snap-type:none}
.tabs.dragging button{pointer-events:none}
.tabs button{flex:none;scroll-snap-align:start;position:relative;border:0;background:transparent;color:var(--muted);padding:14px 0 12px;font:600 13px/1 var(--body);letter-spacing:.06em;text-transform:uppercase;white-space:nowrap;transition:color .2s}
.tabs button::after{content:'';position:absolute;left:0;right:0;bottom:0;height:2px;background:var(--red);transform:scaleX(0);transition:transform .25s}
.tabs button:hover{color:var(--ink2)}
.tabs button.on{color:var(--ink)}
.tabs button.on::after{transform:scaleX(1)}
.cat{scroll-margin-top:130px;padding-top:18px}
.cat-head{display:flex;align-items:baseline;gap:14px;flex-wrap:wrap;margin:6px 0 16px}
.cat-head h2{margin:0;font:700 clamp(28px,6vw,44px)/1 var(--display);text-transform:uppercase;letter-spacing:.01em}
.cat-head span{color:var(--muted);font:500 12px/1 var(--body);letter-spacing:.35em;text-transform:uppercase}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,270px),1fr));gap:16px}
@media (max-width:560px){.grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}}
@media (max-width:340px){.grid{grid-template-columns:1fr}}
.nothing{text-align:center;color:var(--muted);padding:48px 0}
.site-foot{display:flex;flex-direction:column;align-items:center;gap:8px;padding:48px 0 0;color:var(--muted);font-size:13px}
.site-foot img{border-radius:50%;opacity:.7}
</style>
