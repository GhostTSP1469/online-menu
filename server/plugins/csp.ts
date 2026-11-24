import crypto from 'node:crypto'

const DATA=/type="application\/(json|ld\+json)"/
const sha=(s:string)=>`'sha256-${crypto.createHash('sha256').update(s).digest('base64')}'`

export default defineNitroPlugin(nitro=>{
  if(import.meta.dev)return
  nitro.hooks.hook('render:response',(response,{event})=>{
    const html=typeof response.body==='string'?response.body:''
    const hashes=[...html.matchAll(/<script(?![^>]*\bsrc=)([^>]*)>([\s\S]*?)<\/script>/g)]
      .filter(m=>!DATA.test(m[1]!))
      .map(m=>sha(m[2]!))
    setResponseHeader(event,'Content-Security-Policy',[
      "default-src 'self'",
      `script-src 'self' ${[...new Set(hashes)].join(' ')}`.trim(),
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: blob:",
      "connect-src 'self'",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'"
    ].join('; '))
  })
})
