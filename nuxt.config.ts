const longCache={headers:{'cache-control':'public, max-age=2592000'}}
const noIndex={'X-Robots-Tag':'noindex, nofollow'}

export default defineNuxtConfig({
  compatibilityDate:'2025-07-15',
  devtools:{enabled:false},
  css:['~/assets/main.css'],
  runtimeConfig:{tgToken:'',tgChat:'',adminLogin:'',adminPassword:'',tgPhones:'',public:{siteUrl:''}},
  routeRules:{
    '/admin':{ssr:false,headers:noIndex},
    '/admin/**':{ssr:false,headers:noIndex},
    '/api/**':{headers:noIndex},
    '/dishes/**':longCache,
    '/logo.png':longCache,
    '/og.jpg':longCache,
    '/stone.webp':longCache,
    '/apple-touch-icon.png':longCache
  },
  vite:{server:{allowedHosts:['.ts.net']}},
  app:{
    head:{
      htmlAttrs:{lang:'ru'},
      title:'Набережная — меню ресторана и заказ онлайн',
      meta:[
        {name:'viewport',content:'width=device-width, initial-scale=1, viewport-fit=cover'},
        {name:'theme-color',content:'#141414'},
        {name:'format-detection',content:'telephone=no'}
      ],
      link:[
        {rel:'icon',type:'image/png',href:'/logo.png'},
        {rel:'apple-touch-icon',href:'/apple-touch-icon.png'},
        {rel:'preconnect',href:'https://fonts.googleapis.com'},
        {rel:'preconnect',href:'https://fonts.gstatic.com',crossorigin:''},
        {rel:'stylesheet',href:'https://fonts.googleapis.com/css2?family=Oswald:wght@500;600;700&family=Manrope:wght@400;500;600;700&family=Marck+Script&display=swap'}
      ]
    }
  }
})
