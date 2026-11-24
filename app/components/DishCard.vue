<script setup lang="ts">
import type {Dish} from '~~/shared/types'
const props=defineProps<{dish:Dish;num:number;eager?:boolean}>()
const {add,dec,qtyOf}=useCart()
const vi=ref(0)
const v=computed(()=>props.dish.variants[vi.value]!)
const qty=computed(()=>qtyOf(props.dish,v.value))
const key=computed(()=>props.dish.id+'|'+v.value.label)
</script>

<template>
  <article class="card" :class="{picked:qty,off:dish.available===false}">
    <div class="pic" :class="{empty:!dish.image}">
      <span v-if="dish.available===false" class="soldout">Нет в наличии</span>
      <img v-if="dish.image" :src="dish.image" :alt="dish.name+(dish.composition?': '+dish.composition:'')" width="640" height="480" :loading="eager?'eager':'lazy'" :fetchpriority="eager?'high':'auto'" decoding="async">
      <div v-else class="nophoto" role="img" :aria-label="dish.name">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 3l18 18"/><path d="M9.5 5H15l1.5 2H19a2 2 0 0 1 2 2v8.5M17 19H5a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h2"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/></svg>
      </div>
      <span class="flag">{{num}}</span>
    </div>
    <div class="body">
      <h3>{{dish.name}}</h3>
      <p class="en">{{dish.en}}</p>
      <p v-if="dish.composition" class="comp">{{dish.composition}}</p>
      <div v-if="dish.variants.length>1" class="sizes" role="radiogroup" :aria-label="'Размер: '+dish.name">
        <button v-for="(o,i) in dish.variants" :key="o.label" type="button" role="radio" :aria-checked="i===vi" :class="{on:i===vi}" @click="vi=i">{{o.label}}</button>
      </div>
      <div class="foot">
        <div class="price"><b>{{v.price}}<small> с</small></b><span v-if="dish.variants.length===1&&v.label">{{v.label}}</span></div>
        <button v-if="!qty" type="button" class="plus" :disabled="dish.available===false" @click="add(dish,v)" :aria-label="'Добавить: '+dish.name"><span aria-hidden="true">+</span></button>
        <div v-else class="stepper">
          <button type="button" @click="dec(key)" aria-label="Убрать одну">−</button>
          <span aria-live="polite">{{qty}}</span>
          <button type="button" @click="add(dish,v)" aria-label="Добавить ещё">+</button>
        </div>
      </div>
    </div>
  </article>

</template>

<style scoped>
.card{position:relative;display:flex;flex-direction:column;background:rgba(22,22,22,.72);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);border:1px solid rgba(255,255,255,.06);border-radius:16px;overflow:hidden;transition:border-color .25s,box-shadow .25s}
.card:hover{border-color:rgba(201,164,92,.35)}
.card.picked{border-color:rgba(227,38,43,.55);box-shadow:0 0 0 1px rgba(227,38,43,.25)}
.pic{position:relative;aspect-ratio:4/3;background:#151515;overflow:hidden}
.pic img{width:100%;height:100%;object-fit:cover;transition:transform .6s cubic-bezier(.2,.8,.2,1)}
.card:hover .pic img{transform:scale(1.035)}
.card.off .pic img,.card.off .nophoto{filter:grayscale(1) brightness(.55)}
.card.off h3,.card.off .price{opacity:.55}
.soldout{position:absolute;z-index:2;right:10px;top:10px;background:rgba(0,0,0,.72);backdrop-filter:blur(4px);color:var(--ink2);border:1px solid rgba(255,255,255,.14);border-radius:999px;padding:5px 10px;font:600 11px/1 var(--body);letter-spacing:.06em;text-transform:uppercase}
.plus:disabled{opacity:.3;cursor:not-allowed}
.plus:disabled:hover{background:transparent;border-color:rgba(255,255,255,.16)}
.pic.empty{background:radial-gradient(120% 90% at 50% 35%,#242424 0%,#141414 70%)}
.nophoto{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;color:#5d5a55}
.nophoto svg{width:40px;height:40px;fill:none;stroke:currentColor;stroke-width:1.5;stroke-linecap:round;stroke-linejoin:round}
.nophoto span{font:500 11px/1 var(--body);letter-spacing:.14em;text-transform:uppercase}
.flag{position:absolute;top:12px;left:0;background:var(--red);color:#fff;font:600 13px/1 var(--display);padding:6px 12px 6px 10px;clip-path:polygon(0 0,100% 0,86% 50%,100% 100%,0 100%)}
.body{display:flex;flex-direction:column;gap:4px;padding:14px 16px 14px;flex:1}
h3{font:600 18px/1.15 var(--display);text-transform:uppercase;letter-spacing:.02em;margin:0;text-wrap:balance}
.en{margin:0;color:var(--muted);font-size:12.5px}
.comp{margin:4px 0 0;color:var(--ink2);font-size:13.5px;line-height:1.45}
.sizes{display:flex;gap:6px;flex-wrap:wrap;margin-top:8px}
.sizes button{border:1px solid rgba(255,255,255,.1);background:transparent;color:var(--muted);border-radius:8px;padding:0 10px;font-size:12.5px;height:30px}
.sizes button.on{border-color:var(--gold);color:var(--gold)}
.foot{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-top:auto;padding-top:14px}
.price{display:flex;flex-direction:column;line-height:1;font-variant-numeric:tabular-nums}
.price b{font:600 24px/1 var(--display)}
.price small{font-size:13px;color:var(--gold)}
.price span{font-size:12px;color:var(--muted);margin-top:5px}
.plus{flex:none;display:grid;place-items:center;width:44px;height:44px;border-radius:50%;border:1px solid rgba(255,255,255,.16);background:transparent;color:var(--ink);font-size:24px;line-height:1;transition:background .2s,border-color .2s,transform .15s}
.plus:hover{background:var(--red);border-color:var(--red)}
.plus:active{transform:scale(.92)}
.stepper{display:flex;align-items:center;gap:2px;background:var(--red);border-radius:999px;padding:3px}
.stepper button{width:36px;height:36px;border:0;border-radius:50%;background:transparent;color:#fff;font-size:19px;line-height:1}
.stepper button:hover{background:rgba(0,0,0,.18)}
.stepper span{min-width:20px;text-align:center;font-weight:700;color:#fff;font-variant-numeric:tabular-nums}

@media (max-width:560px){
  .body{padding:12px 12px 12px}
  h3{font-size:15.5px}
  .comp{font-size:12.5px;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}
  .price b{font-size:21px}
  .plus{width:40px;height:40px}
  .stepper button{width:30px;height:30px;font-size:17px}
  .stepper span{min-width:16px;font-size:14px}
}
@media (max-width:340px){h3{font-size:17px}}
</style>
