<script setup lang="ts">
import type {Menu} from '~~/shared/types'
const {data}=await useFetch<Menu>('/api/menu')
const menu=computed<Menu>(()=>data.value||{currency:'с',categories:[],items:[]})
const {count,total,loaded,sync}=useCart()
const cartOpen=ref(false)
const q=ref('')
const active=ref(menu.value.categories[0]?.id||'')
const tabsEl=ref<HTMLElement>()

const groups=computed(()=>{
  const s=q.value.trim().toLowerCase()
  return menu.value.categories.map(c=>({...c,items:menu.value.items.filter(i=>i.category===c.id&&(!s||(i.name+' '+i.en+' '+i.composition).toLowerCase().includes(s)))})).filter(g=>g.items.length)
})

const site=(useRuntimeConfig().public.siteUrl as string||useRequestURL().origin).replace(/\/$/,'')
const title='Набережная — меню ресторана и заказ онлайн'
const description=computed(()=>{
  const cats=menu.value.categories.slice(0,6).map(c=>c.title.toLowerCase()).join(', ')
  return `Меню ресторана «Набережная»${cats?`: ${cats} и другое`:''}. Цены, состав и вес блюд с фото. Заказ онлайн в зал, на самовывоз и с доставкой.`
})
const IN='https://schema.org/InStock',OUT='https://schema.org/OutOfStock'
const ld=computed(()=>({
  '@context':'https://schema.org',
  '@type':'Restaurant',
  name:'Набережная',
  url:site+'/',
  image:site+'/og.jpg',
  logo:site+'/logo.png',
  currenciesAccepted:'TJS',
  hasMenu:{
    '@type':'Menu',
    name:'Меню ресторана «Набережная»',
    inLanguage:'ru',
    hasMenuSection:menu.value.categories.map(c=>({
      '@type':'MenuSection',
      name:c.title,
      hasMenuItem:menu.value.items.filter(d=>d.category===c.id).map(d=>({
        '@type':'MenuItem',
        name:d.name,
        ...(d.composition?{description:d.composition}:{}),
        ...(d.image?{image:site+d.image}:{}),
        offers:d.variants.map(v=>({'@type':'Offer',price:String(v.price),priceCurrency:'TJS',...(v.label?{name:v.label}:{}),availability:d.available===false?OUT:IN}))
      }))
    })).filter(s=>s.hasMenuItem.length)
  }
}))
useSeoMeta({
  title,
  description,
  ogTitle:title,
  ogDescription:description,
  ogType:'website',
  ogLocale:'ru_RU',
  ogSiteName:'Набережная',
  ogUrl:site+'/',
  ogImage:site+'/og.jpg',
  ogImageWidth:1200,
  ogImageHeight:630,
  ogImageAlt:'Ресторан «Набережная»',
  twitterCard:'summary_large_image',
  twitterTitle:title,
  twitterDescription:description,
  twitterImage:site+'/og.jpg'
})
useHead({
  link:[{rel:'canonical',href:site+'/'}],
  script:[{type:'application/ld+json',innerHTML:computed(()=>JSON.stringify(ld.value).replace(/</g,'\\u003c'))}]
})

watch([loaded,menu],()=>{if(loaded.value&&data.value)sync(data.value)},{immediate:true})
onMounted(()=>{
  const refresh=()=>{if(document.visibilityState==='visible')refreshNuxtData()}
  document.addEventListener('visibilitychange',refresh)
  onBeforeUnmount(()=>document.removeEventListener('visibilitychange',refresh))
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
      <div class="bar-row">
        <div class="search">
          <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
          <input v-model="q" type="search" placeholder="Поиск по меню" aria-label="Поиск по меню" enterkeyhint="search">
        </div>
        <button type="button" class="cart-btn" :class="{has:count}" @click="cartOpen=true" :aria-label="count?'Корзина: '+count+' на '+total+' сомони':'Корзина пуста'">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 7h12l-1 13H7z"/><path d="M9 7a3 3 0 0 1 6 0"/></svg>
          <span class="cb-total" v-if="count">{{total}} с</span>
          <span class="cb-label" v-else>Корзина</span>
          <i v-if="count" class="cb-count">{{count}}</i>
        </button>
      </div>
      <nav ref="tabsEl" class="tabs" aria-label="Категории" @pointerdown="dragStart" @pointermove="dragMove" @pointerup="dragEnd" @pointercancel="dragEnd" @wheel="onTabsWheel">
        <button v-for="g in groups" :key="g.id" type="button" :data-id="g.id" :class="{on:g.id===active}" @click="go(g.id)">{{g.title}}</button>
      </nav>
    </div>

    <main class="menu">
      <p v-if="!groups.length" class="nothing">{{q?'Ничего не найдено':'Меню обновляется'}}</p>
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

    <Transition name="pop">
      <button v-if="count" type="button" class="cart-fab" @click="cartOpen=true" :aria-label="'Корзина: '+count+' позиций на '+total+' сомони'">
        <span class="badge">{{count}}</span>
        <span class="lbl">Корзина</span>
        <b>{{total}} с</b>
      </button>
    </Transition>

    <CartSheet v-model="cartOpen"/>
  </div>
</template>

<style scoped>
.page{max-width:1240px;margin:0 auto;padding:0 max(16px,env(safe-area-inset-left)) calc(110px + env(safe-area-inset-bottom)) max(16px,env(safe-area-inset-right))}
.hero{display:flex;align-items:center;gap:20px;padding:28px 0 20px}
.logo{width:clamp(76px,18vw,120px);height:auto;border-radius:50%;flex:none;box-shadow:0 0 0 3px rgba(201,164,92,.25)}
.kicker{margin:0;color:var(--gold);font:600 12px/1 var(--body);letter-spacing:.25em;text-transform:uppercase}
h1{margin:6px 0 6px;font:400 clamp(40px,9vw,72px)/1 var(--script);color:#fff}
.sub{margin:0;color:var(--muted);font:500 12px/1 var(--body);letter-spacing:.35em;text-transform:uppercase}
.bar{position:sticky;top:0;z-index:20;margin:0 calc(-1*max(16px,env(safe-area-inset-left)));padding:8px max(16px,env(safe-area-inset-left)) 0;background:rgba(18,18,18,.55);backdrop-filter:blur(14px) saturate(1.2);-webkit-backdrop-filter:blur(14px) saturate(1.2);border-bottom:1px solid rgba(255,255,255,.05)}
.bar-row{display:flex;align-items:center;gap:12px}
.bar-row .search{flex:1;min-width:0}
.cart-btn{position:relative;flex:none;display:flex;align-items:center;gap:8px;height:40px;padding:0 14px;border-radius:999px;border:1px solid rgba(255,255,255,.16);background:transparent;color:var(--ink);font-weight:600;font-size:14px;transition:background .2s,border-color .2s,transform .15s}
.cart-btn:hover{border-color:rgba(255,255,255,.32)}
.cart-btn:active{transform:scale(.96)}
.cart-btn.has{background:var(--red);border-color:var(--red);color:#fff}
.cart-btn svg{width:20px;height:20px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linejoin:round;stroke-linecap:round}
.cb-total{font:600 16px/1 var(--display);font-variant-numeric:tabular-nums}
.cb-count{position:absolute;top:-6px;right:-6px;min-width:20px;height:20px;padding:0 5px;border-radius:999px;background:#fff;color:var(--red);font:700 11.5px/20px var(--body);font-style:normal;text-align:center;box-shadow:0 0 0 2px var(--bg)}
@media (max-width:767px){.cart-btn{width:40px;padding:0;justify-content:center}.cb-total,.cb-label{display:none}}
@media (min-width:768px){.cart-fab{display:none!important}}
.search{display:flex;align-items:center;gap:10px;background:transparent;border:0;border-bottom:1px solid rgba(255,255,255,.12);border-radius:0;padding:0 2px;height:44px;transition:border-color .2s}
.search:focus-within{border-bottom-color:var(--gold)}
.search svg{width:18px;height:18px;fill:none;stroke:var(--muted);stroke-width:2;flex:none}
.search input{flex:1;min-width:0;background:transparent;border:0;outline:0;color:var(--ink);font:inherit;font-size:16px}
.search input::placeholder{color:var(--muted)}
.tabs{display:flex;gap:22px;overflow-x:auto;padding:0;scrollbar-width:none;scroll-snap-type:x proximity}
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
.cart-fab{position:fixed;z-index:30;left:50%;transform:translateX(-50%);bottom:calc(14px + env(safe-area-inset-bottom));display:flex;align-items:center;gap:12px;background:var(--red);color:#fff;border:0;border-radius:999px;padding:0 22px 0 8px;height:56px;width:min(420px,calc(100% - 32px));box-shadow:0 14px 30px -10px rgba(227,38,43,.6),0 2px 0 rgba(255,255,255,.12) inset;font-weight:600}
.cart-fab .badge{display:grid;place-items:center;min-width:40px;height:40px;border-radius:50%;background:rgba(0,0,0,.22);font-weight:700;font-variant-numeric:tabular-nums}
.cart-fab .lbl{flex:1;text-align:left;font-size:16px}
.cart-fab b{font:600 22px/1 var(--display)}
.pop-enter-active,.pop-leave-active{transition:transform .3s cubic-bezier(.2,.8,.2,1),opacity .3s}
.pop-enter-from,.pop-leave-to{opacity:0;transform:translate(-50%,24px)}
</style>
