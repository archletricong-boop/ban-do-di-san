/* Return navigation shared by the atlas's own secondary pages. */
(() => {
 'use strict';
 const script=document.currentScript;
 const base=new URL('.',script.src||location.href);
 const page=url=>url.pathname.slice(base.pathname.length);
 const isMap=url=>/^(?:index(?:\.html)?|Ban_Do_Di_San_v1_1\.html|ui-trial\.html)?$/.test(page(url));
 const isSecondary=url=>/^(?:encyclopedia\/?|(?:chien-dan|my-son-ban-ve|kmz-review|phuong-phap|sa-huynh-ra-soat|tong-quan-(?:champa|sa-huynh|gieng-cham|cat-tien|oc-eo-phu-nam-chan-lap)|khao-co-mang|documents\/(?:champa-hai-bao-tang|Xuan_Duong_Ho_so_Phap_Viet)|encyclopedia\/(?:index|record|bibliography|dan-mang))(?:\.html)?\/?)$/.test(page(url));
 function safe(value) {
  if(!value)return null;
  try {
   const url=new URL(value,location.href);
   const localFile=base.protocol==='file:'&&url.protocol==='file:'&&url.host===base.host;
   const hosted=/^https?:$/.test(url.protocol)&&url.origin===base.origin;
   if(!(localFile||hosted)||url.username||url.password||!url.pathname.startsWith(base.pathname))return null;
   return isSecondary(url)||isMap(url)?url:null;
  }catch{return null;}
 }
 function clean(value) {
  const url=new URL(value);
  url.searchParams.delete('returnTo');
  return url;
 }
 function withoutFragment(value) {
  const url=clean(value);
  url.hash='';
  return url.href;
 }
 function localIndex(url) {
  if(url.protocol==='file:'&&url.pathname.endsWith('/'))url.pathname+='index.html';
  return url;
 }
 const arrow='<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 5-7 7 7 7M5 12h14"/></svg>';
 const fallback=script?.dataset.returnFallback;
 if(fallback){
  const value=new URL(location.href).searchParams.get('returnTo');
  const explicit=value?safe(value):null;
  const ref=document.referrer?safe(document.referrer):null;
  const target=[explicit,ref].find(url=>url&&clean(url).href!==clean(location.href).href);
  const button=document.createElement('a');
  button.className='champa-page-back';button.setAttribute('aria-label','Trở lại');button.title='Trở lại';
  button.href=localIndex(target?clean(target):new URL(fallback,location.href)).href;button.innerHTML=arrow;
  button.addEventListener('click',event=>{
   if(event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
   if(target&&ref&&history.length>1&&withoutFragment(ref)===withoutFragment(target)){
    event.preventDefault();history.back();
   }
  });
  document.body.append(button);
 }
 document.addEventListener('click',event=>{
  const a=event.target.closest('a[href]');if(!a||a.classList.contains('champa-page-back')||a.hasAttribute('download'))return;
  const from=safe(location.href),to=safe(a.href);
  if(!from||!to)return;
  if(!isSecondary(to)||withoutFragment(from)===withoutFragment(to)){
   if(to.protocol==='file:'&&to.pathname.endsWith('/'))a.href=localIndex(to).href;
   return;
  }
  const returnTo=clean(from);
  if(isMap(from)){
   returnTo.searchParams.set('mode',document.body.classList.contains('research')?'research':'public');
   returnTo.searchParams.set('lang',document.documentElement.lang==='en'?'en':'vi');
  }
  to.searchParams.set('returnTo',returnTo.href);
  a.href=localIndex(to).href;
 },true);
})();
