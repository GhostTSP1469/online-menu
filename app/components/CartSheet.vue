<script setup lang="ts">
import axios from 'axios'
import type {OrderForm} from '~~/shared/types'
const open=defineModel<boolean>({default:false})
const {lines,total,inc,dec,clear}=useCart()
const step=ref<'cart'|'form'|'done'>('cart')
const sending=ref(false)
const error=ref('')
const result=ref<{id:string;total:number;delivered:boolean}|null>(null)
const form=reactive<OrderForm>({name:'',phone:'+992 ',type:'hall',table:'',address:'',comment:''})

onMounted(()=>{
  try{localStorage.removeItem('naberezhnaya-guest')}catch{}
})
watch(open,v=>{
  if(!v&&step.value==='done'){step.value='cart';result.value=null}
  if(import.meta.client)document.documentElement.style.overflow=v?'hidden':''
})

async function submit(){
  error.value=''
  if(!form.name.trim())return error.value='Укажите имя'
  if(form.phone.replace(/\D/g,'').length<9)return error.value='Укажите номер телефона'
  if(form.type==='hall'&&!form.table.trim())return error.value='Укажите номер стола'
  if(form.type==='delivery'&&!form.address.trim())return error.value='Укажите адрес доставки'
  sending.value=true
  try{
    const {data}=await axios.post('/api/order',{items:lines.value.map(l=>({id:l.id,variant:l.variant,qty:l.qty})),form})

    result.value=data
    clear()
    step.value='done'
  }catch(e:any){
    error.value=e?.response?.data?.statusMessage||e?.response?.data?.message||'Не удалось отправить заказ. Проверьте интернет и попробуйте ещё раз.'
  }finally{sending.value=false}
}
const close=()=>{open.value=false}
const onKey=(e:KeyboardEvent)=>{if(e.key==='Escape'&&open.value)close()}
onMounted(()=>window.addEventListener('keydown',onKey))
onBeforeUnmount(()=>window.removeEventListener('keydown',onKey))
</script>

<template>
  <Teleport to="body">
    <Transition name="fade"><div v-if="open" class="scrim" @click="close"/></Transition>
    <Transition name="sheet">
      <aside v-if="open" class="sheet" role="dialog" aria-modal="true" aria-label="Корзина">
        <header class="head">
          <button v-if="step==='form'" type="button" class="icon" @click="step='cart'" aria-label="Назад">←</button>
          <h2>{{step==='cart'?'Корзина':step==='form'?'Оформление':'Заказ принят'}}</h2>
          <button type="button" class="icon" @click="close" aria-label="Закрыть">✕</button>
        </header>

        <div v-if="step==='cart'" class="content">
          <div v-if="!lines.length" class="empty">
            <img src="/logo.png" alt="" width="96" height="96">
            <p>Корзина пуста</p>
            <button type="button" class="ghost" @click="close">В меню</button>
          </div>
          <ul v-else class="list">
            <li v-for="l in lines" :key="l.key">
              <img :src="l.image" :alt="l.name" width="64" height="64">
              <div class="info">
                <b>{{l.name}}</b>
                <span>{{l.variant}} · {{l.price}} с</span>
              </div>
              <div class="qty">
                <button type="button" @click="dec(l.key)" aria-label="Убрать одну">−</button>
                <span>{{l.qty}}</span>
                <button type="button" @click="inc(l.key)" aria-label="Добавить">+</button>
              </div>
            </li>
          </ul>
        </div>

        <form v-else-if="step==='form'" id="order" class="content form" @submit.prevent="submit" novalidate>
          <div class="seg" role="radiogroup" aria-label="Способ получения">
            <button v-for="t in [['hall','В зале'],['pickup','Самовывоз'],['delivery','Доставка']]" :key="t[0]" type="button" role="radio" :aria-checked="form.type===t[0]" :class="{on:form.type===t[0]}" @click="form.type=t[0] as OrderForm['type']">{{t[1]}}</button>
          </div>
          <label>Имя<input v-model="form.name" name="order-name" autocomplete="off" maxlength="60" required></label>
          <label>Телефон<input v-model="form.phone" name="order-phone" type="tel" inputmode="tel" autocomplete="off" maxlength="20" required></label>
          <label v-if="form.type==='hall'">Номер стола<input v-model="form.table" name="order-table" inputmode="numeric" autocomplete="off" maxlength="10"></label>
          <label v-if="form.type==='delivery'">Адрес<input v-model="form.address" name="order-address" autocomplete="off" placeholder="Улица, дом, квартира" maxlength="200"></label>
          <label>Комментарий к заказу<textarea v-model="form.comment" name="order-comment" rows="2" maxlength="300"/></label>
          <p v-if="error" class="err" role="alert">{{error}}</p>
        </form>

        <div v-else class="content done">
          <div class="check">✓</div>
          <h3>Заказ #{{result?.id}} принят</h3>
          <p>Сумма: <b>{{result?.total}} с</b></p>
          <p class="muted">Мы свяжемся с вами по указанному номеру.</p>
          <button type="button" class="primary" @click="close">Вернуться в меню</button>
        </div>

        <footer v-if="step!=='done'&&lines.length" class="foot">
          <div class="sum"><span>Итого</span><b>{{total}} с</b></div>
          <button v-if="step==='cart'" type="button" class="primary" @click="step='form'">Оформить заказ</button>
          <button v-else type="submit" form="order" class="primary" :disabled="sending">{{sending?'Отправляем…':'Заказать'}}</button>
        </footer>
      </aside>
    </Transition>
  </Teleport>
</template>

<style scoped>
.scrim{position:fixed;inset:0;background:rgba(0,0,0,.6);backdrop-filter:blur(2px);z-index:40}
.sheet{position:fixed;z-index:50;background:#161616;color:var(--ink);display:flex;flex-direction:column;inset:auto 0 0 0;max-height:92dvh;border-radius:22px 22px 0 0;border-top:1px solid var(--line);padding-bottom:env(safe-area-inset-bottom)}
@media (min-width:768px){.sheet{inset:0 0 0 auto;width:440px;max-height:none;border-radius:0;border-top:0;border-left:1px solid var(--line)}}
.head{display:flex;align-items:center;gap:8px;padding:16px 16px 8px}
.head h2{flex:1;margin:0;font:600 22px/1 var(--display);text-transform:uppercase;letter-spacing:.03em}
.icon{width:40px;height:40px;border-radius:12px;border:1px solid var(--line);background:transparent;color:var(--ink);font-size:16px}
.content{flex:1;overflow-y:auto;overscroll-behavior:contain;padding:8px 16px 16px}
.empty{display:flex;flex-direction:column;align-items:center;gap:12px;padding:40px 0;color:var(--muted)}
.empty img{border-radius:50%;opacity:.8}
.list{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:10px}
.list li{display:flex;align-items:center;gap:12px;padding:10px;background:var(--card);border:1px solid var(--line);border-radius:14px}
.list img{width:56px;height:56px;border-radius:10px;object-fit:cover;flex:none}
.info{flex:1;min-width:0;display:flex;flex-direction:column;gap:3px}
.info b{font-weight:600;font-size:15px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.info span{font-size:13px;color:var(--muted)}
.qty{display:flex;align-items:center;gap:2px;background:#222;border-radius:10px;padding:2px;flex:none}
.qty button{width:32px;height:32px;border:0;border-radius:8px;background:#2e2e2e;color:#fff;font-size:18px}
.qty span{min-width:22px;text-align:center;font-weight:700;font-size:14px}
.form{display:flex;flex-direction:column;gap:14px}
.seg{display:grid;grid-template-columns:repeat(3,1fr);gap:4px;background:#0f0f0f;border:1px solid var(--line);border-radius:14px;padding:4px}
.seg button{border:0;background:transparent;color:var(--ink2);border-radius:10px;min-height:42px;font-weight:600;font-size:14px}
.seg button.on{background:var(--red);color:#fff}
label{display:flex;flex-direction:column;gap:6px;font-size:13px;color:var(--muted)}
input,textarea{font:inherit;font-size:16px;color:var(--ink);background:#0f0f0f;border:1px solid var(--line);border-radius:12px;padding:12px 14px;outline:none;resize:none}
input:focus,textarea:focus{border-color:var(--gold)}
.err{margin:0;color:#ff6b6b;font-size:14px}
.foot{display:flex;flex-direction:column;gap:10px;padding:12px 16px 16px;border-top:1px solid var(--line)}
.sum{display:flex;justify-content:space-between;align-items:baseline}
.sum span{color:var(--muted);font-size:14px}
.sum b{font:600 26px/1 var(--display)}
.primary{width:100%;min-height:52px;border:0;border-radius:14px;background:var(--red);color:#fff;font-weight:700;font-size:16px}
.primary:disabled{opacity:.6}
.primary:active{transform:scale(.98)}
.ghost{border:1px solid var(--line);background:transparent;color:var(--ink);border-radius:12px;padding:10px 18px;min-height:44px}
.done{display:flex;flex-direction:column;align-items:center;text-align:center;gap:6px;padding-top:32px}
.check{width:72px;height:72px;border-radius:50%;display:grid;place-items:center;background:rgba(201,164,92,.15);color:var(--gold);font-size:34px;margin-bottom:8px}
.done h3{margin:0;font:600 24px/1.2 var(--display);text-transform:uppercase}
.done p{margin:0}
.done .muted{color:var(--muted);max-width:30ch;margin:4px 0 20px}
.fade-enter-active,.fade-leave-active{transition:opacity .25s}
.fade-enter-from,.fade-leave-to{opacity:0}
.sheet-enter-active,.sheet-leave-active{transition:transform .32s cubic-bezier(.2,.8,.2,1)}
.sheet-enter-from,.sheet-leave-to{transform:translateY(100%)}
@media (min-width:768px){.sheet-enter-from,.sheet-leave-to{transform:translateX(100%)}}
@media (prefers-reduced-motion:reduce){.sheet-enter-active,.sheet-leave-active,.fade-enter-active,.fade-leave-active{transition:none}}
</style>
