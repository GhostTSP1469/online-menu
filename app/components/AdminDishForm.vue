<script setup lang="ts">
import type {Category,Dish} from '~~/shared/types'
const props=defineProps<{open:boolean;dish:Dish|null;categories:Category[];defaultCategory?:string}>()
const emit=defineEmits<{close:[];saved:[]}>()
const {toast}=useAdmin()

type Row={label:string;price:string}
const blank=()=>({name:'',en:'',category:props.defaultCategory||props.categories[0]?.id||'',composition:'',image:'',available:true,variants:[{label:'',price:''}] as Row[]})
const f=reactive(blank())
const errors=reactive<Record<string,string>>({})
const top=ref('')
const saving=ref(false)
const uploading=ref(false)
const progress=ref(0)
const over=ref(false)
const fresh=ref<string[]>([])
const nameEl=ref<HTMLInputElement>()
const fileEl=ref<HTMLInputElement>()
const saved=ref(false)

watch(()=>props.open,o=>{
  if(!o)return
  Object.keys(errors).forEach(k=>delete errors[k])
  top.value='';fresh.value=[];saved.value=false
  const d=props.dish
  Object.assign(f,d?{name:d.name,en:d.en,category:d.category,composition:d.composition,image:d.image,available:d.available!==false,variants:d.variants.map(v=>({label:v.label,price:String(v.price)}))}:blank())
  nextTick(()=>nameEl.value?.focus())
})

const trash=(urls:string[])=>urls.forEach(u=>adminApi.delete('/upload',{params:{url:u}}).catch(()=>{}))

async function upload(file?:File){
  if(!file)return
  delete errors.photo
  if(!file.type.startsWith('image/')){errors.photo='Выберите картинку: JPG, PNG или WebP';return}
  if(file.size>10*1024*1024){errors.photo='Файл больше 10 МБ';return}
  const fd=new FormData()
  fd.append('file',file)
  uploading.value=true;progress.value=0
  try{
    const {data}=await adminApi.post('/upload',fd,{onUploadProgress:e=>{progress.value=Math.round((e.loaded/(e.total||file.size))*100)}})
    if(fresh.value.includes(f.image)){trash([f.image]);fresh.value=fresh.value.filter(u=>u!==f.image)}
    f.image=data.url
    fresh.value.push(data.url)
  }catch(e){errors.photo=errText(e)}
  finally{uploading.value=false;if(fileEl.value)fileEl.value.value=''}
}
const onDrop=(e:DragEvent)=>{over.value=false;upload(e.dataTransfer?.files?.[0])}
function removePhoto(){
  if(fresh.value.includes(f.image)){trash([f.image]);fresh.value=fresh.value.filter(u=>u!==f.image)}
  f.image=''
}

const addRow=()=>{if(f.variants.length<6)f.variants.push({label:'',price:''})}
const delRow=(i:number)=>{if(f.variants.length>1)f.variants.splice(i,1)}
const num=(s:string)=>Math.round(Number(String(s).replace(',','.'))*100)/100

function validate(){
  Object.keys(errors).forEach(k=>{if(k!=='photo')delete errors[k]})
  if(!f.name.trim())errors.name='Укажите название'
  if(!f.category)errors.category='Выберите категорию'
  const labels=f.variants.map(v=>v.label.trim())
  f.variants.forEach((v,i)=>{
    const p=num(v.price)
    if(!v.price.trim()||!Number.isFinite(p)||p<=0)errors['price'+i]='Цена больше нуля'
    if(f.variants.length>1&&!labels[i])errors['label'+i]='Подпись'
  })
  if(f.variants.length>1&&new Set(labels).size!==labels.length)errors.variants='Подписи размеров не должны повторяться'
  return !Object.keys(errors).filter(k=>k!=='photo').length
}

watch(f,()=>{
  const had=Object.keys(errors).filter(k=>k!=='photo')
  if(!had.length)return
  validate()
  Object.keys(errors).forEach(k=>{if(k!=='photo'&&!had.includes(k))delete errors[k]})
},{deep:true})

async function save(){
  top.value=''
  if(!validate()){nextTick(()=>(document.querySelector('.fld.bad input,.fld.bad select,.vrow.bad input') as HTMLElement|null)?.focus());return}
  const body={name:f.name,en:f.en,category:f.category,composition:f.composition,image:f.image,available:f.available,variants:f.variants.map(v=>({label:v.label.trim(),price:num(v.price)}))}
  saving.value=true
  try{
    if(props.dish)await adminApi.patch('/dishes/'+props.dish.id,body)
    else await adminApi.post('/dishes',body)
    trash(fresh.value.filter(u=>u!==f.image))
    saved.value=true
    toast(props.dish?'Изменения сохранены':'Блюдо добавлено')
    emit('saved')
  }catch(e){top.value=errText(e)}
  finally{saving.value=false}
}

function close(){
  if(!saved.value)trash(fresh.value)
  emit('close')
}
const onKey=(e:KeyboardEvent)=>{if(e.key==='Escape'&&props.open&&!saving.value)close()}
onMounted(()=>window.addEventListener('keydown',onKey))
onBeforeUnmount(()=>window.removeEventListener('keydown',onKey))
watch(()=>props.open,o=>{if(import.meta.client)document.documentElement.style.overflow=o?'hidden':''})
</script>

<template>
  <Teleport to="body">
    <Transition name="fade"><div v-if="open" class="scrim" @click="!saving&&close()"/></Transition>
    <Transition name="drawer">
      <aside v-if="open" class="drawer" role="dialog" aria-modal="true" :aria-label="dish?'Редактирование блюда':'Новое блюдо'">
        <header class="dh">
          <h2>{{dish?'Редактирование':'Новое блюдо'}}</h2>
          <button type="button" class="x" @click="close" :disabled="saving" aria-label="Закрыть">✕</button>
        </header>

        <form class="dbody" @submit.prevent="save" novalidate>
          <div class="photo">
            <div class="drop" :class="{over,has:f.image}" @dragover.prevent="over=true" @dragleave="over=false" @drop.prevent="onDrop">
              <img v-if="f.image" :src="f.image" alt="Фото блюда">
              <div v-else class="hint">
                <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="3"/><circle cx="9" cy="10" r="1.6"/><path d="m21 16-5-5-8 8"/></svg>
                <b>Перетащите фото сюда</b>
                <span>или выберите на компьютере</span>
              </div>
              <div v-if="uploading" class="prog"><i :style="{width:progress+'%'}"/><span>Загружаем {{progress}}%</span></div>
            </div>
            <div class="pbtns">
              <button type="button" class="ghost" @click="fileEl?.click()" :disabled="uploading">{{f.image?'Заменить фото':'Выбрать фото'}}</button>
              <button v-if="f.image" type="button" class="link" @click="removePhoto" :disabled="uploading">Убрать</button>
              <input ref="fileEl" type="file" accept="image/*" hidden @change="upload(($event.target as HTMLInputElement).files?.[0])">
            </div>
            <p v-if="errors.photo" class="err">{{errors.photo}}</p>
            <p v-else class="note">Без фото в меню покажется заглушка. Картинку сожмём сами.</p>
          </div>

          <label class="fld" :class="{bad:errors.name}">Название
            <input ref="nameEl" v-model="f.name" maxlength="80" placeholder="Например, Цезарь с курицей" autocomplete="off">
            <span v-if="errors.name" class="err">{{errors.name}}</span>
          </label>
          <label class="fld">Название по-английски
            <input v-model="f.en" maxlength="80" placeholder="Caesar with chicken" autocomplete="off">
          </label>
          <label class="fld" :class="{bad:errors.category}">Категория
            <select v-model="f.category">
              <option v-for="c in categories" :key="c.id" :value="c.id">{{c.title}}</option>
            </select>
            <span v-if="errors.category" class="err">{{errors.category}}</span>
          </label>
          <label class="fld">Состав
            <textarea v-model="f.composition" rows="3" maxlength="300" placeholder="куриное филе, сухарики, сыр пармезан"/>
            <span class="count">{{f.composition.length}} / 300</span>
          </label>

          <fieldset class="vars">
            <legend>Цена и вес</legend>
            <p class="note">{{f.variants.length>1?'Несколько размеров: у каждого своя подпись и цена, гость выбирает нужный.':'Подпись — это вес или объём, например «250 г». Нужны разные размеры — добавьте ещё строку.'}}</p>
            <div v-for="(v,i) in f.variants" :key="i" class="vrow" :class="{bad:errors['label'+i]||errors['price'+i]}">
              <input v-model="v.label" maxlength="24" :placeholder="f.variants.length>1?'Подпись (1 л)':'Вес (250 г)'" :aria-label="'Подпись '+(i+1)">
              <div class="money">
                <input v-model="v.price" inputmode="decimal" placeholder="Цена" :aria-label="'Цена '+(i+1)">
                <span>с</span>
              </div>
              <button type="button" class="x sm" @click="delRow(i)" :disabled="f.variants.length===1" aria-label="Убрать размер">✕</button>
            </div>
            <p v-if="errors.variants" class="err">{{errors.variants}}</p>
            <button v-if="f.variants.length<6" type="button" class="link" @click="addRow">+ Добавить размер</button>
          </fieldset>

          <label class="check">
            <input v-model="f.available" type="checkbox">
            <span class="box" aria-hidden="true"/>
            <span><b>Есть в наличии</b><small>Если выключить, гости увидят блюдо серым и не смогут его заказать</small></span>
          </label>

          <p v-if="top" class="err top" role="alert">{{top}}</p>
        </form>

        <footer class="df">
          <button type="button" class="ghost" @click="close" :disabled="saving">Отмена</button>
          <button type="button" class="primary" @click="save" :disabled="saving||uploading">{{saving?'Сохраняем…':dish?'Сохранить':'Добавить блюдо'}}</button>
        </footer>
      </aside>
    </Transition>
  </Teleport>
</template>

<style scoped>
.scrim{position:fixed;inset:0;background:rgba(0,0,0,.62);backdrop-filter:blur(2px);z-index:60}
.drawer{position:fixed;z-index:70;display:flex;flex-direction:column;background:#161616;color:var(--ink);inset:0;border-left:1px solid var(--line)}
@media (min-width:760px){.drawer{inset:0 0 0 auto;width:520px}}
.dh{display:flex;align-items:center;justify-content:space-between;padding:16px 20px;border-bottom:1px solid var(--line);padding-top:max(16px,env(safe-area-inset-top))}
.dh h2{margin:0;font:600 22px/1 var(--display);text-transform:uppercase;letter-spacing:.03em}
.x{width:40px;height:40px;border-radius:12px;border:1px solid var(--line);background:transparent;color:var(--ink);font-size:15px}
.x.sm{width:36px;height:36px;font-size:13px}
.x:disabled{opacity:.35}
.dbody{flex:1;overflow-y:auto;overscroll-behavior:contain;padding:18px 20px 24px;display:flex;flex-direction:column;gap:16px}
.photo{display:flex;flex-direction:column;gap:10px}
.drop{position:relative;aspect-ratio:4/3;border:1.5px dashed rgba(255,255,255,.2);border-radius:14px;overflow:hidden;background:#101010;display:grid;place-items:center;transition:border-color .2s,background .2s}
.drop.over{border-color:var(--gold);background:rgba(201,164,92,.08)}
.drop.has{border-style:solid;border-color:var(--line)}
.drop img{width:100%;height:100%;object-fit:cover}
.hint{display:flex;flex-direction:column;align-items:center;gap:6px;color:var(--muted);text-align:center;padding:12px}
.hint svg{width:38px;height:38px;fill:none;stroke:currentColor;stroke-width:1.5;stroke-linecap:round;stroke-linejoin:round;margin-bottom:4px}
.hint b{color:var(--ink2);font-weight:600}
.hint span{font-size:13px}
.prog{position:absolute;inset:auto 0 0 0;background:rgba(0,0,0,.7);padding:10px 14px;font-size:13px}
.prog i{display:block;height:3px;background:var(--red);border-radius:3px;margin-bottom:8px;transition:width .2s}
.pbtns{display:flex;align-items:center;gap:16px}
.fld{display:flex;flex-direction:column;gap:6px;font-size:13px;font-weight:600;color:var(--ink2)}
.fld input,.fld select,.fld textarea,.vrow input{font:inherit;font-weight:400;font-size:16px;color:var(--ink);background:#0f0f0f;border:1px solid var(--line);border-radius:10px;padding:12px 14px;outline:none;resize:vertical;width:100%;transition:border-color .2s}
.fld select{appearance:none;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%238d8a84' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 12px center;background-size:18px;padding-right:38px}
.fld input:focus,.fld select:focus,.fld textarea:focus,.vrow input:focus{border-color:var(--gold)}
.fld.bad input,.fld.bad select,.vrow.bad input{border-color:#ff6b6b}
.count{align-self:flex-end;font-size:12px;font-weight:400;color:var(--muted)}
.vars{border:0;margin:0;padding:0;display:flex;flex-direction:column;gap:10px}
.vars legend{padding:0;margin-bottom:6px;font-size:13px;font-weight:600;color:var(--ink2)}
.vrow{display:grid;grid-template-columns:minmax(0,1fr) 130px 36px;gap:8px;align-items:center}
.money{position:relative}
.money input{padding-right:30px}
.money span{position:absolute;right:12px;top:50%;transform:translateY(-50%);color:var(--gold);font-size:14px}
.check{display:flex;gap:12px;align-items:flex-start;cursor:pointer;padding:14px;border:1px solid var(--line);border-radius:12px}
.check input{position:absolute;opacity:0;pointer-events:none}
.box{flex:none;width:44px;height:26px;border-radius:999px;background:#2b2b2b;position:relative;transition:background .2s;margin-top:2px}
.box::after{content:'';position:absolute;top:3px;left:3px;width:20px;height:20px;border-radius:50%;background:#fff;transition:transform .2s}
.check input:checked+.box{background:var(--red)}
.check input:checked+.box::after{transform:translateX(18px)}
.check input:focus-visible+.box{outline:2px solid var(--gold);outline-offset:2px}
.check span:last-child{display:flex;flex-direction:column;gap:3px}
.check b{font-size:15px}
.check small{color:var(--muted);font-size:13px;line-height:1.4}
.note{margin:0;font-size:13px;color:var(--muted);line-height:1.45}
.err{margin:0;color:#ff7b7b;font-size:13px;font-weight:500}
.err.top{padding:12px 14px;background:rgba(255,107,107,.1);border:1px solid rgba(255,107,107,.3);border-radius:10px;font-size:14px}
.df{display:flex;gap:10px;padding:14px 20px;border-top:1px solid var(--line);padding-bottom:max(14px,env(safe-area-inset-bottom))}
.df .primary{flex:1}
.primary{min-height:48px;border:0;border-radius:12px;background:var(--red);color:#fff;font-weight:700;font-size:15px;padding:0 22px;transition:filter .2s,transform .15s}
.primary:hover{filter:brightness(1.08)}
.primary:active{transform:scale(.98)}
.primary:disabled{opacity:.55}
.ghost{min-height:44px;border:1px solid var(--line);background:transparent;color:var(--ink);border-radius:12px;padding:0 18px;font-weight:600;font-size:14px}
.ghost:hover{border-color:rgba(255,255,255,.28)}
.ghost:disabled{opacity:.5}
.link{border:0;background:transparent;color:var(--gold);font-weight:600;font-size:14px;padding:6px 0;text-align:left}
.link:hover{text-decoration:underline}
.fade-enter-active,.fade-leave-active{transition:opacity .25s}
.fade-enter-from,.fade-leave-to{opacity:0}
.drawer-enter-active,.drawer-leave-active{transition:transform .32s cubic-bezier(.2,.8,.2,1)}
.drawer-enter-from,.drawer-leave-to{transform:translateX(100%)}
@media (max-width:759px){.drawer-enter-from,.drawer-leave-to{transform:translateY(100%)}}
@media (prefers-reduced-motion:reduce){.drawer-enter-active,.drawer-leave-active,.fade-enter-active,.fade-leave-active{transition:none}}
</style>
