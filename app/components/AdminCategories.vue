<script setup lang="ts">
import type {Category} from '~~/shared/types'
const props=defineProps<{open:boolean;categories:Category[];counts:Record<string,number>}>()
const emit=defineEmits<{close:[];changed:[]}>()
const {toast,confirm}=useAdmin()
const editing=ref('')
const draft=reactive({title:'',en:''})
const add=reactive({title:'',en:''})
const busy=ref(false)
const error=ref('')

watch(()=>props.open,o=>{if(o){editing.value='';error.value='';add.title='';add.en=''}})

async function run(fn:()=>Promise<unknown>,ok?:string){
  error.value='';busy.value=true
  try{await fn();if(ok)toast(ok);emit('changed')}
  catch(e){error.value=errText(e)}
  finally{busy.value=false}
}
const edit=(c:Category)=>{editing.value=c.id;draft.title=c.title;draft.en=c.en}
const saveEdit=()=>run(async()=>{await adminApi.patch('/categories/'+editing.value,{title:draft.title,en:draft.en});editing.value=''},'Категория сохранена')
const move=(c:Category,d:-1|1)=>run(()=>adminApi.patch('/categories/'+c.id,{move:d}))
const addCat=()=>run(async()=>{await adminApi.post('/categories',{title:add.title,en:add.en});add.title='';add.en=''},'Категория добавлена')
async function del(c:Category){
  if(!await confirm({title:`Удалить категорию «${c.title}»?`,text:'Категория пустая, блюда не пострадают.',ok:'Удалить',danger:true}))return
  run(()=>adminApi.delete('/categories/'+c.id),'Категория удалена')
}
const onKey=(e:KeyboardEvent)=>{if(e.key==='Escape'&&props.open&&!useAdmin().dialog.value)emit('close')}
onMounted(()=>window.addEventListener('keydown',onKey))
onBeforeUnmount(()=>window.removeEventListener('keydown',onKey))
</script>

<template>
  <Teleport to="body">
    <Transition name="fade"><div v-if="open" class="scrim" @click="emit('close')"/></Transition>
    <Transition name="pop">
      <div v-if="open" class="modal" role="dialog" aria-modal="true" aria-label="Категории">
        <header><h2>Категории</h2><button type="button" class="x" @click="emit('close')" aria-label="Закрыть">✕</button></header>
        <p class="note">Порядок здесь — это порядок вкладок в меню. Удалить можно только пустую категорию.</p>
        <ul class="list">
          <li v-for="(c,i) in categories" :key="c.id">
            <template v-if="editing===c.id">
              <div class="edit">
                <input v-model="draft.title" maxlength="40" placeholder="Название" aria-label="Название категории" @keydown.enter.prevent="saveEdit">
                <input v-model="draft.en" maxlength="40" placeholder="English" aria-label="Название по-английски" @keydown.enter.prevent="saveEdit">
              </div>
              <div class="acts">
                <button type="button" class="mini ok" :disabled="busy" @click="saveEdit">Сохранить</button>
                <button type="button" class="mini" @click="editing=''">Отмена</button>
              </div>
            </template>
            <template v-else>
              <div class="name"><b>{{c.title}}</b><span>{{c.en||'—'}} · {{counts[c.id]||0}} блюд</span></div>
              <div class="acts">
                <button type="button" class="ic" :disabled="busy||i===0" @click="move(c,-1)" aria-label="Выше">↑</button>
                <button type="button" class="ic" :disabled="busy||i===categories.length-1" @click="move(c,1)" aria-label="Ниже">↓</button>
                <button type="button" class="mini" @click="edit(c)">Изменить</button>
                <button type="button" class="mini danger" :disabled="busy||!!counts[c.id]" :title="counts[c.id]?'Сначала уберите блюда из категории':''" @click="del(c)">Удалить</button>
              </div>
            </template>
          </li>
        </ul>
        <form class="new" @submit.prevent="addCat">
          <input v-model="add.title" maxlength="40" placeholder="Новая категория" aria-label="Новая категория">
          <input v-model="add.en" maxlength="40" placeholder="English (необязательно)" aria-label="Название по-английски">
          <button type="submit" class="primary" :disabled="busy||!add.title.trim()">Добавить</button>
        </form>
        <p v-if="error" class="err" role="alert">{{error}}</p>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.scrim{position:fixed;inset:0;background:rgba(0,0,0,.62);backdrop-filter:blur(2px);z-index:60}
.modal{position:fixed;z-index:70;left:50%;top:50%;transform:translate(-50%,-50%);width:min(620px,calc(100% - 24px));max-height:calc(100dvh - 24px);overflow-y:auto;background:#161616;border:1px solid var(--line);border-radius:18px;padding:20px}
header{display:flex;align-items:center;justify-content:space-between}
h2{margin:0;font:600 22px/1 var(--display);text-transform:uppercase;letter-spacing:.03em}
.x{width:40px;height:40px;border-radius:12px;border:1px solid var(--line);background:transparent;color:var(--ink);font-size:15px}
.note{margin:10px 0 14px;font-size:13px;color:var(--muted);line-height:1.45}
.list{list-style:none;margin:0;padding:0;border:1px solid var(--line);border-radius:12px}
.list li{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:10px 12px;border-bottom:1px solid var(--line);flex-wrap:wrap}
.list li:last-child{border-bottom:0}
.name{display:flex;flex-direction:column;gap:2px;min-width:0}
.name b{font-weight:600}
.name span{font-size:12.5px;color:var(--muted)}
.edit{display:flex;gap:8px;flex:1;min-width:220px}
.acts{display:flex;gap:6px;align-items:center;flex-wrap:wrap}
input{font:inherit;font-size:16px;color:var(--ink);background:#0f0f0f;border:1px solid var(--line);border-radius:10px;padding:10px 12px;outline:none;min-width:0;width:100%}
input:focus{border-color:var(--gold)}
.ic{width:34px;height:34px;border-radius:9px;border:1px solid var(--line);background:transparent;color:var(--ink2);font-size:15px}
.ic:disabled{opacity:.3}
.mini{height:34px;border-radius:9px;border:1px solid var(--line);background:transparent;color:var(--ink);padding:0 12px;font-size:13px;font-weight:600}
.mini.ok{background:var(--red);border-color:var(--red);color:#fff}
.mini.danger{color:#ff8080}
.mini:disabled{opacity:.35;cursor:not-allowed}
.new{display:grid;grid-template-columns:1fr 1fr auto;gap:8px;margin-top:14px}
.primary{min-height:44px;border:0;border-radius:10px;background:var(--red);color:#fff;font-weight:700;padding:0 18px}
.primary:disabled{opacity:.45}
.err{color:#ff7b7b;font-size:14px;margin:12px 0 0}
@media (max-width:560px){.new{grid-template-columns:1fr}.edit{flex-direction:column}}
.fade-enter-active,.fade-leave-active{transition:opacity .25s}
.fade-enter-from,.fade-leave-to{opacity:0}
.pop-enter-active,.pop-leave-active{transition:opacity .25s,transform .25s cubic-bezier(.2,.8,.2,1)}
.pop-enter-from,.pop-leave-to{opacity:0;transform:translate(-50%,-47%)}
</style>
