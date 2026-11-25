export default defineNuxtConfig({
  compatibilityDate:'2025-07-15',
  devtools:{enabled:false},
  css:['~/assets/main.css'],
  vite:{server:{allowedHosts:['.ts.net']}},
  app:{
    head:{
      htmlAttrs:{lang:'ru'},
      title:'Набережная — меню ресторана',
      meta:[
        {name:'viewport',content:'width=device-width, initial-scale=1, viewport-fit=cover'},
        {name:'theme-color',content:'#141414'},
        {name:'description',content:'Меню ресторана «Набережная»: цены, состав и вес блюд с фото.'},
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
