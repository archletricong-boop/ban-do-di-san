/* Champa · bộ ký hiệu và cầu nối với Atlas Core.
   Hình và nhãn lấy từ atlas.config.json (symbols.types); ở đây chỉ còn luật nhận loại riêng của Champa.
   Hình biểu thị loại địa điểm, không khẳng định phạm vi di tích. */
(function(root){
'use strict';
const CORE=root.AtlasCore, CFG=(root.ATLAS_CONFIG||{}).symbols||{};
if(!CORE) throw new Error('Thiếu Atlas Core: nạp atlas-core.js trước atlas-symbols.js');
const sacredIds=new Set(CFG.sacred_ids||[]), emphasisIds=new Set(CFG.emphasis_ids||[]);
const flat=s=>String(s||'').normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/đ/g,'d').toLowerCase();
function resolve(p){
 if(p.map_layers?.includes('gieng'))return'gieng';
 if(CFG.types&&CFG.types[p.map_symbol])return p.map_symbol;
 const s=flat(p.kind||p.category);
 if(s.includes('bao tang'))return'bao_tang';
 if(s.includes('nui thieng'))return'nui_thieng';
 if(s.includes('song thieng'))return'song_thieng';
 if(s.includes('thanh co')||s.includes('thanh luy'))return'thanh';
 return p.table_type==='phe_tich'||s.includes('phe tich')?'phe_tich':'di_tich';
}
const sacred=p=>p.sacred_site===true||sacredIds.has(p.id);
// Nhấn mạnh biên tập; không đổi xếp hạng pháp lý hay mức kiểm tọa độ.
const emphasis=p=>resolve(p)==='phe_tich'&&(p.important_ruin===true||emphasisIds.has(p.id));
const S=CORE.symbols.create({types:CFG.types,default:CFG.default,resolve,sacred,emphasis});
// The configured bounds center each silhouette and make its longest edge 80% of the icon slot.
// Keep the white separator and the dark edge on the same geometry.
const mapHTML=(k,number="",isSacred=false,status="")=>S.html(k,number,isSacred,status)
 .replace('viewBox="0 0 40 40"','data-map-symbol viewBox="'+(CFG.types?.[k]?.view_box||"0 0 40 40")+'"')
 .replace(/<g class="symbol-halo">([\s\S]*?)<\/g>/,(halo,shape)=>'<g class="symbol-outer">'+shape+'</g>'+halo);
const identityIcons={di_tich:'assets/branding/identity-v2/icons/map-temple.svg',thanh:'assets/branding/identity-v2/icons/map-citadel.svg',bao_tang:'assets/branding/identity-v2/icons/map-museum.svg',phe_tich:'assets/branding/identity-v2/icons/map-ruins.svg',sa_huynh:'assets/branding/identity-v2/icons/map-sa-huynh.svg',nui_thieng:'assets/branding/identity-v2/icons/map-mountain.svg',song_thieng:'assets/branding/identity-v2/icons/map-river.svg',canh_quan:'assets/branding/identity-v2/icons/map-landscape.svg',bia_ky:'assets/branding/identity-v2/icons/map-inscription.svg',mixed:'assets/branding/identity-v2/icons/map-mixed.svg'};
identityIcons.gieng='assets/branding/identity-v2/icons/map-well.svg';
const profileExtras={object:{src:'assets/branding/identity-v2/icons/map-object.svg',label:'Hiện vật'},inscription:{src:'assets/branding/identity-v2/icons/map-inscription.svg',label:'Văn khắc'},source:{src:'assets/branding/identity-v2/icons/ui-book.svg',label:'Tài liệu tham khảo'}};
function profileIcon(key){return profileExtras[key]||{src:identityIcons[key]||identityIcons.mixed,label:S.labels[key]||S.labels.mixed};}
root.CHAMPA_SYMBOLS={icon:profileIcon,labels:S.labels,type:S.type,sacred:S.sacred,importantRuin:S.importantRuin,html:mapHTML};
// Tên cũ của công cụ tọa độ, nay do lõi cung cấp
root.BDS_TOOLS=CORE.geo;
})(window);
