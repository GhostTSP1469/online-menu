export default defineEventHandler(event=>{
  const site=(String(useRuntimeConfig().public.siteUrl||'')||getRequestURL(event,{xForwardedHost:true,xForwardedProto:true}).origin).replace(/\/$/,'')
  setResponseHeader(event,'content-type','text/plain; charset=utf-8')
  return `User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /api/\n\nSitemap: ${site}/sitemap.xml\n`
})
