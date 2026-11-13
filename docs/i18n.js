/* Interface localisation and English dossier translations. The Vietnamese records and source references are canonical. */
(() => {
'use strict';
const params=new URLSearchParams(location.search),key='champa-atlas-language';
let saved;try{saved=localStorage.getItem(key)}catch{}
let lang=params.get('lang')==='en'?'en':params.get('lang')==='vi'?'vi':saved==='en'?'en':'vi';
let api,queued=false;
const originals=new WeakMap(),attributeOriginals=new WeakMap();
const pairs={
'Bài mở đầu về Champa →':'Introduction to Champa (Vietnamese) →',
'CỔNG TRA CỨU HỌC THUẬT':'RESEARCH PORTAL','Tra cứu toàn văn':'Full-text search','Tra mục từ Bách khoa ↗':'Search encyclopedia entries ↗',
'Hướng dẫn tra cứu':'Research guides','Tổng quan Champa':'Introduction to Champa','Danh mục tra cứu':'Research catalogues','Bách khoa':'Encyclopedia','Hiện vật':'Objects','Tài liệu':'References',
'Điểm KMZ đề xuất cho dòng nguồn':'Candidate KMZ points for source records','Thông tin dữ liệu bản đồ':'About the map data','Phương pháp và trích dẫn':'Methods and citation',
'Tìm trong nội dung bản đồ':'Search atlas content','Đóng tìm kiếm':'Close search','Từ khóa tìm kiếm':'Search terms','Tên di tích, điêu khắc, mã bia, thần danh…':'Sites, sculptures, inscriptions, deities…','Tìm':'Search','Tra toàn bộ hồ sơ, không phụ thuộc bộ lọc. Có thể gõ có dấu hoặc không dấu.':'Search all dossiers regardless of filters, with or without Vietnamese accents.','Không tìm thấy nội dung phù hợp. Thử từ khóa khác hoặc ít từ hơn.':'No matching content. Try different or fewer words.',
'Sa Huỳnh':'Sa Huỳnh','Cấp chứng cứ':'Evidence category','Mọi cấp chứng cứ':'All evidence categories','Chưa xác nhận tọa độ':'Coordinates unconfirmed',
'Lớp bản đồ':'Map layers','Bật toàn bộ':'Show all layers','Tắt toàn bộ':'Hide all layers','Bật tắt lớp bản đồ':'Toggle map layers','Di tích':'Sites','Thành':'Citadels','Phế tích':'Ruins','Cảnh quan':'Landscapes','Sa Huỳnh':'Sa Huỳnh','S + số: Sa Huỳnh':'S + number: Sa Huỳnh','B + số: Bảo tàng':'B + number: Museums','Núi / đỉnh núi':'Mountains / peaks','Sông / đầm / vịnh':'Rivers / lagoons / bays','Đảo và cảnh quan':'Islands and landscapes',
'Bản đồ Di sản':'Heritage Atlas','Sa Huỳnh–Champa':'Sa Huynh–Champa','Óc Eo–Phù Nam · Cát Tiên':'Oc Eo–Funan · Cat Tien','Sa Huỳnh–Champa · Óc Eo–Phù Nam · Cát Tiên':'Sa Huynh–Champa · Oc Eo–Funan · Cat Tien','Về trang chủ Bản đồ Di sản Sa Huỳnh–Champa · Óc Eo–Phù Nam · Cát Tiên':'Sa Huynh–Champa · Oc Eo–Funan · Cat Tien Heritage Atlas home','Tham quan':'Visit','Nghiên cứu':'Research','Bỏ qua bản đồ, tới danh sách':'Skip map and browse sites','Tìm và chọn di tích':'Find and select a site','Chế độ xem':'Viewing mode','Tìm kiếm':'Search','Bộ lọc':'Filters','Loại dữ liệu':'Data type','Loại di tích':'Site type','Chủ đề':'Theme','Mọi loại hình':'All site types','Mọi chủ đề':'All themes','Mọi tỉnh (cũ)':'All former provinces','Mọi mức tọa độ':'All coordinate checks','Mức kiểm tọa độ':'Coordinate verification','Tỉnh/thành trước 7/2025':'Provinces before July 2025','Tỉnh theo sách':'Province in the source','Mọi tỉnh (theo sách)':'All source provinces','Bảng trong sách':'Source table','Cả hai bảng':'Both tables','Mọi trạng thái KMZ':'All KMZ statuses','Tỉnh hiện nay':'Current province','Mọi tỉnh (hiện nay)':'All current provinces','Xem dạng bảng':'View data table','Về bản đồ':'Back to map','Sao chép liên kết':'Copy link','Đã sao chép ✓':'Copied ✓','Không sao chép được':'Could not copy','Đóng hồ sơ':'Close dossier','Đóng':'Close','Chủ đề hồ sơ':'Dossier topics','Đọc hồ sơ':'Read dossier','Hồ sơ đầy đủ':'Full dossier','Nguồn tư liệu':'Sources','Nguồn':'Sources','Kiến trúc':'Architecture','Điêu khắc':'Sculpture','Khảo cổ':'Archaeology','Văn khắc':'Inscriptions','Bảo tồn':'Conservation','Cảnh quan':'Landscape','Tôn giáo · Tín ngưỡng':'Religion and ritual','Chứng cứ':'Evidence','Tổng quan':'Overview','Ký hiệu bản đồ':'Map symbols','Di tích':'Sites','Thánh địa':'Sanctuary','Đền tháp':'Temple towers','Nhóm tháp':'Tower group','Phế tích':'Ruins','Thành':'Citadel','Bảo tàng':'Museum','Núi thiêng':'Sacred mountain','Sông thiêng':'Sacred river','Về dự án · Khung Đan–Mạng':'About the project · Đan–Mạng framework','Tìm hiểu khung Đan–Mạng →':'Explore the Đan–Mạng framework →','Quan hệ và biến đổi ↗':'Relationships and change ↗','Quan hệ và biến đổi':'Relationships and change','Thí điểm':'Pilot','Bật các đường liên hệ trên bản đồ':'Show relationship lines on the map','Có nguồn trong hồ sơ':'Documented source','Cần bổ sung nguồn':'Source needed','Tìm hiện vật':'Find an object','Tên hoặc nơi phát hiện…':'Object name or discovery site…','Loại quan hệ':'Relationship type','Mọi loại đã có':'All available types','Địa điểm liên quan':'Related place','Mọi địa điểm':'All places','Mức chứng cứ':'Evidence level','Cả hai mức':'Both levels','Lọc theo mốc':'Date reference','Năm nguồn ghi nơi lưu giữ':'Year a source records the holding location','Năm phát hiện đã nhập':'Recorded discovery year','Từ năm':'From year','Đến năm':'To year','Bao gồm quan hệ chưa rõ năm':'Include undated relationships','Đặt lại bộ lọc':'Reset filters','Tải quan hệ đã lọc':'Download filtered relationships','Đọc mục từ Đan–Mạng →':'Read the Đan–Mạng entry →','Rà soát KMZ và đối chiếu nguồn ↗':'KMZ review and source comparison ↗','Dữ liệu tọa độ':'Coordinate data','Loại tọa độ trong tệp':'Coordinate type in the file','Nhập tệp tọa độ':'Import coordinates','Tải GeoJSON':'Download GeoJSON','Tải CSV tọa độ':'Download coordinate CSV','Tải bản vá hiệu đính':'Download correction patch','Xóa tọa độ đã nhập':'Clear imported coordinates','Tra cứu Bách Khoa ↗':'Champa encyclopedia (Vietnamese) ↗','Tải bản đồ HTML để mở trên máy':'Download the standalone HTML map','Bản đồ di tích':'Heritage map','Bản đồ nền chưa tải được.':'The base map could not be loaded.','Vẫn có thể chọn hồ sơ để xem.':'You can still select and read site dossiers.','Bảng dữ liệu':'Data table','Bảng':'Table','Lọc bảng':'Filter table','Lọc trong bảng (không phân biệt dấu)…':'Filter table (accents optional)…','Tải CSV (đang lọc)':'Download filtered CSV','Thông tin bản đồ':'Map information','Chú giải mức kiểm tọa độ':'Coordinate verification legend','Tọa độ thập phân · vĩ độ, kinh độ (WGS 84).':'Decimal coordinates · latitude, longitude (WGS 84).','Thông tin bản đồ và chú giải vị trí':'Map information and location legend','Chờ tọa độ':'Coordinates pending','Không tìm thấy hồ sơ. Thử tên khác, bỏ bớt bộ lọc, hoặc xem thẻ Dòng nguồn.':'No matching dossier. Try another name or clear some filters.','Hành chính hiện nay:':'Current administrative location:','Trước 7/2025:':'Before July 2025:','Địa danh lịch sử:':'Historical administrative location:','Ảnh và tổng mặt bằng':'Images and site plans','Điểm cần phân biệt':'Interpretive cautions','Công trình thành phần':'Component buildings','Hiện vật và văn khắc liên quan':'Related objects and inscriptions','Đọc thêm về di tích':'Further reading','Liên kết hồ sơ':'Related records','Dòng nguồn trong sách':'Source-table records','Mệnh đề và mức chứng cứ':'Claims and evidence levels','Hồ sơ vị trí':'Location record','Cần kiểm tiếp':'Further checks','Tên khác:':'Other names:','DẤU TÍCH · KHÔNG GIAN · KÝ ỨC':'HERITAGE · PLACE · MEMORY','Thánh địa · nền đỏ, số trắng':'Sanctuary · white number on red','Phế tích quan trọng · đỏ, số trắng':'Major ruin · white number on red','Nhóm hồ sơ · phóng gần để tách':'Site cluster · zoom in to separate','Hình ký hiệu biểu thị loại địa điểm; núi và sông chỉ hiện khi có hồ sơ. Quầng vàng: đang chọn.':'Shapes indicate place types; mountains and rivers appear where documented. Gold halo: selected site.'
};
Object.assign(pairs,{
'Quần thể đền tháp':'Temple sanctuary','Di tích khảo cổ':'Archaeological site','Phế tích Phật viện':'Buddhist monastery ruins','Tháp đơn':'Single temple tower','Nhóm ba tháp':'Three-tower group','Địa điểm gắn với văn khắc':'Inscription site','Thành cổ':'Ancient citadel','Phế tích thành':'Citadel ruins','Di tích / đền tháp':'Heritage site / temple','Nơi lưu giữ di vật':'Object holding location','Phế tích đền tháp':'Temple ruins','Phế tích kiến trúc':'Architectural ruins','Di chỉ cư trú sớm':'Early settlement site','Địa điểm thờ tự':'Place of worship','xã/phường hiện nay: chưa xác nhận':'current commune/ward unconfirmed','Phóng to':'Zoom in','Thu nhỏ':'Zoom out','HỒ SƠ':'DOSSIERS','Chỉ dòng có vấn đề đang mở':'Only records with unresolved issues','Tìm tên, mã bia (C.211), thần, xã, mã BDS…':'Search names, inscriptions (C.211), deities, places, BDS IDs…','Tìm tên, tên gốc, tỉnh, địa chỉ, mã BDS…':'Search names, original names, provinces, addresses, BDS IDs…','Tìm di tích, địa danh…':'Find a site or place…','minh họa':'illustrative location'
});
Object.assign(pairs,{'Giới thiệu và hướng dẫn':'Introduction and guides','Bách Khoa':'Encyclopedia','Tổng quan Sa Huỳnh':'Introduction to Sa Huynh','Lịch sử và địa tầng':'History and stratigraphy','Văn khắc và niên đại':'Inscriptions and chronology','Khảo cổ và bảo tồn':'Archaeology and conservation','Xuất ảnh':'Export image','Ảnh:':'Photo:','Nhóm A':'Group A'});
Object.assign(pairs,{'Đền tháp':'Temples and towers','Phế tích và dấu tích kiến trúc':'Ruins and architectural remains','Thành lũy':'Citadels and ramparts','Địa điểm văn khắc':'Inscription locations','Công trình nước và đường':'Waterworks and roads','Cư trú và sản xuất':'Settlement and production sites','Địa điểm khảo cổ':'Archaeological sites','Nơi phát hiện, lưu giữ hiện vật':'Find-spots and holding places','Địa điểm thờ tự':'Places of worship','Loại khác và hồ sơ nhóm':'Other and composite dossiers','Tình trạng định danh':'Identification status','Mọi tình trạng định danh':'All identification statuses','Không có dấu hiệu cần kiểm trong nhãn':'No checking flag in the type label','Cần kiểm hoặc theo tin báo':'Needs checking or reported only'});
Object.assign(pairs,{'Mở rộng':'Expanded search','Công cụ nghiên cứu':'Research tools','Tình trạng định danh tạm suy từ nhãn loại hình, không phải mức xác nhận học thuật.':'Identification status is provisionally inferred from type labels, not scholarly confirmation.','Ví dụ: Phật giáo, Quảng Nam, văn khắc…':'Example: Buddhism, Quang Nam, inscriptions…','Mở rộng từ khóa theo tên gọi và bảng đồng nghĩa, rồi xếp hạng kết quả; xử lý trên thiết bị.':'Expand terms using names and a synonym table, then rank matches; processed on this device.'});
Object.assign(pairs,{'Lớp':'Layers','Ký hiệu':'Symbols','Công cụ':'Tools','Có nguồn trong hồ sơ':'Sources cited in the dossier','Nơi lưu giữ theo hồ sơ:':'Holding location recorded in the dossier:','Chờ đối chiếu nguồn':'Awaiting source cross-check'});
Object.assign(pairs,{'Tùy chọn':'Options','Niên đại…':'Date…','Văn khắc…':'Inscription…'});
const dossiers={
 'champa-bia-tu-luong':{
  kind:'In situ Champa inscription',
  formerAdmin:'Tư Lương village, Tân An commune, Đak Pơ district, Gia Lai',
  subject:'Site identification',
  description:'Champa inscription C.237 is carved on a rock at Tư Lương. This dossier records the location of the inscribed rock and classifies the site as an inscription.',
  provenance:'The atlas author corrected the pin coordinates on 10 November 2026. They supersede the earlier KML position.',
  locationNote:'The pin marks the inscribed rock as supplied by the author. The protected boundary requires separate documentation.',
  sourceNotes:['Scholarly edition and identification of the Tư Lương Cham inscription.'],
 },
 'kmz-gps-0536':{
  kind:'Temple ruins',
  formerAdmin:'Ayun Pa, Gia Lai',
  subject:'Survey of the ruins',
  description:'The 1996 survey recorded architectural brick fragments and laterite on Hill 52, at a site known locally as Nền nhà ông vua.',
  provenance:'The Point in Yang Mun.kml matches GPS-0536. The atlas author confirmed the pin location on 9 November 2026.',
  locationNote:'The map uses GPS-0536. The record for the Nền Yang Mun polygon (GPS-0537) lies about 1.47 km away and is retained for comparison.',
  sourceNotes:[],
 },
 'kmz-gps-0535':{
  kind:'Temple ruins',
  formerAdmin:'Ayun Pa, Gia Lai',
  subject:'Survey of the ruins',
  description:'The 1996 survey recorded traces of foundations, laterite blocks and brick fragments. Inscription C.43 originates from Drang Lai and has a separate record.',
  provenance:'The pin uses GPS-0535 from the imported catalogue. The atlas author confirmed its location on 9 November 2026.',
  locationNote:'The pin marks the site as located by the atlas author. The inscription and its place of custody are documented separately.',
  sourceNotes:[],
 },
};
const overviews={
'my-son':'Mỹ Sơn is a temple sanctuary set in a mountain valley. Its dossier brings together architecture, sculpture, inscriptions, sacred landscape and conservation history. Building groups retain the reference letters and numbers used in archaeological documentation. Dates and interpretations should be read alongside their cited evidence.',
 'tra-kieu':'Trà Kiệu is an archaeological and historical settlement associated with Champa. This dossier distinguishes evidence from excavation, inscriptions and sculpture from interpretations of the ancient city. Proposed identifications and dates are discussed in the Vietnamese scholarly record.',
'dong-duong':'Đồng Dương is a major Buddhist site of Champa. The dossier connects the remains of its religious complex with inscriptions, sculpture, archaeological documentation and the surrounding landscape. The location of an object today is distinguished from its place of discovery.',
'bao-tang-dieu-khac-cham':'The Museum of Cham Sculpture in Đà Nẵng preserves architectural fragments and sculpture from many Champa sites. This atlas links selected objects to their documented places of origin and museum records. Collection history and archaeological provenance are treated separately.',
'po-nagar':'Pô Nagar is a temple complex associated with the worship of the Goddess and continuing Cham and Vietnamese religious traditions. Its dossier brings together architecture, inscriptions, historical transformations and living ritual. The author’s research hypotheses are identified separately from established records.',
'bang-an':'Bằng An is a distinctive brick temple with an octagonal plan. The dossier presents its architecture, inscriptions and dating evidence, with sources for further research.',
'khuong-my':'Khương Mỹ is a group of three brick temple towers. Architecture and surviving sculpture provide the main starting points for exploring the site and its scholarly dossier.',
'chien-dan':'Chiên Đàn is a group of three brick temple towers. The dossier brings together the buildings, archaeological discoveries and related sculpture.',
'duong-long':'Dương Long is a group of three monumental temple towers. Its dossier examines brick architecture, stone architectural sculpture and the evidence used to discuss chronology and regional connections.',
'hoa-lai':'Hòa Lai is a temple group important to the study of Champa architecture. The dossier distinguishes the surviving fabric, archaeological evidence, inscriptions and stylistic dating.',
'po-klong-garai':'Pô Klong Garai is a temple complex and a place of continuing Cham religious practice. The dossier covers its architecture, inscriptions and historical context.',
'thap-nhan':'Tháp Nhạn is a brick temple on Nhạn hill. The dossier presents its architectural form, setting and published historical evidence.'
};
function translate(text){
 if(pairs[text])return pairs[text];
 const m=text.match(/^(\s*)(.*?)(\s*)$/s);
 if(m&&pairs[m[2]])return m[1]+pairs[m[2]]+m[3];
 return text.split(' · ').map(part=>part.replace(/^(\s*)(.*?)(\s*)$/s,(all,a,b,c)=>a+(pairs[b]||b)+c)).join(' · ')
  .replace(/^Hồ sơ \((\d+)\)$/,'Dossiers ($1)')
  .replace(/^Dòng nguồn \((\d+)\)$/,'Source records ($1)')
  .replace(/^Di tích \((\d+)\)$/,'Sites ($1)')
  .replace(/^Nhóm ([A-Z]\d*)/,'Group $1')
  .replace(/^Tháp ([A-Z]\d*)(?=$|[ ·])/,'Tower $1')
  .replace(/^Ảnh:/,'Photo:');
}
function transform(root){
 root.querySelectorAll('[data-cluster-caption]').forEach(el=>{const text=lang==='en'?'SITES':'hồ sơ';if(el.textContent!==text)el.textContent=text;});
 root.querySelectorAll('a[href^="encyclopedia/"]').forEach(anchor=>{
  const target=new URL(anchor.getAttribute('href'),location.href);
  if(lang==='en')target.searchParams.set('lang','en');else target.searchParams.delete('lang');
  const base=new URL('encyclopedia/',location.href);
  anchor.setAttribute('href','encyclopedia/'+target.pathname.slice(base.pathname.length)+target.search+target.hash);
 });
 const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);let n;
 while(n=walker.nextNode()){
  if(n.parentElement.closest('script,style,[data-original],[data-localized-inscription],.project-credit,[data-cluster-caption]'))continue;
  const old=originals.get(n);const source=old&&n.textContent===old.output?old.source:n.textContent;
  const output=lang==='en'?translate(source):source;if(n.textContent!==output)n.textContent=output;originals.set(n,{source,output});
 }
 root.querySelectorAll('[aria-label],[placeholder]').forEach(el=>{if(el.closest('[data-original]'))return;const cache=attributeOriginals.get(el)||{};for(const attr of ['aria-label','placeholder']){if(!el.hasAttribute(attr)||el.id==='search'&&attr==='placeholder')continue;const current=el.getAttribute(attr),old=cache[attr];const source=old&&current===old.output?old.source:current;const output=lang==='en'?translate(source):source;if(current!==output)el.setAttribute(attr,output);cache[attr]={source,output};}attributeOriginals.set(el,cache);});
}
function refresh(){
 document.documentElement.lang=lang;document.title=lang==='en'?'Sa Huynh–Champa · Oc Eo–Funan · Cat Tien Heritage Atlas · Research Portal':'Bản đồ Di sản Sa Huỳnh–Champa · Óc Eo–Phù Nam · Cát Tiên · Cổng tra cứu học thuật';
 const dossierTitle=document.querySelector('#detail:not([hidden]) #dTitle')?.textContent?.trim();
 if(dossierTitle)document.title=dossierTitle+' · '+document.title;
 const r=api?.isResearch()??document.body.classList.contains('research');
 const workspace=api?.workspace(lang);
 if(workspace){
  document.querySelector('#workspaceTitle').textContent=workspace[0];
  document.querySelector('#workspaceIntro').textContent=workspace[1];
  document.querySelectorAll('[data-workspace]').forEach(a=>a.textContent=api.workspace(lang,a.dataset.workspace)[2]);
 }
 document.querySelector('#langVI').setAttribute('aria-pressed',String(lang==='vi'));document.querySelector('#langEN').setAttribute('aria-pressed',String(lang==='en'));
 const search=document.querySelector('#search');const sourceTab=document.querySelector('#tabR').getAttribute('aria-selected')==='true';search.placeholder=lang==='en'?(r?(sourceTab?'Search source names, provinces or BDS IDs…':'Search sites, inscriptions or deities…'):'Find a site or place…'):(r?(sourceTab?'Tìm tên nguồn, tỉnh, mã BDS…':'Tìm di tích, văn khắc, thần danh…'):'Tìm di tích, địa danh…');
 if(workspace&&!sourceTab)search.placeholder=workspace[3];
 search.placeholder=lang==='en'?(sourceTab?'Find source records…':'Find sites…'):(sourceTab?'Tìm dòng nguồn…':'Tìm di tích…');
 search.title=lang==='en'?'Filter names and dossier fields. Use Full-text search to search all dossier content.':'Lọc tên và các trường hồ sơ. Dùng Tra cứu toàn văn để tìm trong toàn bộ nội dung.';
 transform(document.body);
}
function translatedDossier(p,translation,original){
 const section=document.createElement('section');
 section.className='english-overview english-dossier';
 section.lang='en';
 const add=(tag,text,className)=>{
  const element=document.createElement(tag);
  if(className)element.className=className;
  element.textContent=text;
  section.append(element);
 };
 add('h3','English dossier');
 add('p','AI-assisted translation of the Vietnamese dossier.','acc');
 if(p.alt_names?.length)add('p','Also known as: '+p.alt_names.join(', '),'acc');
 add('p','Administrative names before July 2025: '+translation.formerAdmin,'acc');
 add('h4',translation.subject);
 add('p',translation.description);
 add('h4','Location and coordinate provenance');
 const coordinates=original.querySelector('.directions-link .acc');
 if(coordinates)add('p','Coordinates (WGS 84): '+coordinates.textContent,'acc');
 add('p',translation.provenance);
 add('p',translation.locationNote);
 const mapLink=original.querySelector('.google-maps-link');
 if(mapLink){
  const link=mapLink.cloneNode(true);
  link.setAttribute('aria-label','Open '+p.name+' in Google Maps');
  section.append(link);
 }
 const sourceLinks=original.querySelectorAll('.full-dossier .myson-article a[href]');
 if(sourceLinks.length){
  add('h4','References');
  const list=document.createElement('ul');
  sourceLinks.forEach((source,i)=>{
   const item=document.createElement('li');
   const link=source.cloneNode(true);
   link.removeAttribute('id');
   item.append(link);
   if(translation.sourceNotes[i])item.append('. '+translation.sourceNotes[i]);
   list.append(item);
  });
  section.append(list);
 }
 return section;
}
function detail(root,p,research){
 if(lang!=='en')return;
 const body=root.querySelector('.dbody');if(!body)return;
 const translation=dossiers[p?.id];
 const inscriptions=body.querySelector('.profile-inscriptions, .entity-inscription');
 const original=document.createElement('details');original.className='original-dossier';original.dataset.original='true';original.lang='vi';original.open=research&&!translation;
 const summary=document.createElement('summary');summary.lang='en';summary.textContent=research?'Scholarly dossier · Vietnamese original':'Read the full Vietnamese dossier';original.append(summary);
 const heading=body.querySelector('.detail-heading');
 [...body.childNodes].forEach(n=>{if(n!==heading&&n!==inscriptions)original.append(n)});
 if(inscriptions?.classList.contains('entity-inscription')){
  body.append(inscriptions,original);
  const actions=original.querySelector('.actions');if(actions)body.append(actions);
  return;
 }
 if(translation){
  const label=heading?.querySelector('.eyebrow');
  if(label)label.textContent=p.no+' · '+translation.kind.toUpperCase();
  body.append(translatedDossier(p,translation,original));
  if(inscriptions)body.append(inscriptions);
  body.append(original);
  const actions=original.querySelector('.actions');
  if(actions)body.append(actions);
  return;
 }
 const overview=document.createElement('section');overview.className='english-overview';
 const title=document.createElement('h3');title.textContent='Overview';overview.append(title);
 const intro=document.createElement('p');intro.textContent=overviews[p?.id]||'This atlas record documents a place associated with Champa heritage. Consult the Vietnamese dossier below for the available description, location evidence and cited sources. A detailed English translation has not yet been prepared.';overview.append(intro);
 const note=document.createElement('p');note.className='acc';note.textContent='English overview · Full dossier, captions and scholarly sources are available in Vietnamese below.';overview.append(note);
 const mapLink=original.querySelector('.google-maps-link');if(mapLink)overview.append(mapLink.cloneNode(true));
 const gallery=original.querySelector('.heritage-gallery');
 if(gallery&&!research){const images=document.createElement('details');images.className='sec';images.open=true;const label=document.createElement('summary');label.textContent='Images and site plans';images.append(label);const copy=gallery.cloneNode(true);transform(copy);copy.dataset.original='true';copy.lang='en';copy.querySelectorAll('[id]').forEach(n=>n.removeAttribute('id'));images.append(copy);body.append(overview,images);}else body.append(overview);
 if(inscriptions)body.append(inscriptions);
 body.append(original);
 const actions=original.querySelector('.actions');if(actions)body.append(actions);
}
function setLanguage(value){if(value===lang)return;lang=value;try{localStorage.setItem(key,lang)}catch{}const u=new URL(location.href);u.searchParams.set('lang',lang);history.replaceState(null,'',u.pathname+u.search+u.hash);api.refresh();refresh();}
function init(config){api=config;document.querySelector('#langVI').onclick=()=>setLanguage('vi');document.querySelector('#langEN').onclick=()=>setLanguage('en');refresh();new MutationObserver(()=>{if(queued)return;queued=true;queueMicrotask(()=>{queued=false;transform(document.body)})}).observe(document.body,{childList:true,subtree:true});}
window.CHAMPA_I18N={init,refresh,detail,language:()=>lang,search:p=>[dossiers[p.id]?.kind||pairs[p.kind]||'',dossiers[p.id]?.description||overviews[p.id]||''].join(' ')};
})();
