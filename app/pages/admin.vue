<script setup lang="ts">
import type {BotChat,Dish,Menu,Order} from '~~/shared/types'
useHead({title:'Админ панель · Набережная',meta:[{name:'robots',content:'noindex,nofollow'}]})
const {authed,toasts,dialog,toast,confirm,answer}=useAdmin()

const menu=ref<Menu>({currency:'с',categories:[],items:[]})
const tab=ref<'dishes'|'orders'|'bot'>('dishes')
const q=ref('')
const catFilter=ref('')
const stock=ref<'all'|'off'>('all')
const formOpen=ref(false)
const editDish=ref<Dish|null>(null)
const catsOpen=ref(false)
const orders=ref<Order[]>([])
const ordersLoaded=ref(false)
const bot=ref<any>(null)
const botBusy=ref(false)
const login=reactive({login:'',password:'',show:false,busy:false,error:''})
const checking=ref(true)

async function loadMenu(){
  const {data}=await adminApi.get<Menu>('/menu',{baseURL:'/api'})
  menu.value=data
}
async function loadOrders(){
  try{orders.value=(await adminApi.get<Order[]>('/orders',{params:{limit:200}})).data;ordersLoaded.value=true}catch{}
}
async function loadBot(){
  try{bot.value=(await adminApi.get('/bot')).data}catch{}
}
async function enter(){
  await Promise.all([loadMenu().catch(()=>{}),loadOrders(),loadBot()])
}
onMounted(async()=>{
  try{await adminApi.get('/me');authed.value=true;await enter()}catch{authed.value=false}
  checking.value=false
})

async function doLogin(){
  login.error='';login.busy=true
  try{
    await adminApi.post('/login',{login:login.login,password:login.password})
    login.password=''
    authed.value=true
    await enter()
  }catch(e){login.error=errText(e)}
  finally{login.busy=false}
}
async function logout(){
  await adminApi.post('/logout').catch(()=>{})
  authed.value=false
}

let timer:ReturnType<typeof setInterval>|undefined
watch([tab,authed],()=>{
  clearInterval(timer)
  if(!authed.value)return
  if(tab.value==='orders'){loadOrders();timer=setInterval(loadOrders,15000)}
  if(tab.value==='bot'){loadBot();timer=setInterval(loadBot,8000)}
})
onBeforeUnmount(()=>clearInterval(timer))

const counts=computed(()=>{
  const r:Record<string,number>={}
  menu.value.items.forEach(d=>{r[d.category]=(r[d.category]||0)+1})
  return r
})
const offCount=computed(()=>menu.value.items.filter(d=>d.available===false).length)
const groups=computed(()=>{
  const s=q.value.trim().toLowerCase()
  return menu.value.categories
    .filter(c=>!catFilter.value||c.id===catFilter.value)
    .map(c=>({...c,items:menu.value.items.filter(d=>d.category===c.id&&(stock.value==='all'||d.available===false)&&(!s||(d.name+' '+d.en+' '+d.composition).toLowerCase().includes(s)))}))
    .filter(g=>g.items.length)
})
const shown=computed(()=>groups.value.reduce((n,g)=>n+g.items.length,0))

const openNew=()=>{editDish.value=null;formOpen.value=true}
const openEdit=(d:Dish)=>{editDish.value=d;formOpen.value=true}
async function saved(){formOpen.value=false;await loadMenu()}

async function toggle(d:Dish){
  const prev=d.available!==false
  d.available=!prev
  try{await adminApi.patch('/dishes/'+d.id,{available:d.available});toast(d.available?'Блюдо снова в меню':'Блюдо убрано из заказа')}
  catch(e){d.available=prev;toast(errText(e),'err')}
}
async function remove(d:Dish){
  if(!await confirm({title:`Удалить «${d.name}»?`,text:'Блюдо пропадёт из меню. Вернуть его можно только добавив заново.',ok:'Удалить',danger:true}))return
  try{await adminApi.delete('/dishes/'+d.id);toast('Блюдо удалено');await loadMenu()}
  catch(e){toast(errText(e),'err')}
}
const catName=(id:string)=>menu.value.categories.find(c=>c.id===id)?.title||''
const fmt=(v:{label:string;price:number}[])=>v.map(x=>x.label?`${x.label} · ${x.price} с`:`${x.price} с`).join('   ')

const TYPES:Record<string,string>={hall:'В зале',delivery:'Доставка',pickup:'Самовывоз'}
const when=(iso:string)=>new Date(iso).toLocaleString('ru-RU',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})
const today=computed(()=>{
  const k=new Date().toDateString()
  const list=orders.value.filter(o=>new Date(o.createdAt).toDateString()===k)
  return {n:list.length,sum:Math.round(list.reduce((s,o)=>s+o.total,0)*100)/100}
})
const where=(o:Order)=>o.type==='hall'?`стол ${o.table}`:o.type==='delivery'?o.address:''

async function testBot(){
  botBusy.value=true
  try{const r=(await adminApi.post('/bot/test')).data;toast(`Отправлено: ${r.ok} из ${r.total}`)}
  catch(e){toast(errText(e),'err')}
  finally{botBusy.value=false}
}
async function unsub(c:BotChat){
  if(!await confirm({title:'Отписать этого получателя?',text:`${c.name||c.id} перестанет получать заказы. Вернуться можно командой /start.`,ok:'Отписать',danger:true}))return
  try{await adminApi.delete('/bot/subscribers/'+c.id);toast('Получатель отписан');await loadBot()}
  catch(e){toast(errText(e),'err')}
}
const newPhone=ref('')
const phoneBusy=ref(false)
async function addPhone(){
  phoneBusy.value=true
  try{await adminApi.post('/bot/phones',{phone:newPhone.value});newPhone.value='';toast('Номер добавлен');await loadBot()}
  catch(e){toast(errText(e),'err')}
  finally{phoneBusy.value=false}
}
async function delPhone(p:string){
  if(!await confirm({title:`Убрать +${p} из списка?`,text:'Если этот человек уже получает заказы, он перестанет их получать.',ok:'Убрать',danger:true}))return
  try{await adminApi.delete('/bot/phones/'+p);toast('Номер убран');await loadBot()}
  catch(e){toast(errText(e),'err')}
}
const whoHas=(p:string)=>{
  const c=(bot.value?.subscribers||[]).find((s:BotChat)=>(s.phone||'').replace(/\D/g,'')===p)
  return c?`подключён: ${c.name||c.id}`:'ещё не подключался'
}
const ago=(t:number)=>{
  if(!t)return 'нет данных'
  const s=Math.round((Date.now()-t)/1000)
  return s<10?'только что':s<60?`${s} сек назад`:`${Math.round(s/60)} мин назад`
}
const onDialogKey=(e:KeyboardEvent)=>{if(dialog.value){if(e.key==='Escape')answer(false)}}
onMounted(()=>window.addEventListener('keydown',onDialogKey))
onBeforeUnmount(()=>window.removeEventListener('keydown',onDialogKey))
</script>

<template>
  <div class="adm">
    <div v-if="checking" class="center"><span class="spin" aria-label="Загрузка"/></div>

    <main v-else-if="!authed" class="center">
      <form class="login" @submit.prevent="doLogin">
        <img src="/logo.png" alt="" width="72" height="72">
        <h1>Вход для администратора</h1>
        <p class="sub">Эта страница не показывается гостям</p>
        <label>Логин<input v-model="login.login" name="username" autocomplete="username" autocapitalize="off" autofocus required></label>
        <label>Пароль
          <span class="pw">
            <input v-model="login.password" name="password" :type="login.show?'text':'password'" autocomplete="current-password" required>
            <button type="button" class="eye" @click="login.show=!login.show" :aria-label="login.show?'Скрыть пароль':'Показать пароль'">{{login.show?'Скрыть':'Показать'}}</button>
          </span>
        </label>
        <p v-if="login.error" class="err" role="alert">{{login.error}}</p>
        <button type="submit" class="primary" :disabled="login.busy||!login.login||!login.password">{{login.busy?'Входим…':'Войти'}}</button>
      </form>
    </main>

    <template v-else>
      <header class="top">
        <div class="top-in">
          <div class="brand"><img src="/logo.png" alt="" width="36" height="36"><b>Админ панель</b></div>
          <nav class="tabs" aria-label="Разделы">
            <button type="button" :class="{on:tab==='dishes'}" @click="tab='dishes'">Блюда</button>
            <button type="button" :class="{on:tab==='orders'}" @click="tab='orders'">Заказы<i v-if="today.n">{{today.n}}</i></button>
            <button type="button" :class="{on:tab==='bot'}" @click="tab='bot'">Telegram<i v-if="bot&&!bot.running" class="dot off" title="Бот не отвечает"/></button>
          </nav>
          <div class="top-r">
            <a href="/" target="_blank" rel="noopener" class="ghost">Открыть меню</a>
            <button type="button" class="ghost" @click="logout">Выйти</button>
          </div>
        </div>
      </header>

      <main class="wrap">
        <section v-if="tab==='dishes'">
          <div class="head">
            <div>
              <h1>Блюда</h1>
              <p class="sub">{{menu.items.length}} в меню<template v-if="offCount"> · {{offCount}} нет в наличии</template></p>
            </div>
            <div class="head-r">
              <button type="button" class="ghost" @click="catsOpen=true">Категории</button>
              <button type="button" class="primary" @click="openNew" :disabled="!menu.categories.length">+ Добавить блюдо</button>
            </div>
          </div>

          <div class="tools">
            <div class="search"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg><input v-model="q" type="search" placeholder="Найти блюдо" aria-label="Поиск по блюдам"></div>
            <select v-model="catFilter" aria-label="Категория"><option value="">Все категории</option><option v-for="c in menu.categories" :key="c.id" :value="c.id">{{c.title}}</option></select>
            <div class="seg" role="group" aria-label="Наличие">
              <button type="button" :class="{on:stock==='all'}" @click="stock='all'">Все</button>
              <button type="button" :class="{on:stock==='off'}" @click="stock='off'">Нет в наличии</button>
            </div>
          </div>

          <p v-if="!menu.categories.length" class="empty">Категорий нет. Нажмите «Категории» и добавьте первую.</p>
          <p v-else-if="!shown" class="empty">Ничего не найдено</p>

          <div v-for="g in groups" :key="g.id" class="group">
            <h2>{{g.title}}<span>{{g.items.length}}</span></h2>
            <ul class="rows">
              <li v-for="d in g.items" :key="d.id" class="row" :class="{off:d.available===false}">
                <button type="button" class="thumb" @click="openEdit(d)" :aria-label="'Изменить '+d.name">
                  <img v-if="d.image" :src="d.image" alt="" loading="lazy">
                  <svg v-else viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="3"/><circle cx="9" cy="10" r="1.6"/><path d="m21 16-5-5-8 8"/></svg>
                </button>
                <div class="main" @click="openEdit(d)">
                  <b>{{d.name}}</b>
                  <span v-if="d.composition" class="comp">{{d.composition}}</span>
                  <span v-else class="comp none">Состав не указан</span>
                </div>
                <div class="price">{{fmt(d.variants)}}</div>
                <label class="sw" :title="d.available===false?'Нет в наличии':'В наличии'">
                  <input type="checkbox" :checked="d.available!==false" @change="toggle(d)" :aria-label="'В наличии: '+d.name">
                  <span class="box" aria-hidden="true"/>
                  <small>{{d.available===false?'Нет':'Есть'}}</small>
                </label>
                <div class="acts">
                  <button type="button" class="ic" @click="openEdit(d)" aria-label="Изменить"><svg viewBox="0 0 24 24"><path d="M4 20h4L19 9l-4-4L4 16z"/><path d="m13.5 6.5 4 4"/></svg></button>
                  <button type="button" class="ic danger" @click="remove(d)" aria-label="Удалить"><svg viewBox="0 0 24 24"><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/></svg></button>
                </div>
              </li>
            </ul>
          </div>
        </section>

        <section v-else-if="tab==='orders'">
          <div class="head">
            <div><h1>Заказы</h1><p class="sub">Сегодня: {{today.n}} на {{today.sum}} с</p></div>
          </div>
          <p v-if="ordersLoaded&&!orders.length" class="empty">Заказов пока не было</p>
          <ul class="orders">
            <li v-for="o in orders" :key="o.id+o.createdAt" class="ord">
              <div class="ord-top">
                <b>#{{o.id}}</b>
                <span class="when">{{when(o.createdAt)}}</span>
                <span class="tag">{{TYPES[o.type]}}</span>
                <span v-if="o.delivered===false" class="tag warn" title="В Telegram не ушёл: придёт, когда кто-то нажмёт «Старт» у бота">не доставлен в Telegram</span>
                <b class="sum">{{o.total}} с</b>
              </div>
              <div class="ord-who">{{o.name}} · <a :href="'tel:'+o.phone">{{o.phone}}</a><template v-if="where(o)"> · {{where(o)}}</template></div>
              <details>
                <summary>{{o.items.length}} {{o.items.length===1?'позиция':'позиций'}}</summary>
                <ul class="items"><li v-for="(i,k) in o.items" :key="k"><span>{{i.name}}<em v-if="i.variant"> ({{i.variant}})</em> × {{i.qty}}</span><b>{{Math.round(i.price*i.qty*100)/100}} с</b></li></ul>
                <p v-if="o.comment" class="cmt">«{{o.comment}}»</p>
              </details>
            </li>
          </ul>
        </section>

        <section v-else>
          <div class="head"><div><h1>Telegram</h1><p class="sub">Куда приходят заказы</p></div></div>
          <div v-if="bot" class="cards">
            <div class="card">
              <h3>Состояние бота</h3>
              <p class="stat"><i class="dot" :class="bot.running?'on':'off'"/>{{bot.running?'Работает':'Не отвечает'}}</p>
              <p class="note">Последний опрос: {{ago(bot.lastPoll)}}</p>
              <p v-if="bot.pending" class="warn-box">Ждут отправки: {{bot.pending}} {{bot.pending===1?'заказ':'заказов'}}. Бот досылает их сам, как только есть связь и получатель.</p>
              <p v-if="bot.lastError" class="err">Связь с Telegram: {{bot.lastError}}. Бот повторяет попытку.</p>
              <p v-if="!bot.configured" class="err">Токен бота не задан в .env</p>
              <a v-if="bot.username" :href="'https://t.me/'+bot.username" target="_blank" rel="noopener" class="ghost lk">Открыть @{{bot.username}}</a>
            </div>
            <div class="card">
              <h3>Получатели заказов</h3>
              <p v-if="!bot.subscribers.length&&!bot.fixedChats.length" class="warn-box">Пока никто не подписан. Откройте бота и нажмите «Старт»: заказы, которые пришли раньше, отправятся сразу.</p>
              <ul class="subs">
                <li v-for="c in bot.subscribers" :key="c.id">
                  <div><b>{{c.name||'Без имени'}}</b><span>{{c.username?'@'+c.username+' · ':''}}{{c.id}}</span></div>
                  <button type="button" class="mini danger" @click="unsub(c)">Отписать</button>
                </li>
                <li v-for="id in bot.fixedChats" :key="'f'+id"><div><b>Чат из настроек</b><span>{{id}} · задан в .env</span></div></li>
              </ul>
              <button type="button" class="primary" :disabled="botBusy" @click="testBot">{{botBusy?'Отправляем…':'Отправить тестовое сообщение'}}</button>
            </div>
            <div class="card">
              <h3>Белый список номеров</h3>
              <p class="note">Заказы получат только те, чей номер здесь есть. Остальным бот ответит, что он недоступен.</p>
              <p v-if="!bot.phones.fixed.length&&!bot.phones.saved.length" class="warn-box">Список пуст: сейчас бот никого не пустит. Добавьте номер ниже.</p>
              <ul class="subs">
                <li v-for="p in bot.phones.fixed" :key="'f'+p"><div><b>+{{p}}</b><span>задан в .env</span></div></li>
                <li v-for="p in bot.phones.saved" :key="p"><div><b>+{{p}}</b><span>{{whoHas(p)}}</span></div><button type="button" class="mini danger" @click="delPhone(p)">Убрать</button></li>
              </ul>
              <form class="addp" @submit.prevent="addPhone">
                <input v-model="newPhone" type="tel" inputmode="tel" placeholder="+992 90 123 45 67" aria-label="Новый номер" maxlength="20">
                <button type="submit" class="primary" :disabled="phoneBusy||newPhone.replace(/\D/g,'').length<9">Добавить</button>
              </form>
            </div>
            <div class="card">
              <h3>Как подключиться</h3>
              <ol class="steps"><li>Откройте бота в Telegram и нажмите «Старт».</li><li>Нажмите кнопку «Поделиться номером».</li><li>Если номер в белом списке, бот ответит «Готово», и заказы начнут приходить.</li></ol>
              <p class="note">Команды бота: <code>/stop</code> отписаться, <code>/orders</code> последние заказы.</p>
            </div>
          </div>
        </section>
      </main>
    </template>

    <AdminDishForm :open="formOpen" :dish="editDish" :categories="menu.categories" :default-category="catFilter" @close="formOpen=false" @saved="saved"/>
    <AdminCategories :open="catsOpen" :categories="menu.categories" :counts="counts" @close="catsOpen=false" @changed="loadMenu"/>

    <Teleport to="body">
      <Transition name="fade">
        <div v-if="dialog" class="cscrim" @click.self="answer(false)">
          <div class="cbox" role="alertdialog" aria-modal="true" :aria-label="dialog.title">
            <h3>{{dialog.title}}</h3>
            <p v-if="dialog.text">{{dialog.text}}</p>
            <div class="cact">
              <button type="button" class="ghost" @click="answer(false)">Отмена</button>
              <button type="button" class="primary" :class="{dng:dialog.danger}" @click="answer(true)">{{dialog.ok}}</button>
            </div>
          </div>
        </div>
      </Transition>
      <div class="toasts" aria-live="polite">
        <TransitionGroup name="toast"><div v-for="t in toasts" :key="t.id" class="toast" :class="t.kind">{{t.text}}</div></TransitionGroup>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.adm{min-height:100dvh;--panel:rgba(22,22,22,.82);--ln:rgba(255,255,255,.08)}
.center{min-height:100dvh;display:grid;place-items:center;padding:20px}
.spin{width:32px;height:32px;border:3px solid rgba(255,255,255,.12);border-top-color:var(--red);border-radius:50%;animation:sp .8s linear infinite}
@keyframes sp{to{transform:rotate(360deg)}}
.login{width:min(380px,100%);display:flex;flex-direction:column;gap:14px;background:var(--panel);backdrop-filter:blur(10px);border:1px solid var(--ln);border-radius:20px;padding:28px 24px}
.login img{border-radius:50%;align-self:center;box-shadow:0 0 0 3px rgba(201,164,92,.25)}
.login h1{margin:4px 0 0;text-align:center;font:600 24px/1.1 var(--display);text-transform:uppercase;letter-spacing:.03em}
.login .sub{margin:0 0 6px;text-align:center}
.login label{display:flex;flex-direction:column;gap:6px;font-size:13px;font-weight:600;color:var(--ink2)}
input,select{font:inherit;font-size:16px;color:var(--ink);background:#0f0f0f;border:1px solid var(--ln);border-radius:10px;padding:12px 14px;outline:none;width:100%;transition:border-color .2s}
input:focus,select:focus{border-color:var(--gold)}
.pw{position:relative;display:block}
.pw input{padding-right:84px}
.eye{position:absolute;right:6px;top:50%;transform:translateY(-50%);border:0;background:transparent;color:var(--gold);font-size:13px;font-weight:600;padding:8px}
.err{margin:0;color:#ff7b7b;font-size:14px}
.primary{min-height:46px;border:0;border-radius:12px;background:var(--red);color:#fff;font-weight:700;font-size:15px;padding:0 20px;transition:filter .2s,transform .15s;white-space:nowrap}
.primary:hover{filter:brightness(1.08)}
.primary:active{transform:scale(.98)}
.primary:disabled{opacity:.5;cursor:not-allowed}
.primary.dng{background:#c4231f}
.ghost{display:inline-flex;align-items:center;justify-content:center;min-height:42px;border:1px solid var(--ln);background:transparent;color:var(--ink);border-radius:12px;padding:0 16px;font-weight:600;font-size:14px;text-decoration:none;white-space:nowrap}
.ghost:hover{border-color:rgba(255,255,255,.28)}
.top{position:sticky;top:0;z-index:30;background:rgba(18,18,18,.7);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);border-bottom:1px solid var(--ln)}
.top-in{max-width:1100px;margin:0 auto;padding:10px 20px;display:flex;align-items:center;gap:18px}
.brand{display:flex;align-items:center;gap:10px}
.brand img{border-radius:50%}
.brand b{font:600 18px/1 var(--display);text-transform:uppercase;letter-spacing:.06em}
.tabs{display:flex;gap:4px;flex:1;overflow-x:auto;scrollbar-width:none}
.tabs button{position:relative;border:0;background:transparent;color:var(--muted);padding:10px 14px;font-weight:600;font-size:14px;border-radius:10px;white-space:nowrap;display:flex;align-items:center;gap:7px}
.tabs button:hover{color:var(--ink2)}
.tabs button.on{background:rgba(255,255,255,.08);color:var(--ink)}
.tabs i{font-style:normal;background:var(--red);color:#fff;border-radius:999px;font-size:11px;min-width:18px;height:18px;display:grid;place-items:center;padding:0 5px}
.dot{display:inline-block;width:9px;height:9px;border-radius:50%;margin-right:8px;background:#777}
.dot.on{background:#3ecf6e;box-shadow:0 0 0 4px rgba(62,207,110,.15)}
.dot.off{background:#ff5a5a;box-shadow:0 0 0 4px rgba(255,90,90,.15)}
.tabs .dot{margin:0}
.top-r{display:flex;gap:8px}
.wrap{max-width:1100px;margin:0 auto;padding:24px 20px 80px}
.head{display:flex;align-items:flex-end;justify-content:space-between;gap:16px;flex-wrap:wrap;margin-bottom:18px}
.head h1{margin:0;font:600 34px/1 var(--display);text-transform:uppercase;letter-spacing:.02em}
.sub{margin:6px 0 0;color:var(--muted);font-size:14px}
.head-r{display:flex;gap:10px;flex-wrap:wrap}
.tools{display:grid;grid-template-columns:minmax(0,1fr) 200px auto;gap:10px;margin-bottom:8px}
.search{display:flex;align-items:center;gap:10px;background:#0f0f0f;border:1px solid var(--ln);border-radius:10px;padding:0 12px}
.search:focus-within{border-color:var(--gold)}
.search svg{width:18px;height:18px;fill:none;stroke:var(--muted);stroke-width:2;flex:none}
.search input{border:0;background:transparent;padding:12px 0}
select{appearance:none;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%238d8a84' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 12px center;background-size:18px;padding-right:38px}
.seg{display:flex;background:#0f0f0f;border:1px solid var(--ln);border-radius:10px;padding:3px}
.seg button{border:0;background:transparent;color:var(--muted);border-radius:8px;padding:0 14px;font-weight:600;font-size:13px;white-space:nowrap}
.seg button.on{background:rgba(255,255,255,.1);color:var(--ink)}
.empty{text-align:center;color:var(--muted);padding:48px 0}
.group{margin-top:22px}
.group h2{margin:0 0 8px;font:600 15px/1 var(--body);letter-spacing:.14em;text-transform:uppercase;color:var(--gold);display:flex;align-items:center;gap:10px}
.group h2 span{color:var(--muted);font-weight:500;letter-spacing:0}
.rows{list-style:none;margin:0;padding:0;background:var(--panel);backdrop-filter:blur(8px);border:1px solid var(--ln);border-radius:16px;overflow:hidden}
.row{display:grid;grid-template-columns:56px minmax(0,1fr) minmax(0,210px) 74px 84px;gap:14px;align-items:center;padding:10px 14px;border-bottom:1px solid var(--ln);transition:background .15s}
.row:last-child{border-bottom:0}
.row:hover{background:rgba(255,255,255,.03)}
.row.off .thumb img,.row.off .main b{opacity:.45}
.thumb{width:56px;height:56px;border-radius:10px;overflow:hidden;border:1px solid var(--ln);background:#121212;display:grid;place-items:center;padding:0;cursor:pointer}
.thumb img{width:100%;height:100%;object-fit:cover}
.thumb svg{width:22px;height:22px;fill:none;stroke:#5d5a55;stroke-width:1.6;stroke-linecap:round;stroke-linejoin:round}
.main{display:flex;flex-direction:column;gap:3px;min-width:0;cursor:pointer}
.main b{font-weight:600;font-size:15px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.comp{font-size:13px;color:var(--muted);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.comp.none{font-style:italic;opacity:.6}
.price{font:500 13.5px/1.5 var(--body);color:var(--ink2);font-variant-numeric:tabular-nums;white-space:pre-wrap}
.sw{display:flex;flex-direction:column;align-items:center;gap:3px;cursor:pointer}
.sw input{position:absolute;opacity:0;pointer-events:none}
.sw .box{width:40px;height:24px;border-radius:999px;background:#2b2b2b;position:relative;transition:background .2s}
.sw .box::after{content:'';position:absolute;top:3px;left:3px;width:18px;height:18px;border-radius:50%;background:#fff;transition:transform .2s}
.sw input:checked+.box{background:#2f9e5a}
.sw input:checked+.box::after{transform:translateX(16px)}
.sw input:focus-visible+.box{outline:2px solid var(--gold);outline-offset:2px}
.sw small{font-size:11px;color:var(--muted)}
.acts{display:flex;gap:6px;justify-content:flex-end}
.ic{width:38px;height:38px;border-radius:10px;border:1px solid var(--ln);background:transparent;color:var(--ink2);display:grid;place-items:center;padding:0}
.ic svg{width:18px;height:18px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}
.ic:hover{border-color:rgba(255,255,255,.3);color:var(--ink)}
.ic.danger:hover{border-color:#ff6b6b;color:#ff8080}
.orders{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:10px}
.ord{background:var(--panel);border:1px solid var(--ln);border-radius:14px;padding:14px 16px}
.ord-top{display:flex;align-items:center;gap:10px;flex-wrap:wrap}
.ord-top b:first-child{font:600 17px/1 var(--display);letter-spacing:.04em}
.when{color:var(--muted);font-size:13px}
.tag{font-size:12px;font-weight:600;padding:4px 9px;border-radius:999px;background:rgba(255,255,255,.08);color:var(--ink2)}
.tag.warn{background:rgba(255,170,60,.14);color:#ffb85c}
.sum{margin-left:auto;font:600 20px/1 var(--display)}
.ord-who{margin-top:8px;font-size:14px;color:var(--ink2)}
.ord-who a{color:var(--gold);text-decoration:none}
.ord details{margin-top:8px}
.ord summary{cursor:pointer;color:var(--muted);font-size:13px;padding:4px 0}
.items{list-style:none;margin:8px 0 0;padding:0;display:flex;flex-direction:column;gap:6px}
.items li{display:flex;justify-content:space-between;gap:12px;font-size:14px}
.items em{color:var(--muted);font-style:normal}
.cmt{margin:10px 0 0;font-size:14px;color:var(--ink2);font-style:italic}
.cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:14px;align-items:start}
.card{background:var(--panel);border:1px solid var(--ln);border-radius:16px;padding:18px;display:flex;flex-direction:column;gap:12px}
.card h3{margin:0;font:600 13px/1 var(--body);letter-spacing:.14em;text-transform:uppercase;color:var(--gold)}
.stat{margin:0;font-size:20px;font-weight:600;display:flex;align-items:center}
.note{margin:0;font-size:13.5px;color:var(--muted);line-height:1.5}
.note code{background:rgba(255,255,255,.08);padding:1px 6px;border-radius:5px}
.lk{align-self:flex-start}
.warn-box{margin:0;padding:12px 14px;background:rgba(255,170,60,.1);border:1px solid rgba(255,170,60,.28);border-radius:10px;color:#ffc27a;font-size:14px;line-height:1.5}
.subs{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:8px}
.subs li{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:10px 12px;border:1px solid var(--ln);border-radius:10px}
.subs div{display:flex;flex-direction:column;gap:2px;min-width:0}
.subs span{font-size:12.5px;color:var(--muted)}
.mini{height:34px;border-radius:9px;border:1px solid var(--ln);background:transparent;color:var(--ink);padding:0 12px;font-size:13px;font-weight:600;white-space:nowrap}
.mini.danger{color:#ff8080}
.addp{display:flex;gap:8px}
.addp .primary{min-height:46px}
.steps{margin:0;padding-left:20px;display:flex;flex-direction:column;gap:6px;color:var(--ink2);font-size:14.5px}
.cscrim{position:fixed;inset:0;z-index:90;background:rgba(0,0,0,.65);backdrop-filter:blur(3px);display:grid;place-items:center;padding:16px}
.cbox{width:min(400px,100%);background:#1a1a1a;border:1px solid var(--ln);border-radius:18px;padding:22px}
.cbox h3{margin:0 0 8px;font-size:18px;font-weight:700;line-height:1.3}
.cbox p{margin:0 0 18px;color:var(--ink2);font-size:14.5px;line-height:1.5}
.cact{display:flex;gap:10px;justify-content:flex-end}
.toasts{position:fixed;z-index:100;left:50%;transform:translateX(-50%);bottom:calc(18px + env(safe-area-inset-bottom));display:flex;flex-direction:column;gap:8px;align-items:center;width:min(440px,calc(100% - 24px));pointer-events:none}
.toast{padding:12px 18px;border-radius:12px;background:#222;border:1px solid var(--ln);font-size:14px;font-weight:600;box-shadow:0 10px 30px rgba(0,0,0,.45)}
.toast.ok{border-color:rgba(62,207,110,.4)}
.toast.err{border-color:rgba(255,107,107,.5);color:#ff9a9a}
.toast-enter-active,.toast-leave-active{transition:all .28s cubic-bezier(.2,.8,.2,1)}
.toast-enter-from,.toast-leave-to{opacity:0;transform:translateY(12px)}
.fade-enter-active,.fade-leave-active{transition:opacity .2s}
.fade-enter-from,.fade-leave-to{opacity:0}
@media (max-width:860px){
  .top-in{flex-wrap:wrap;gap:8px 12px;padding:10px 14px}
  .tabs{order:3;flex:1 0 100%}
  .top-r{margin-left:auto}
  .top-r .ghost:first-child{display:none}
  .wrap{padding:18px 14px 90px}
  .tools{grid-template-columns:1fr 1fr}
  .search{grid-column:1/-1}
  .head h1{font-size:28px}
  .head-r{width:100%}
  .head-r .primary{flex:1}
}
@media (max-width:720px){
  .row{grid-template-columns:56px minmax(0,1fr) auto;grid-template-areas:'t m s' 't p a';gap:6px 12px;align-items:center}
  .thumb{grid-area:t;align-self:start}
  .main{grid-area:m}
  .main b,.comp{white-space:normal;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical}
  .price{grid-area:p;font-size:13px}
  .sw{grid-area:s;align-self:start}
  .acts{grid-area:a}
  .ord-top .sum{margin-left:0;flex-basis:100%}
}
@media (max-width:420px){.tools{grid-template-columns:1fr}.top-r .ghost{padding:0 12px}}
</style>
