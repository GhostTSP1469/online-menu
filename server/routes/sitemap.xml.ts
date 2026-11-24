import fs from 'node:fs/promises'
import path from 'node:path'

export default defineEventHandler(async event=>{
  const site=(String(useRuntimeConfig().public.siteUrl||'')||getRequestURL(event,{xForwardedHost:true,xForwardedProto:true}).origin).replace(/\/$/,'')
  let mod=new Date()
  try{mod=(await fs.stat(path.join(dataDir,'menu.json'))).mtime}catch{}
  setResponseHeader(event,'content-type','application/xml; charset=utf-8')
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <url>\n    <loc>${site}/</loc>\n    <lastmod>${mod.toISOString().slice(0,10)}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>1.0</priority>\n  </url>\n</urlset>\n`
})
