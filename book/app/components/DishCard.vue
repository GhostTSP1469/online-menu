<script setup lang="ts">
import type {Dish} from '~~/shared/types'
defineProps<{dish:Dish;num:number;eager?:boolean}>()
</script>

<template>
  <article class="card" :class="{off:dish.available===false}">
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
      <ul class="prices">
        <li v-for="v in dish.variants" :key="v.label">
          <span>{{v.label}}</span>
          <b>{{v.price}}<small> с</small></b>
        </li>
      </ul>
    </div>
  </article>
</template>

<style scoped>
.card{position:relative;display:flex;flex-direction:column;background:rgba(22,22,22,.72);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);border:1px solid rgba(255,255,255,.06);border-radius:16px;overflow:hidden;transition:border-color .25s}
.card:hover{border-color:rgba(201,164,92,.35)}
.pic{position:relative;aspect-ratio:4/3;background:#151515;overflow:hidden}
.pic img{width:100%;height:100%;object-fit:cover;transition:transform .6s cubic-bezier(.2,.8,.2,1)}
.card:hover .pic img{transform:scale(1.035)}
.card.off .pic img,.card.off .nophoto{filter:grayscale(1) brightness(.55)}
.card.off h3,.card.off .prices{opacity:.55}
.soldout{position:absolute;z-index:2;right:10px;top:10px;background:rgba(0,0,0,.72);backdrop-filter:blur(4px);color:var(--ink2);border:1px solid rgba(255,255,255,.14);border-radius:999px;padding:5px 10px;font:600 11px/1 var(--body);letter-spacing:.06em;text-transform:uppercase}
.pic.empty{background:radial-gradient(120% 90% at 50% 35%,#242424 0%,#141414 70%)}
.nophoto{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;color:#5d5a55}
.nophoto svg{width:40px;height:40px;fill:none;stroke:currentColor;stroke-width:1.5;stroke-linecap:round;stroke-linejoin:round}
.flag{position:absolute;top:12px;left:0;background:var(--red);color:#fff;font:600 13px/1 var(--display);padding:6px 12px 6px 10px;clip-path:polygon(0 0,100% 0,86% 50%,100% 100%,0 100%)}
.body{display:flex;flex-direction:column;gap:4px;padding:14px 16px;flex:1}
h3{font:600 18px/1.15 var(--display);text-transform:uppercase;letter-spacing:.02em;margin:0;text-wrap:balance}
.en{margin:0;color:var(--muted);font-size:12.5px}
.comp{margin:4px 0 0;color:var(--ink2);font-size:13.5px;line-height:1.45}
.prices{list-style:none;margin:auto 0 0;padding:14px 0 0;display:flex;flex-direction:column;gap:6px;font-variant-numeric:tabular-nums}
.prices li{display:flex;align-items:baseline;justify-content:space-between;gap:12px}
.prices span{color:var(--muted);font-size:13px}
.prices b{margin-left:auto;font:600 22px/1 var(--display)}
.prices small{font-size:13px;color:var(--gold)}
@media (max-width:560px){
  .body{padding:12px}
  h3{font-size:15.5px}
  .comp{font-size:12.5px;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}
  .prices b{font-size:19px}
}
@media (max-width:340px){h3{font-size:17px}}
</style>
