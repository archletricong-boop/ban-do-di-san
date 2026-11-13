/* Bản Đồ Di Sản Champa — ứng dụng riêng của bản đồ, chạy trên Atlas Core 1.x
   Cấu hình: atlas.config.json → window.ATLAS_CONFIG (do atlas-core/build sinh).
   Dữ liệu: data/ban-do-data.js (window.BDS). Không cần máy chủ.
   An toàn: chữ qua esc(); URL qua CORE.attrUrl (chặn javascript:/data:); HTML biên tập qua CORE.sanitizeHTML.
   Hai lớp dữ liệu tách bạch: HỒ SƠ BIÊN SOẠN (places) và DÒNG NGUỒN (corpus) chép từ sách.
   Điểm KMZ của dòng nguồn là liên kết ĐỀ XUẤT theo tên, chưa duyệt — chỉ hiện ở chế độ Nghiên cứu.
   Mọi chuỗi đưa vào HTML đều qua esc(). */
(() => {
'use strict';

document.addEventListener('click', event => {
 const control=event.target.closest('button,a.btn,summary');
 if(!control)return;
 control.classList.remove('click-lit');
 requestAnimationFrame(()=>control.classList.add('click-lit'));
 setTimeout(()=>control.classList.remove('click-lit'),650);
});

const CORE = window.AtlasCore, CFG = window.ATLAS_CONFIG || {};
if (!CORE) throw new Error('Thiếu Atlas Core (atlas-core/js/atlas-core.js).');
const B = window.BDS, A = B.atlas, V = A.vocab;
const ENC = window.CHAMPA_ENCYCLOPEDIA_INDEX;
const INSCRIPTION_CONTENT = ENC?.inscription_content || {};
const T = window.BDS_TOOLS;
const SYMBOLS = window.CHAMPA_SYMBOLS;
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = CORE.esc, safeHref = CORE.attrUrl;
// Chữ thường trước rồi mới bỏ dấu, để "Đ" cũng thành "d"; "sh" → "s" để Shiva/Vishnu khớp Śiva/Viṣṇu.
const norm = s => String(s ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/sh/g, 's').replace(/[^a-z0-9]+/g, ' ').trim();
const byId = (arr, k = 'id') => Object.fromEntries((arr || []).map(x => [x[k], x]));
const SRC = byId(A.sources), WF = byId(A.working_files), ST = byId(A.structures), OBJ = byId(A.objects), INS = byId(A.inscriptions);
const inscriptionIds = place => [...new Set([...(place.inscriptions || []), ...(place.regional_inscriptions || [])])].filter(id => INS[id]);
const inscriptionText = id => [INSCRIPTION_CONTENT[id]?.vi, INSCRIPTION_CONTENT[id]?.en, INS[id]?.content];

const places = A.places, PBY = byId(places), MUSEUM = byId(A.institutions);
const ROWS = B.corpus, RBY = byId(ROWS), LINKS = B.links, ISS = B.issues, PARM = B.parmentier;
const NORTH = window.CHAMPA_NORTH?.articles || {};
const thematicPlaces=places.filter(p=>p.sa_huynh_profile||p.landscape_profile||p.quang_ngai_profile||p.rock_inscription_profile);
const basePlaces=places.filter(p=>!p.citadel_profile&&!p.kmz_review_profile&&!thematicPlaces.includes(p));
const regionalBaseCount = basePlaces.filter(p => p.map_scope !== 'overseas').length;
const kmzReviewedPlaces=places.filter(p=>p.kmz_review_profile&&!thematicPlaces.includes(p));
// Display numbers are independent of stable BDS IDs and research-source records.
const additions = Object.keys(NORTH).filter(id=>!PBY[RBY[id]?.profile_id]).sort().map((id,i)=>{
 const r=RBY[id]; return {id,no:regionalBaseCount+i+1,name:r.name,kind:r.display_kind||(r.table_type==='phe_tich'?'Phế tích':'Di tích / đền tháp'),map_symbol:SYMBOLS.type(r),
 old_province:r.province_source,admin:{current:r.address_source||r.province_source},themes:['Kiến trúc','Khảo cổ'],
 _extra:'row',row:r,locations:[]};
});
const forts = (window.CHAMPA_FORTIFICATIONS||[]).map((r,i)=>PBY[r.id]||({...r,no:regionalBaseCount+additions.length+i+1,
 _extra:'fort',old_province:r.region,admin:{current:r.region+' · địa chỉ hiện hành cần đối chiếu'},themes:['Kiến trúc','Khảo cổ']}));
const fortIds=new Set(forts.map(p=>p.id));
const DISPLAY=basePlaces.concat(additions,forts,places.filter(p=>p.citadel_profile&&!fortIds.has(p.id)),kmzReviewedPlaces,thematicPlaces), DBY=byId(DISPLAY);

const phoneLayout = matchMedia('(max-width:600px), (max-width:1000px) and (max-height:500px)');
const isNarrow = () => phoneLayout.matches || window.matchMedia('(max-width: 900px)').matches;
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const KMZ_LABEL = {
  ung_vien_duy_nhat: 'Một ứng viên KMZ (chưa duyệt)', nhieu_ung_vien_can_chon: 'Nhiều ứng viên KMZ — cần chọn',
  mot_diem_cho_nhieu_dong: 'Một điểm KMZ cho nhiều dòng', 'cho_giai_quyet_V-001': 'Chờ V-001 (địa chỉ cần kiểm)',
  khong_co_ung_vien: 'Chưa có ứng viên KMZ', loai_ngoai_tinh: 'Loại: điểm ngoài khung tỉnh'};
const KMZ_RANK = {'cho_giai_quyet_V-001': 4, mot_diem_cho_nhieu_dong: 3, nhieu_ung_vien_can_chon: 2, ung_vien_duy_nhat: 1};
const MATCH_LABEL = {trung_ten: 'trùng tên', trung_ten_khi_bo_dau: 'trùng tên khi bỏ dấu', ten_gan_thu_cong: 'tên gần, người rà chọn có lý do'};
const matchLabel = k => String(k || '').split('+').map(x => x === 'ten_kmz_co_them_nhan' ? 'nhãn KMZ có thêm phần trong ngoặc' : (MATCH_LABEL[x] || x)).join('; ');
const TABLE_LABEL = {nhom_thap: 'Bảng nhóm tháp', phe_tich: 'Bảng phế tích'};

/* ---------- Lưu cục bộ (có thể bị chặn: luôn bọc try/catch) ---------- */
const KEY_COORDS = 'imported-coords', KEY_MODE = 'mode', KEY_ROWLAYER = 'row-layer';
// Không gian tên riêng cho bản đồ; đọc được khóa cũ (bds-…) rồi chuyển sang khóa mới khi ghi.
const store = CORE.createStore(CFG.storage_namespace || 'bds', {legacy: CFG.storage_legacy_keys || {}});
// Dữ liệu cục bộ có thể bị sửa tay: chỉ nhận khóa hợp lệ và điểm có tọa độ đúng.
const validImported = v => {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return {};
  const out = {};
  for (const [k, l] of Object.entries(v)) { if (!/^[A-Za-z0-9_.:-]{1,80}$/.test(k)) continue; const c = CORE.geo.validLocation(l); if (c) out[k] = c; }
  return out;
};
let imported = store.get(KEY_COORDS, validImported) || {};   // khóa: id hồ sơ hoặc mã BDS-…

/* ---------- Hàm dữ liệu ---------- */
const statusOf = s => V.coord_status[s] || {label: s || 'Không rõ', help: '', rank: -1};
const hasLocation = l => Number.isFinite(l?.lat) && Number.isFinite(l?.lon) && Math.abs(l.lat)<=90 && Math.abs(l.lon)<=180;
const originalPrimary = p => p.locations.find(l => l.primary) || p.locations[0] || {status:'chua_dinh_vi',role:'di_tich',lat:null,lon:null};
const primaryLoc = p => imported[p.id] ? Object.assign({}, originalPrimary(p), imported[p.id], {role: imported[p.id].role || originalPrimary(p).role, primary: true, imported: true}) : originalPrimary(p);
const secondaryLocs = p => p.locations.filter(l => !l.primary).concat(imported[p.id] ? [Object.assign({}, originalPrimary(p), {primary: false, replaced: true})] : []);
const decimalCoords = l => hasLocation(l) ? `${Number(l.lat).toFixed(6)}, ${Number(l.lon).toFixed(6)}` : 'Chưa xác nhận tọa độ';
const adminShort = p => p.admin.current || 'xã/phường hiện nay: chưa xác nhận';
function haversine(a, b) {
  const R = 6371008.8, r = Math.PI / 180;
  const dLat = (b.lat - a.lat) * r, dLon = (b.lon - a.lon) * r;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
const fmtDist = m => m < 1000 ? Math.round(m) + ' m' : (m / 1000).toFixed(m < 10000 ? 2 : 1).replace('.', ',') + ' km';

const LINKS_OF = {}, ISS_OF = {}, PARM_OF = {}, PROFILES_OF = {};
LINKS.forEach(l => (LINKS_OF[l.corpus_id] = LINKS_OF[l.corpus_id] || []).push(l));
ISS.forEach(i => i.corpus_ids.forEach(c => (ISS_OF[c] = ISS_OF[c] || []).push(i)));
PARM.forEach(x => String(x.corpus_de_xuat || '').split('; ').filter(Boolean).forEach(c => (PARM_OF[c] = PARM_OF[c] || []).push(x)));
places.forEach(p => {
  (p.corpus_ids || []).forEach(c => (PROFILES_OF[c] = PROFILES_OF[c] || []).push({p, rel: 'cung_di_tich'}));
  (p.corpus_related || []).forEach(c => (PROFILES_OF[c] = PROFILES_OF[c] || []).push({p, rel: 'lien_quan'}));
});
const openIssues = id => (ISS_OF[id] || []).filter(i => i.trang_thai === 'Mở');
const inProvLinks = id => (LINKS_OF[id] || []).filter(l => l.trong_khung_tinh === 'co' && !l.identity_conflict);
additions.forEach(p=>{p.locations=inProvLinks(p.id).map(l=>({lat:l.lat,lon:l.lon,status:'ung_vien',source_id:l.link_id,source_name:l.ten_kmz}));});
const displayLocs=p=>(p._extra?(imported[p.id]?[imported[p.id]]:p.locations):[primaryLoc(p)]).filter(l=>hasLocation(l)&&l.map_visible!==false);


DISPLAY.forEach(p => {
  const parts = [window.CHAMPA_I18N?.search(p), p.id, p.no, p.legacy_no, p.name, p.well_no, ...(p.alt_names || []), p.kind, ...(p.themes || []), ...(p.keywords || []), p.admin.current, p.admin.former, p.subtitle, p.intro, ...(p.more || []),
    ...(p.corpus_ids || []), ...inscriptionIds(p).flatMap(id => [id, INS[id].name, ...inscriptionText(id)]),
    ...(p.objects || []).flatMap(o => OBJ[o] ? [OBJ[o].name, OBJ[o].inventory] : [])];
  p._hay = norm(parts.join(' ')); p._hayC = p._hay.replace(/ /g, '');
});
ROWS.forEach(r => {
  const parts = [r.id, r.source_row_id, r.name, r.name_raw, r.province_source, r.province_2025, r.address_source, r.category, r.note_source,
    ...(LINKS_OF[r.id] || []).map(l => l.ten_kmz), ...(PROFILES_OF[r.id] || []).map(x => x.p.name)];
  r._hay = norm(parts.join(' ')); r._hayC = r._hay.replace(/ /g, '');
});

/* ---------- Tìm toàn văn trên mọi hồ sơ ---------- */
// Read text nodes only: HTML attributes, URLs and private working files are not indexed.
function contentText(value) {
  if (value == null) return '';
  if (Array.isArray(value)) return value.map(contentText).join(' ');
  if (typeof value === 'object') return Object.entries(value)
    .filter(([key]) => !/^(?:_|id$|no$|legacy_no$|sources?$|source_id$|url|href|src|path|file|location|checksum|admin_note|evidence_level|map_|table_type|profile_id)/i.test(key))
    .map(([,v]) => contentText(v)).join(' ');
  if (typeof value !== 'string') return '';
  const doc = new DOMParser().parseFromString(value.replace(/<\/(?:p|div|h[1-6]|li|tr|section|summary)>/gi, '$& '), 'text/html');
  doc.querySelectorAll('script,style').forEach(el=>el.remove());
  return (doc.body.textContent || '').replace(/https?:\/\/\S+/g,'').replace(/\s+/g,' ').trim();
}
let contentIndex;
function getContentIndex() {
 if (contentIndex) return contentIndex;
 contentIndex = DISPLAY.map(p => {
  const ids = inscriptionIds(p);
  const text = [p.name, ...(p.alt_names||[]), ...ids, contentText([p, NORTH[p.id],
    ...(p.objects || []).map(id=>OBJ[id]),
    ...ids.map(id=>INS[id]), ...ids.flatMap(inscriptionText),
    ...(p.structures || []).map(id=>ST[id])])].join(' ');
  const hay = norm(text);
  return {p, text, hay, compact:hay.replace(/ /g, ''), fields:{
    name:norm([p.name,...(p.alt_names||[])].join(' ')),
    code:norm([p.id,p.no,p.legacy_no,p.well_no,...ids].join(' ')),
    kind:norm([p.kind,...(p.themes||[]),...(p.keywords||[])].join(' ')),
    admin:norm([p.old_province,p.admin?.current,p.admin?.former].join(' ')),
    body:hay
  }};
 });
 return contentIndex;
}
const AI_STOP=new Set('ai cho cua co cac la va o tai ve voi trong tren mot nhung tim kiem ho so dia diem di tich nao dau hay gi'.split(' '));
const AI_PHRASES={
 'sa huynh':['sa huynh','tien so su','khao co'],
 'van khac':['van khac','bi ky','bia','inscription'],
 'bi ky':['bi ky','van khac','bia'],
 'dieu khac':['dieu khac','tuong','phu dieu'],
 'bao ton':['bao ton','trung tu','tu bo','hien trang'],
 'tin nguong':['tin nguong','ton giao','than linh','nghi le'],
 'phat giao':['phat giao','phat vien','buddha'],
 'kien truc':['kien truc','thap','den thap','cong trinh'],
 'bao tang':['bao tang','noi luu giu','trung bay']
};
function aiQueryPlan(value){
 const query=norm(value),used=new Set(),groups=[];
 Object.entries(AI_PHRASES).forEach(([phrase,alternatives])=>{if(query.includes(phrase)){groups.push({label:phrase,terms:alternatives.map(norm)});phrase.split(' ').forEach(x=>used.add(x));}});
 query.split(' ').filter(token=>token.length>1&&!AI_STOP.has(token)&&!used.has(token)).forEach(token=>groups.push({label:token,terms:[token]}));
 return {query,groups};
}
function aiRank(index,plan){
 const weights={name:14,code:13,kind:8,admin:7,body:2};
 return index.map(item=>{
  let score=0,matched=0;const reasons=[];
  for(const group of plan.groups){let best=0,bestField='';for(const [field,weight] of Object.entries(weights)){if(group.terms.some(term=>item.fields[field].includes(term))&&weight>best){best=weight;bestField=field;}}
   if(best){matched++;score+=best;const label={name:'tên gọi',code:'mã hồ sơ/văn khắc',kind:'loại hình/chủ đề',admin:'địa danh',body:'nội dung hồ sơ'}[bestField];if(!reasons.includes(label))reasons.push(label);}}
  if(item.fields.name.includes(plan.query))score+=20;
  const coverage=plan.groups.length?matched/plan.groups.length:0;
  return {...item,score,coverage,reasons};
 }).filter(x=>x.score>0&&(x.coverage>=.5||x.score>=14)).sort((a,b)=>b.score-a.score||b.coverage-a.coverage||a.p.name.localeCompare(b.p.name,'vi')).slice(0,30);
}
const contentDialog=$('#contentSearchDialog'), contentInput=$('#contentSearchInput');
const searchCatalogue=$('#searchCatalogue');
const catalogueURL=new URL(searchCatalogue.href);
const isInscriptionCode=query=>/^[ck]\s*\d+[a-z]?$/i.test(query);
function updateCatalogueLink() {
  const query=contentInput.value.trim();
  if (isInscriptionCode(norm(query))) catalogueURL.searchParams.set('type', 'inscription');
  else catalogueURL.searchParams.delete('type');
  if(query) catalogueURL.searchParams.set('q',query);
  else catalogueURL.searchParams.delete('q');
  searchCatalogue.href=catalogueURL.href;
}
let contentSearchMode='exact';
function setContentSearchMode(mode){
 contentSearchMode=mode;const ai=mode==='ai';
 $('#searchModeExact').setAttribute('aria-pressed',String(!ai));$('#searchModeAI').setAttribute('aria-pressed',String(ai));
 contentInput.placeholder=ai?'Ví dụ: Phật giáo, Quảng Nam, văn khắc…':'Tên di tích, điêu khắc, mã bia, thần danh…';
 $('#contentSearchHelp').textContent=ai?'Mở rộng từ khóa theo tên gọi và bảng đồng nghĩa, rồi xếp hạng kết quả; xử lý trên thiết bị.':'Tra toàn bộ hồ sơ, không phụ thuộc bộ lọc. Có thể gõ có dấu hoặc không dấu.';
 renderContentSearch();contentInput.focus();
}
function renderContentSearch() {
  updateCatalogueLink();
  const query=norm(contentInput.value), tokens=query.split(' ').filter(Boolean);
  const box=$('#contentSearchResults');box.replaceChildren();
  if(!tokens.length){$('#contentSearchStatus').textContent='Nhập từ khóa để tìm trong '+DISPLAY.length+' hồ sơ.';return;}
  const compact=query.replace(/ /g,'');
  const codeQuery=isInscriptionCode(query);
  const codePattern=codeQuery?new RegExp('(?:^| )'+query.replace(/\s+/g,' ?')+'(?: |$)'):null;
  const matches=contentSearchMode==='ai'?aiRank(getContentIndex(),aiQueryPlan(contentInput.value)):getContentIndex().filter(x=>codePattern?codePattern.test(x.hay):(tokens.every(t=>x.hay.includes(t))||x.compact.includes(compact)))
    .sort((a,b)=>(b.fields.name.includes(query)?1:0)-(a.fields.name.includes(query)?1:0));
  $('#contentSearchStatus').textContent=contentSearchMode==='ai'?`${matches.length} gợi ý được xếp hạng theo mức phù hợp.`:matches.length+' hồ sơ khớp từ khóa.';
  if(!matches.length){box.textContent='Không tìm thấy nội dung phù hợp. Thử từ khóa khác hoặc ít từ hơn.';return;}
  matches.forEach(({p,text,reasons=[],coverage=0})=>{
    const button=document.createElement('button');button.type='button';button.className='content-search-result';
    const title=document.createElement('b');title.textContent=p.name;
    const meta=document.createElement('small');meta.textContent=p.kind+' · '+adminShort(p);
    // Locate the match in original text without assuming normalized text has equal offsets.
    const words=text.split(/\s+/), at=words.findIndex((word,i)=>norm(words.slice(i,i+tokens.length+2).join(' ')).includes(query));
    const start=at<0?0:Math.max(0,at-10);
    const snippet=document.createElement('span');snippet.textContent=(start?'… ':'')+words.slice(start,start+44).join(' ')+(words.length>start+44?' …':'');
    button.append(title,meta);
    if(contentSearchMode==='ai'){const why=document.createElement('small');why.className='ai-match-reason';why.textContent=`Khớp ${Math.round(coverage*100)}% ý hỏi · ${reasons.join(', ')}`;button.append(why);}
    button.append(snippet);
    button.onclick=()=>{contentDialog.close();closeTable();choose(p,{focus:true});};
    box.append(button);
  });
}
$('#openContentSearch').onclick=()=>{contentDialog.showModal();renderContentSearch();contentInput.focus();};
$('#closeContentSearch').onclick=()=>contentDialog.close();
$('#searchModeExact').onclick=()=>setContentSearchMode('exact');
$('#searchModeAI').onclick=()=>setContentSearchMode('ai');
$('#contentSearchForm').onsubmit=event=>{event.preventDefault();renderContentSearch();};
let contentSearchTimer;
contentInput.addEventListener('input',()=>{updateCatalogueLink();clearTimeout(contentSearchTimer);contentSearchTimer=setTimeout(renderContentSearch,120);});
contentDialog.addEventListener('click',event=>{if(event.target===contentDialog){const r=contentDialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)contentDialog.close();}});

/* ---------- Chế độ xem, thẻ ---------- */
const requestedMode = new URLSearchParams(location.search).get('mode');
let research = requestedMode ? requestedMode === 'research' : store.get(KEY_MODE) !== 'public';
let tab = 'P';
let relationsUI=null;
function setMode(r) {
  research = r;
  if (!r) { setTab('P'); closeTable(); }
  const modeURL=new URL(location.href);modeURL.searchParams.set('mode',r?'research':'public');history.replaceState(null,'',modeURL.pathname+modeURL.search+modeURL.hash);
  if(!r&&location.hash==='#relations'){const url=new URL(location.href);url.hash='';url.searchParams.delete('mode');history.replaceState(null,'',url.pathname+url.search);}
  document.body.classList.toggle('research', r);
  $('#modePublic').setAttribute('aria-pressed', String(!r));
  $('#modeResearch').setAttribute('aria-pressed', String(r));
  store.set(KEY_MODE, r ? 'research' : 'public');
  relationsUI?.refresh();
  fillKindFilter();
  fillTableSets();
  drawSecondary(); renderLegend(); renderPlaces(); renderRows();
  if (!$('#tableview').hidden) renderTable();
  if (selected && !$('#detail').hidden) renderSelected();
  window.CHAMPA_I18N?.refresh();
}
$('#modePublic').onclick = () => setMode(false);
$('#modeResearch').onclick = () => setMode(true);

function setTab(t, focus = false) {
  if ((!research || !hasChampaSources()) && t === 'R') t = 'P';
  tab = t;
  [['P', '#tabP', '#panelP'], ['R', '#tabR', '#panelR']].forEach(([k, b, pnl]) => {
    $(b).setAttribute('aria-selected', String(k === t)); $(b).tabIndex = k === t ? 0 : -1; $(pnl).hidden = k !== t;
  });
  $('#search').placeholder = t === 'P' ? 'Tìm tên, mã bia (C.211), thần, xã, mã BDS…' : 'Tìm tên, tên gốc, tỉnh, địa chỉ, mã BDS…';
  drawPlaceGroups();
  if (focus) $(t === 'P' ? '#tabP' : '#tabR').focus();
  window.CHAMPA_I18N?.refresh();
}
$('#tabP').onclick = () => setTab('P'); $('#tabR').onclick = () => setTab('R');
$('#tabs').addEventListener('keydown', e => { if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { setTab(tab === 'P' ? 'R' : 'P', true); e.preventDefault(); } });

/* ---------- Bộ lọc ---------- */
const KIND_GROUPS = window.ATLAS_KIND_GROUPS;
let kindFilterValues = [];
function fillKindFilter(values = kindFilterValues) {
  kindFilterValues = values;
  KIND_GROUPS.fill(document.getElementById('kind'), values, research);
}
function fillSelect(sel, values, labelFn = v => v) {
  values.forEach(v => { const o = document.createElement('option'); o.value = v; o.textContent = labelFn(v); sel.append(o); });
}
const uniq = a => [...new Set(a.filter(Boolean))];

fillSelect($('#coord'), Object.keys(V.coord_status), k => V.coord_status[k].label);
fillSelect($('#evidence'), uniq(DISPLAY.map(p=>p.evidence_level)));
fillSelect($('#rprov'), uniq(ROWS.map(r => r.province_source)));
fillSelect($('#rprov25'), uniq(ROWS.map(r => r.province_2025)).sort((a, b) => a.localeCompare(b, 'vi')));
fillSelect($('#rtable'), ['nhom_thap', 'phe_tich'], k => TABLE_LABEL[k]);
fillSelect($('#rkmz'), Object.keys(KMZ_LABEL).filter(k => k !== 'loai_ngoai_tinh'), k => KMZ_LABEL[k]);
fillSelect($('#importStatus'), ['gps_thuc_dia', 'do_dac', 'tham_chieu', 'kmz_tac_gia', 'ung_vien'], k => 'Tệp này là: ' + V.coord_status[k].label);

// Layer membership is separate from shape and from stable dossier IDs.
const LAYER_DEFS=[['di_tich','Di tích'],['thanh','Thành'],['phe_tich','Phế tích'],['canh_quan','Cảnh quan'],['bao_tang','Bảo tàng'],['sa_huynh','Sa Huỳnh'],['gieng','Giếng']];

const WORKSPACES = {
  champa: {
    layers: ['di_tich','thanh','phe_tich'],
    vi: ['Di tích và phế tích Champa','Tra di tích, thành và phế tích Champa theo niên đại, văn khắc và mức kiểm tọa độ.','Champa','Tìm di tích Champa, địa danh, mã bia…'],
    en: ['Champa sites and ruins','Explore Champa sites, citadels and ruins by date, inscription and coordinate evidence.','Champa','Find a Champa site, place or inscription…']
  },
  'sa-huynh': {
    layers: ['sa_huynh'],
    vi: ['Di tích và phế tích Sa Huỳnh','Tra di chỉ cư trú, mộ táng và các địa điểm khảo cổ được ghi trong nguồn Sa Huỳnh.','Sa Huỳnh','Tìm địa điểm Sa Huỳnh…'],
    en: ['Sa Huynh sites and ruins','Explore settlements, burials and archaeological sites in the Sa Huynh records.','Sa Huynh','Find a Sa Huynh site…']
  },
  'bao-tang': {
    layers: ['bao_tang'],
    vi: ['Bảo tàng và hiện vật','Chọn nơi lưu giữ trên bản đồ hoặc tra danh mục hiện vật và văn khắc.','Bảo tàng','Tìm bảo tàng, nơi lưu giữ…'],
    en: ['Museums and collections','Choose a repository on the map or search objects and inscriptions.','Museums','Find a museum or repository…']
  },
  'canh-quan': {
    layers: ['canh_quan','gieng'],
    vi: ['Cảnh quan và hệ thống nước','Tra hồ sơ giếng, núi, sông và các địa điểm cảnh quan.','Cảnh quan','Tìm giếng, sông, núi, cảnh quan…'],
    en: ['Landscapes and water systems','Explore wells, mountains, rivers and other landscape records.','Landscapes','Find a well, river or landscape…']
  },
  'gieng-cham': {
    layers: ['gieng'],
    vi: ['Giếng Chăm và công trình nước','Tra giếng đào, cụm thu nước và hồ sơ chờ định vị. Mức kiểm tọa độ và quy thuộc được ghi riêng.','Giếng Chăm','Tìm giếng, làng hoặc mã GPS…'],
    en: ['Cham wells and waterworks','Explore wells, water catchments and records awaiting coordinates. Location and attribution evidence are recorded separately.','Cham wells','Find a well, village or GPS ID…']
  },
  'cat-tien': reservedWorkspace('Cát Tiên','Cat Tien',{cat_tien:'Cát Tiên'}),
  'oc-eo-phu-nam': reservedWorkspace('Óc Eo – Phù Nam – Chân Lạp','Oc Eo – Funan – Chenla',{
    oc_eo_phu_nam:'Óc Eo – Phù Nam',
    chan_lap:'Chân Lạp'
  })
};
function reservedWorkspace(vi, en, layerLabels) {
 return {layers:Object.keys(layerLabels), layerLabels, reserved:true,
   vi:[vi,'Bản đồ đối chiếu dành riêng cho bộ hồ sơ '+vi+'.',vi,'Tìm hồ sơ '+vi+'…'],
   en:[en,'Comparison map for the '+en+' collection.',en,'Find a '+en+' dossier…']};
}
const OVERLAY_KEYS = Object.keys(WORKSPACES);
WORKSPACES['tong-hop'] = {
 vi:['Bản đồ tổng hợp','Chồng các bản đồ đã có. Bật tắt từng nhóm trong mục Lớp bản đồ.','Tổng hợp','Tìm trong các bản đồ…'],
 en:['Combined atlas','Overlay the available maps. Toggle each group under Map layers.','Combined','Search across the maps…']
};
const layerKeys=LAYER_DEFS.map(([key])=>key).concat(OVERLAY_KEYS.filter(k=>WORKSPACES[k].reserved).flatMap(k=>WORKSPACES[k].layers));
function workspaceFromUrl(url) {
  const key = new URL(url, location.href).searchParams.get('ban-do');
  if (key==='di-tich') return 'tong-hop';
  if (key==='chan-lap') return 'oc-eo-phu-nam';
  return Object.hasOwn(WORKSPACES,key) ? key : 'champa';
}
let workspace = workspaceFromUrl(location.href);
const hasChampaSources = () => workspace==='champa' || workspace==='tong-hop';
const workspaceText = (lang, key = workspace) => WORKSPACES[key][lang === 'en' ? 'en' : 'vi'];
function workspaceHref(key, hash = '') {
  const url = new URL(location.href);
  url.searchParams.set('ban-do', key);
  url.hash = hash;
  return url.pathname + url.search + url.hash;
}
const oldLayers=store.get('visible-layers-v1');
const previousLayers=store.get('visible-layers-v2') || (Array.isArray(oldLayers) ? [...oldLayers,'gieng'] : null);
const storedLayers=store.get('visible-layers-v3') || (Array.isArray(previousLayers) ?
  [...previousLayers,...layerKeys.filter(key=>!LAYER_DEFS.some(([id])=>id===key))] : null);
const enabledLayers=new Set(Array.isArray(storedLayers) ? storedLayers.filter(k=>layerKeys.includes(k)) : layerKeys);
const enabledOverlays = new Set(OVERLAY_KEYS);
const visibleSelection = () => workspace==='tong-hop' ? enabledOverlays : enabledLayers;
function layersOf(p){
 const type=SYMBOLS.type(p);
 const layers=Array.isArray(p.map_layers) ? p.map_layers.filter(k=>layerKeys.includes(k)) :
   [['nui_thieng','song_thieng','canh_quan'].includes(type)?'canh_quan':layerKeys.includes(type)?type:'di_tich'];
 return layers;
}
function inWorkspace(p, key = workspace) {
 if(key==='tong-hop')return OVERLAY_KEYS.some(group=>inWorkspace(p,group));
 const layers=layersOf(p);
 // The 2026 inventory explicitly assigns both cultures to Thanh Chiếm.
 if(key==='champa' && layers.includes('sa_huynh') && p.id!=='sa-huynh-ky2026-234')return false;
 return layers.some(layer=>WORKSPACES[key].layers.includes(layer));
}
function workspaceLayersOf(p) {
 if(workspace==='tong-hop')return OVERLAY_KEYS.filter(key=>inWorkspace(p,key));
 return inWorkspace(p)?layersOf(p).filter(k=>WORKSPACES[workspace].layers.includes(k)):[];
}
const layerVisible = p => workspaceLayersOf(p).some(k=>visibleSelection().has(k));
function placeCode(p) {
 const showWellCode = workspace==='gieng-cham' || workspace==='canh-quan' || workspace==='tong-hop';
 return showWellCode ? (p.well_no || p.no) : p.no;
}
function workspaceControls() {
 if(workspace==='tong-hop')return OVERLAY_KEYS
   .filter(key=>!WORKSPACES[key].reserved || DISPLAY.some(p=>inWorkspace(p,key)))
   .map(key=>[key,workspaceText('vi',key)[2]]);
 const {layers,layerLabels}=WORKSPACES[workspace];
 return layers.map(key=>[key,layerLabels?.[key]||LAYER_DEFS.find(([id])=>id===key)?.[1]||key]);
}
function syncWorkspace() {
 const records=DISPLAY.filter(p=>inWorkspace(p));
 const isSites=hasChampaSources();
 const isMuseum=workspace==='bao-tang';
 const awaitingRecords=WORKSPACES[workspace].reserved && !records.length;
 document.body.dataset.activeWorkspace=workspace;
 document.body.classList.toggle('workspace-empty',Boolean(awaitingRecords));
 $('#comparisonNotice').hidden=!awaitingRecords;
 $('#workspaceLayerNote').textContent=workspace==='tong-hop' ?
   'Hồ sơ thuộc nhiều nhóm vẫn chỉ hiện một lần trong danh sách. Hồ sơ chờ tọa độ vẫn tra được.' :
   'Hồ sơ chờ tọa độ vẫn có trong danh sách.';
 $('#workspaceTitle').textContent=workspaceText('vi')[0];
 const fallback=$('#fallbacklist');
 if(!map){
   fallback.replaceChildren(...records.map(p=>{
     const button=document.createElement('button');
     button.type='button';button.textContent=placeCode(p)+'. '+p.name;
     button.onclick=()=>choose(p,{focus:true});return button;
   }));
 }
 $('#workspaceIntro').textContent=workspaceText('vi')[1];
 $('#maparea').setAttribute('aria-label',workspaceText('vi')[0]);
 $('#tabP').textContent=`Hồ sơ (${records.length})`;
 $('#tabs').hidden=!isSites;
 $('#rowLayerControl').hidden=!isSites;
 $('#openRelations').hidden=!isSites;
 $('#relationsPanel').hidden=!isSites;
 $('#museumCatalogue').hidden=!isMuseum;
 $('#landscapeNotes').hidden=workspace!=='canh-quan';
 $('#saHuynhResearch').hidden=workspace!=='sa-huynh';
 $('#champaResearch').hidden=workspace!=='champa';
 $('#wellResearch').hidden=!['gieng-cham','canh-quan'].includes(workspace);
 $('#catTienResearch').hidden=workspace!=='cat-tien';
 $('#ocEoResearch').hidden=workspace!=='oc-eo-phu-nam';
 if(isMuseum && !$('#collectionSearch').childElementCount) setupCollection($('#collectionSearch'));
 $$('[data-workspace]').forEach(a=>{
   a.href=workspaceHref(a.dataset.workspace);
   if(a.dataset.workspace===workspace)a.setAttribute('aria-current','page');
   else a.removeAttribute('aria-current');
 });
 fillKindFilter(records.map(p=>p.kind));
 [['theme',records.flatMap(p=>p.themes||[])],['oldprov',records.map(p=>p.old_province)]].forEach(([id,values])=>{
   const select=document.getElementById(id);
   select.length=1;
   fillSelect(select,uniq(values).sort((a,b)=>a.localeCompare(b,'vi')));
 });
 if(!isSites)setTab('P');
 renderLayerControls();
 drawSecondary();
 renderPlaces();
 renderRows();
 renderLegend();
 relationsUI?.refresh();
 window.CHAMPA_I18N?.refresh();
}
function enterWorkspace(key) {
 if(key===workspace)return;
 workspace=key;
 closeTable();
 history.replaceState(null,'',workspaceHref(key,location.hash));
 ['#search','#dateQuery','#inscriptionQuery','#coord','#evidence'].forEach(id=>$(id).value='');
 syncWorkspace();
}
function renderLayerControls(){
 const controls=workspaceControls();
 const selection=visibleSelection();
 $('#mapLayerControls').innerHTML=controls.map(([key,label])=>`<label class="layer-check"><input type="checkbox" data-map-layer="${key}" ${selection.has(key)?'checked':''}><span>${esc(label)}</span><small>${DISPLAY.filter(p=>workspaceLayersOf(p).includes(key)).length}</small></label>`).join('');
 $$('[data-map-layer]').forEach(input=>input.onchange=()=>{input.checked?selection.add(input.dataset.mapLayer):selection.delete(input.dataset.mapLayer);applyLayers();});
 $('#layersAll').setAttribute('aria-pressed',String(controls.every(([k])=>selection.has(k))));
 $('#layersNone').setAttribute('aria-pressed',String(controls.every(([k])=>!selection.has(k))));
}
function applyLayers(){
 if(workspace!=='tong-hop')store.set('visible-layers-v3',[...enabledLayers]);
 renderLayerControls();drawSecondary();renderPlaces();renderRows();renderLegend();
 relationsUI?.refresh();
 window.CHAMPA_I18N?.refresh();
}
$('#layersAll').onclick=()=>{workspaceControls().forEach(([k])=>visibleSelection().add(k));applyLayers();};
$('#layersNone').onclick=()=>{workspaceControls().forEach(([k])=>visibleSelection().delete(k));applyLayers();};

const qmatch = (x, q, qc) => !q || x._hay.includes(q) || x._hayC.includes(qc);
function filteredPlaces() {
  const q = norm($('#search').value), qc = q.replace(/ /g, '');
  const kind = $('#kind').value, theme = $('#theme').value, prov = $('#oldprov').value, coord = research ? $('#coord').value : '';
  const evidence=research?$('#evidence').value:'';
  const kindStatus=research?$('#kindStatus').value:'';
  const date = norm($('#dateQuery').value).replace(/^the ky ([ivxlcdm]+)$/, '$1');
  const inscription = norm($('#inscriptionQuery').value);
  const parseCode = value => norm(value).match(/^c ?0*(\d+)(?: ?([a-z]\d*))?$/);
  const inscriptionCode = parseCode(inscription);
  const matchingDate = p => (p.dating || []).some(d =>
    (research || !d.research_only) && (' ' + norm(d.label) + ' ').includes(' ' + date + ' '));
  const matchingInscription = p => inscriptionIds(p).some(id => {
    const record = INS[id];
    if (inscriptionCode) {
      const code = parseCode(id);
      return code?.[1] === inscriptionCode[1] && (!inscriptionCode[2] || code[2] === inscriptionCode[2]);
    }
    return norm([id, record?.name, ...inscriptionText(id), record?.languages].join(' ')).includes(inscription);
  });
  return DISPLAY.filter(p => (!date || matchingDate(p)) && (!inscription || matchingInscription(p)) && (!evidence||p.evidence_level===evidence) && layerVisible(p) && qmatch(p, q, qc) && KIND_GROUPS.matches(p.kind, kind) && (!kindStatus || KIND_GROUPS.unsettled(p.kind) === (kindStatus === 'unsettled')) && (!theme || (p.themes || []).includes(theme))
    && (!coord || primaryLoc(p).status===coord || displayLocs(p).some(l=>l.status===coord)) && (!research || !prov || p.old_province === prov));
}
function filteredRows() {
  if(!hasChampaSources())return [];
  const q = norm($('#search').value), qc = q.replace(/ /g, '');
  const pv = $('#rprov').value, pv25 = $('#rprov25').value, tb = $('#rtable').value, km = research ? $('#rkmz').value : '', iss = research && $('#rissue').checked;
  return ROWS.filter(r => layerVisible(r) && qmatch(r, q, qc) && (!pv || r.province_source === pv) && (!pv25 || r.province_2025 === pv25) && (!tb || r.table_type === tb)
    && (!km || r.kmz_link_status === km) && (!iss || openIssues(r.id).length));
}

/* ---------- Bản đồ ---------- */
let map = null, markers = {}, secLayer = null, rowLayer = null, rowMarkers = {}, selected = null, lastKey = '', clusterLayer = null, nameLayer = null;
/* Mức phóng bắt đầu hiện tên: khách tham quan thấy sớm hơn người nghiên cứu. */
const NAME_ZOOM = {public: 12, research: 14};
let lastPlaceGroups = [];
function drawPlaceNames(groups) {
 nameLayer.clearLayers();
 if(!Number.isFinite(map.getZoom()) || map.getZoom() < (research ? NAME_ZOOM.research : NAME_ZOOM.public)) return;
 const hit=(a,b)=>a.x<b.x+b.w&&b.x<a.x+a.w&&a.y<b.y+b.h&&b.y<a.y+a.h;
 /* Ô đã chiếm: mọi ghim và cụm (40 px), rồi tới từng nhãn đã đặt. */
 const bounds=map.getPixelBounds();
 const visibleGroups=groups.filter(g=>g.some(q=>q.x>=bounds.min.x-44&&q.x<=bounds.max.x+44&&q.y>=bounds.min.y-44&&q.y<=bounds.max.y+44));
 const taken=visibleGroups.map(g=>({x:g.reduce((s,q)=>s+q.x,0)/g.length-22,y:g.reduce((s,q)=>s+q.y,0)/g.length-22,w:44,h:44}));
 visibleGroups.filter(g=>g.length===1).map(g=>g[0]).sort((a,b)=>(a.p.no||1e9)-(b.p.no||1e9)).forEach(({p,l,x,y})=>{
  const box={x:x+22,y:y-11,w:p.name.length*7.2+16,h:22};
  if(box.x<bounds.min.x||box.y<bounds.min.y||box.x+box.w>bounds.max.x||box.y+box.h>bounds.max.y||taken.some(t=>hit(t,box)))return;
  taken.push(box);
  L.tooltip({permanent:true,direction:'right',offset:[20,0],className:'place-name-label',interactive:false,opacity:1})
   .setLatLng([l.lat,l.lon]).setContent(esc(p.name)).addTo(nameLayer);
 });
}
const panelBackStack=[];
let restoringPanel=false;
const rowToggle = $('#rowToggle');
let showRows = store.get(KEY_ROWLAYER) === true;
rowToggle.checked = showRows;
rowToggle.onchange = () => {
  showRows = rowToggle.checked;
  store.set(KEY_ROWLAYER, showRows);
  drawRows();
  renderLegend();
};
if (window.L) {
  map = L.map('map', {zoomControl: false, zoomAnimation: !reduceMotion});
  L.control.zoom({position: 'topright', zoomInTitle: 'Phóng to', zoomOutTitle: 'Thu nhỏ'}).addTo(map);
  L.control.scale({imperial: false, position: 'bottomright'}).addTo(map);
  const tileDefs = (CFG.map && CFG.map.tiles) || [];
  const baseLayers = {};
  let tileErrors = 0;
  const onErr = () => { if (++tileErrors === 4) $('#maptopNote').textContent = 'Bản đồ nền tải chậm hoặc bị chặn; các điểm vẫn hiển thị.'; };
  tileDefs.forEach((t, i) => {
    if (!/^https:\/\//.test(t.url)) return;                     // chỉ nhận lớp nền https
    const layer = L.tileLayer(t.url, {crossOrigin: 'anonymous', maxZoom: t.max_zoom || 19, attribution: CORE.sanitizeHTML(t.attribution || '')});
    layer.on('tileerror', onErr); baseLayers[t.name || ('Lớp ' + (i + 1))] = layer;
    if (i === 0) layer.addTo(map);
  });
  if (Object.keys(baseLayers).length > 1) L.control.layers(baseLayers, null, {position: 'topright'}).addTo(map);
  window.addAtlasMapImageControl?.(map, () => `ban-do-${workspace}-${new Date().toISOString().slice(0, 10)}.png`, captureImagePlaces);
  // Image-only basemap: no third-party reference/administrative label overlay.
  // Text anchors label archipelagos; they do not define boundaries or island extents.
  const maritimePane=map.createPane('maritimeLabels');
  maritimePane.style.zIndex=450;maritimePane.style.pointerEvents='none';
  const geographicLabels=L.layerGroup();
  const labelDefs=[
    {at:[16.5,112.0],kind:'archipelago',vi:'Quần đảo Hoàng Sa',en:'Hoàng Sa Islands'},
    {at:[10.0,114.2],kind:'archipelago',vi:'Quần đảo Trường Sa',en:'Trường Sa Islands'},
    {at:[13.5,115.0],kind:'sea',vi:'BIỂN ĐÔNG',en:'BIỂN ĐÔNG · EAST SEA'},
    {at:[21.0,105.9],kind:'country',vi:'VIỆT NAM',en:'VIỆT NAM'}
  ];
  const geographicIcon=label=>{
    const english=document.documentElement.lang==='en';
    return L.divIcon({className:'geographic-label geographic-'+label.kind,
      html:'<div data-original="true" lang="'+(english?'en':'vi')+'">'+esc(english?label.en:label.vi)+'</div>',
      iconSize:[200,56],iconAnchor:[100,28]});
  };
  const geographicMarkers=labelDefs.map(label=>L.marker(label.at,{
    pane:'maritimeLabels',interactive:false,keyboard:false,icon:geographicIcon(label)
  }).addTo(geographicLabels));
  // Recreate text icons on a language change so transformed marker layers repaint.
  new MutationObserver(()=>geographicMarkers.forEach((marker,i)=>marker.setIcon(geographicIcon(labelDefs[i]))))
    .observe(document.documentElement,{attributes:true,attributeFilter:['lang']});
  const syncGeographicLabels=()=>{
    const z=map.getZoom();
    if(z>=4&&z<=9){if(!map.hasLayer(geographicLabels))geographicLabels.addTo(map);}
    else if(map.hasLayer(geographicLabels))map.removeLayer(geographicLabels);
    $('#map').classList.toggle('geographic-labels-small',z<=5);
  };
  map.on('zoomend',syncGeographicLabels);
  secLayer = L.layerGroup(); rowLayer = L.layerGroup(); clusterLayer = L.layerGroup().addTo(map); nameLayer = L.layerGroup().addTo(map);
  map.on('zoomend', () => drawPlaceGroups());
  map.on('moveend', () => drawPlaceNames(lastPlaceGroups));
  places.forEach(p => {
    const m = L.marker([0, 0], {keyboard: true, riseOnHover: true, zIndexOffset: 1000});
    m.on('click', () => choose(p, {move: false, focus: true}));
    markers[p.id] = m;
  });
} else {
  $('#fallback').style.display = 'block';

}

function symbolOf(record) { return SYMBOLS.type(record); }
function symbolLabel(key) { return SYMBOLS.labels[key] || key; }
function markerClasses(p) { return 'mk atlas-marker symbol-'+symbolOf(p)+(p.landscape_profile?' landscape-marker':'')+(p.id==='tra-kieu'?' site-tra-kieu':'')+(SYMBOLS.sacred(p)?' sacred-site':'')+(SYMBOLS.importantRuin(p)?' important-ruin':''); }
function iconFor(p, isSel, status = primaryLoc(p).status) {
 return L.divIcon({className:markerClasses(p)+' '+status+(isSel?' selected':''),html:SYMBOLS.html(symbolOf(p),placeCode(p),SYMBOLS.sacred(p),status),iconSize:[40,40],iconAnchor:[20,20]});
}
function refreshMarker(p) {
  if (!map) return;
  const m = markers[p.id], loc = primaryLoc(p);
  if(!m||!hasLocation(loc))return;
  m.setLatLng([loc.lat, loc.lon]);
  m.setIcon(iconFor(p, selected && selected.type === 'P' && selected.id === p.id));
  const label = `${placeCode(p)}. ${p.name} — ${symbolLabel(symbolOf(p))}${SYMBOLS.sacred(p)?' · Thánh địa':''}${SYMBOLS.importantRuin(p)?' · Phế tích quan trọng':''} · ${decimalCoords(loc)}`;
  m.unbindTooltip().bindTooltip(esc(label), {direction: 'top', offset: [0, -14]});
  const el = m.getElement();
  if (el) { el.setAttribute('role', 'button'); el.setAttribute('aria-label', label); el.removeAttribute('title'); }
  m.setZIndexOffset(selected?.type==='P'&&selected.id===p.id?1500:1000);
  m.options.title=label; m.options.alt=label; m.off('add',m._atlasLabel);m._atlasLabel=()=>{const node=m.getElement();if(node){node.setAttribute('aria-label',label);node.setAttribute('role','button');}};m.on('add',m._atlasLabel);
}
function drawPlaceGroups(list = filteredPlaces()) {
 if(!map||!clusterLayer)return;
 clusterLayer.clearLayers();
 Object.values(markers).forEach(m=>{if(map.hasLayer(m))m.remove();});
 const points=list.flatMap(p=>displayLocs(p).map(l=>{const xy=map.project([l.lat,l.lon],map.getZoom());return {p,l,x:xy.x,y:xy.y};}));
 const groups=T.groups(points,map.getZoom()<12?38:24);
 lastPlaceGroups=groups;
 drawPlaceNames(groups);
 groups.forEach(group=>{
  if(group.length===1){
   const {p,l}=group[0],active=selected?.id===p.id;
   const label=`${placeCode(p)}. ${p.name} — ${symbolLabel(symbolOf(p))} · ${decimalCoords(l)}`;
   const m=L.marker([l.lat,l.lon],{keyboard:true,riseOnHover:true,zIndexOffset:active?1600:1000,icon:iconFor(p,active,l.status)});
   m.bindTooltip(esc(label),{direction:'top',offset:[0,-14]});m.on('click',()=>choose(p,{move:false,focus:true}));
   m.on('add',()=>{const el=m.getElement();if(el){el.setAttribute('role','button');el.setAttribute('aria-label',label);}});
   if(!p._extra)markers[p.id]=m;
   m.addTo(clusterLayer);return;
  }
  const members=[...new Map(group.map(x=>[x.p.id,x.p])).values()],locs=group.map(x=>x.l);
  const center=[locs.reduce((s,l)=>s+l.lat,0)/locs.length,locs.reduce((s,l)=>s+l.lon,0)/locs.length];
  const english=window.CHAMPA_I18N?.language()==='en';
  const preview=members.slice(0,5).map(p=>p.name).join(', ');
  const extra=members.length>5?(english?` and ${members.length-5} other sites`:` và ${members.length-5} hồ sơ khác`):'';
  const label=members.length===1?`${placeCode(members[0])}. ${members[0].name} · ${locs.length} vị trí trong hồ sơ`:(english?`${members.length} sites: ${preview}${extra}`:`Nhóm ${members.length} hồ sơ: ${preview}${extra}`);
  const m=L.marker(center,{keyboard:true,icon:members.length===1?iconFor(members[0],false,'ung_vien'):L.divIcon({className:'place-cluster'+(members.some(p=>selected?.id===p.id)?' contains-selected':''),html:`<b>${members.length}</b><small data-cluster-caption>hồ sơ</small>`,iconSize:[44,44],iconAnchor:[22,22]})});
  m.bindTooltip(esc(label));
  m.bindPopup('<b>'+members.length+' hồ sơ · '+locs.length+' vị trí</b><p class="acc">Nhóm hiển thị theo mức phóng.</p>'+members.map(p=>`<button class="linkbtn" data-place="${esc(p.id)}">${placeCode(p)}. ${esc(p.name)}</button>`).join('<br>'));
  m.on('click',()=>{const nextZoom=Math.min(18,map.getMaxZoom(),map.getZoom()+2);if(map.getZoom()<nextZoom){m.closePopup();m.closeTooltip();map.setView(center,nextZoom,{animate:!reduceMotion});}});
  m.on('add',()=>m.getElement()?.setAttribute('aria-label',label));m.addTo(clusterLayer);
 });
}
// Capture the individual place icons without disturbing the interactive layer or its popups.
function captureImagePlaces(capture) {
 const paneName = 'atlasImagePlaces';
 const pane = map.getPane(paneName) || map.createPane(paneName, map.getPane('markerPane'));
 pane.style.visibility = 'hidden';
 const original = new Set();
 clusterLayer.eachLayer(marker => original.add(marker.getElement()));
 const imageLayer = L.layerGroup();
 const size = map.getSize();
 for (const p of filteredPlaces()) {
  for (const loc of displayLocs(p)) {
   const at = [loc.lat, loc.lon];
   const {x, y} = map.latLngToContainerPoint(at);
   if (x < 0 || x >= size.x || y < 0 || y >= size.y) continue;
   const active = selected?.id === p.id;
   L.marker(at, {pane: paneName, interactive: false, keyboard: false,
    zIndexOffset: active ? 1600 : 1000, icon: iconFor(p, active, loc.status)}).addTo(imageLayer).options.atlasName = map.getZoom() >= (research ? NAME_ZOOM.research : NAME_ZOOM.public) ? p.name : '';
  }
 }
 try {
  imageLayer.addTo(map);
  const individual = new Set();
  imageLayer.eachLayer(marker => {const node=marker.getElement();individual.add(node);node.dataset.atlasName=marker.options.atlasName;});
  return capture(original, individual);
 } finally {
  imageLayer.remove();
 }
}
function drawSecondary() {
  if (!map) return;
  secLayer.clearLayers();
  if (!research) { secLayer.remove(); return; }
  places.filter(layerVisible).forEach(p => secondaryLocs(p).filter(l=>hasLocation(l)&&l.map_visible!==false).forEach(l => {
    const title = `${p.name} — ${V.location_role[l.role] || l.role}: ${statusOf(l.status).label}${l.replaced ? ' (điểm cũ, đã được thay)' : ''}`;
    L.marker([l.lat, l.lon], {icon: L.divIcon({className: 'mk sec atlas-marker symbol-' + symbolOf(p) + ' ' + l.status, html: SYMBOLS.html(symbolOf(p),'',false,l.status), iconSize: [14, 14]}), keyboard: false})
      .bindTooltip(esc(title) + (l.note ? '<br><small>' + esc(publicGpsCredit(l.note)) + '</small>' : ''), {direction: 'top'}).addTo(secLayer);
  }));
  secLayer.addTo(map);
}

/* Điểm của dòng nguồn: tọa độ đã nhập (nếu có) hoặc điểm KMZ đề xuất trong khung tỉnh, gộp theo Global_ID. */
function rowPoints(rows) {
  const pts = {}, ids = new Set(rows.map(r => r.id));
  rows.forEach(r => {
    if (imported[r.id]) { const im = imported[r.id]; pts['imp:' + r.id] = {lat: im.lat, lon: im.lon, rows: [r], imp: im, cls: 'nhap', name: 'Tọa độ đã nhập'}; return; }
    inProvLinks(r.id).forEach(l => {
      const k = l.kmz_global_id;
      pts[k] = pts[k] || {lat: l.lat, lon: l.lon, rows: [], name: l.ten_kmz, gid: k, cls: 'ung_vien_duy_nhat'};
      if (!pts[k].rows.includes(r)) pts[k].rows.push(r);
      if ((KMZ_RANK[l.de_xuat] || 0) > (KMZ_RANK[pts[k].cls] || 0)) pts[k].cls = l.de_xuat;
    });
  });
  Object.values(pts).forEach(pt => { pt.all = pt.gid ? LINKS.filter(l => l.kmz_global_id === pt.gid && l.trong_khung_tinh === 'co').map(l => RBY[l.corpus_id]) : pt.rows; pt.hidden = pt.all.filter(r => !ids.has(r.id)).length; });
  return pts;
}
let rowPts = {};
function northernPoints(list = ROWS) {
  return Object.values(rowPoints(list.filter(r => NORTH[r.id])));
}
function drawRows(list = filteredRows()) {
  if (!map) return;
  rowLayer.clearLayers(); rowMarkers = {};
  if (!research || !showRows) { rowLayer.remove(); return; }
  rowPts = rowPoints(list.filter(r=>!DBY[r.id]&&!forts.some(p=>p.source_row===r.id)&&!(PROFILES_OF[r.id]||[]).some(x=>x.p.quang_ngai_registry)));
  Object.entries(rowPts).forEach(([k, pt]) => {
    const sel = selected && selected.type === 'R' && pt.rows.some(r => r.id === selected.id);
    const types = [...new Set(pt.all.map(symbolOf))];
    const rowSymbol = types.length === 1 ? types[0] : 'mixed';
    const m = L.marker([pt.lat, pt.lon], {icon: L.divIcon({className: 'rp symbol-' + rowSymbol + (sel ? ' sel' : ''), html: `<i class="atlas-marker symbol-${rowSymbol} ${esc(pt.cls)}">${SYMBOLS.html(rowSymbol,'',false,pt.cls==='nhap'?'':'ung_vien')}</i>`, iconSize: [14, 14]}), keyboard: true});
    const names = pt.all.map(r => `${r.id} ${r.name}`).join('; ');
    const tip = `${pt.imp ? 'Tọa độ đã nhập' : 'Điểm KMZ “' + pt.name + '”'} — ${names}` + (pt.imp ? '' : ' · đề xuất, chưa duyệt');
    m.bindTooltip(esc(tip), {direction: 'top'});
    m.on('click', () => {
      if (pt.all.length === 1) return chooseRow(pt.all[0], {move: false, focus: true});
      const html = `<b>${esc(pt.name)}</b><br><span class="acc">Một điểm, ${pt.all.length} dòng nguồn:</span><br>` + pt.all.map(r => `<button type="button" class="linkbtn" data-row="${esc(r.id)}">${esc(r.id)} · ${esc(r.name)} (${esc(r.address_source || r.province_source)})</button>`).join('<br>');
      m.bindPopup(html).openPopup();
    });
    m.on('add', () => { const el = m.getElement(); if (el) { el.setAttribute('role', 'button'); el.setAttribute('aria-label', tip); el.removeAttribute('title'); } });
    m.addTo(rowLayer); pt.rows.forEach(r => { (rowMarkers[r.id] = rowMarkers[r.id] || []).push(m); });
  });
  rowLayer.addTo(map);
}
if (map) map.on('popupopen', e => {$$('[data-row]', e.popup.getElement()).forEach(b => b.onclick = () => { map.closePopup(); chooseRow(RBY[b.dataset.row], {move: false, focus: true}); });$$('[data-place]',e.popup.getElement()).forEach(b=>b.onclick=()=>{map.closePopup();choose(DBY[b.dataset.place],{focus:true});});});

function fitTo(latlngs, animate = false, maxZoom = 13) {
  if (!map || !latlngs.length) return;
  const b = L.latLngBounds(latlngs);
  const panelOpen = !$('#detail').hidden && !isNarrow();
  const right = panelOpen ? $('#detail').offsetWidth + 50 : 50;
  // On phones, fit into the visible space below the toolbar, not behind it.
  const phone = phoneLayout.matches;
  const toolbar = document.querySelector('.trial-toolbar');
  const toolbarVisible = toolbar && getComputedStyle(toolbar).visibility !== 'hidden';
  const mapTop = $('#map').getBoundingClientRect().top;
  const top = phone ? (toolbarVisible ? Math.max(16, toolbar.getBoundingClientRect().bottom - mapTop + 12) : document.body.classList.contains('phone-map-focus') ? 20 : Math.max(20, document.querySelector('header').getBoundingClientRect().bottom - mapTop + 65)) : 80;
  map.fitBounds(b, {paddingTopLeft: [phone ? 20 : 50, top], paddingBottomRight: [phone ? 20 : right, phone ? 52 : 70], maxZoom, animate: animate && !reduceMotion});
}
const regionalPlaces = list => list.filter(p => p.map_scope !== 'overseas');
const placeLatLngs = list => list.flatMap(p=>displayLocs(p).map(l=>[l.lat,l.lon]));
function overviewLatLngs(list) {
  const localPoints = placeLatLngs(regionalPlaces(list));
  return localPoints.length ? localPoints : placeLatLngs(list);
}

/* ---------- Chú giải ---------- */
function renderLegend() {
  const counts = {}, sec = {};
  const symbols = uniq(DISPLAY.filter(p=>inWorkspace(p)).map(symbolOf));
  DISPLAY.filter(p=>inWorkspace(p)).forEach(p => { const s = primaryLoc(p).status; counts[s] = (counts[s] || 0) + 1; });
  if (research) places.filter(layerVisible).forEach(p => secondaryLocs(p).filter(l=>l.map_visible!==false).forEach(l => { sec[l.status] = (sec[l.status] || 0) + 1; }));
  const keys = Object.keys(V.coord_status).filter(k => counts[k] || sec[k]);
  let h = '<h3>Ký hiệu địa điểm</h3>' + symbols.map(k => `<div><span class="sw mk atlas-marker symbol-${k}" aria-hidden="true">${SYMBOLS.html(k)}</span><span>${esc(symbolLabel(k))}</span></div>`).join('') + '<div><span class="sw sacred-number">1</span><span>Thánh địa · nền đỏ, số trắng</span></div>' + '<div><span class="sw mk atlas-marker symbol-phe_tich important-ruin" aria-hidden="true">'+SYMBOLS.html('phe_tich','3')+'</span><span>Phế tích quan trọng · nền đỏ, số trắng (Đồng Dương)</span></div>' + '<p class="acc">Màu biểu thị loại địa điểm. Quầng vàng đánh dấu mục đang chọn.</p><h3>Mức kiểm tọa độ — nét viền</h3>' + keys.map(k =>
    `<div><span class="sw coord-only ${esc(k)}"></span><span>${esc(V.coord_status[k].label)}${counts[k] ? ' · ' + counts[k] + ' hồ sơ' : ''}${sec[k] ? ` · ${sec[k]} điểm phụ` : ''}</span></div>`).join('');
  if (research && hasChampaSources()) {
    const pts = Object.values(rowPts), c = {};
    pts.forEach(pt => { c[pt.cls] = (c[pt.cls] || 0) + 1; });
    if (showRows) h += ['ung_vien_duy_nhat', 'nhieu_ung_vien_can_chon', 'mot_diem_cho_nhieu_dong', 'cho_giai_quyet_V-001', 'nhap'].filter(k => c[k]).map(k =>
      `<div><span class="sw d ${esc(k)}"></span><span>${esc(k === 'nhap' ? 'Tọa độ đã nhập' : KMZ_LABEL[k])} · ${c[k]} điểm</span></div>`).join('') +
      '<div><span class="acc">Điểm nhỏ: liên kết theo tên, chưa duyệt — không dùng làm tọa độ khảo sát. Điểm gom nhiều loại được để trống màu.</span></div>';
  }
  $('#legend').innerHTML = h;
  const convention=$('#symbolConvention');if(convention)convention.innerHTML='<summary>Ký hiệu</summary><div class="sidebar-tool-panel"><div class="symbol-key-grid">'+symbols.map(k=>'<span><i class="atlas-marker symbol-'+k+'" aria-hidden="true">'+SYMBOLS.html(k)+'</i>'+esc(symbolLabel(k))+(k==='sa_huynh'?' · S1, S2…':k==='bao_tang'?' · B1, B2…':k==='canh_quan'?' · L1, L2…':'')+'</span>').join('')+'<span><i class="atlas-marker symbol-di_tich" aria-hidden="true">'+SYMBOLS.html('di_tich','1',true)+'</i>Thánh địa · nền đỏ, số trắng</span><span><i class="atlas-marker symbol-phe_tich important-ruin" aria-hidden="true">'+SYMBOLS.html('phe_tich','3')+'</i>Phế tích quan trọng · đỏ, số trắng</span><span><i class="cluster-key" aria-hidden="true">3</i>Nhóm hồ sơ · phóng gần để tách</span></div><p class="acc">Hình ký hiệu biểu thị loại địa điểm; núi và sông chỉ hiện khi có hồ sơ. Quầng vàng: đang chọn.</p></div>';
  $('#maptopTitle').textContent = workspaceText('vi')[0];
  $('#maptopNote').textContent = 'Tọa độ thập phân · vĩ độ, kinh độ (WGS 84).';
}

/* ---------- Danh sách ---------- */
function renderPlaces() {
  const list = filteredPlaces();
  $('#pcount').textContent = `${String(list.length).padStart(2, '0')} / ${DISPLAY.filter(p=>inWorkspace(p)).length} hồ sơ`;
  const box = $('#plist'); box.innerHTML = '';
  const frag = document.createDocumentFragment();
  list.forEach(p => {
    const li = document.createElement('div'); li.setAttribute('role', 'listitem');
    const b = document.createElement('button'); b.type = 'button'; b.className = 'card';
    if (selected && selected.id === p.id) b.setAttribute('aria-current', 'true');
    const locs=displayLocs(p),st=locs[0]?.status||'chua_dinh_vi';
    b.innerHTML = `<span class="num ${markerClasses(p)} ${esc(st)}" aria-hidden="true">${SYMBOLS.html(symbolOf(p),placeCode(p),SYMBOLS.sacred(p),st)}</span><span><b>${esc(p.name)}</b><small>${esc(p.kind)} · ${esc(adminShort(p))}</small><small class="place-coordinates">${locs.length===1?esc(decimalCoords(locs[0]))+' · '+esc(statusOf(locs[0].status).short||statusOf(locs[0].status).label):locs.length?locs.length+' vị trí trong hồ sơ':'Chờ tọa độ'}</small></span>`;
    b.onclick = () => choose(p, {focus: true});
    li.append(b); frag.append(li);
  });
  box.append(frag);
  if (!list.length && !document.body.classList.contains('workspace-empty')) {
    box.innerHTML = '<div class="empty">Không tìm thấy hồ sơ. Thử đổi từ khóa, lớp bản đồ hoặc bộ lọc.</div>';
  }
  if (map) {
    drawPlaceGroups(list);
    const key = list.map(p => p.id).join(',');
    if (key !== lastKey) { if (lastKey && tab === 'P') fitTo(overviewLatLngs(list), true); lastKey = key; }
  }
  return list;
}
let lastRowKey = '';
function renderRows() {
  const list = filteredRows();
  $('#rcount').textContent = `${list.length} / ${ROWS.length} dòng nguồn` + (list.length === ROWS.length ? ' (21 dòng nhóm tháp + 127 dòng phế tích; hai bảng không cộng làm “tổng di tích”)' : '');
  const box = $('#rlist'); box.innerHTML = '';
  const frag = document.createDocumentFragment();
  list.forEach(r => {
    const li = document.createElement('div'); li.setAttribute('role', 'listitem');
    const b = document.createElement('button'); b.type = 'button'; b.className = 'card row';
    if (selected && selected.type === 'R' && selected.id === r.id) b.setAttribute('aria-current', 'true');
    const iss = research ? openIssues(r.id).length : 0;
    const northLocations = NORTH[r.id] ? northernPoints([r]) : [];
    b.innerHTML = `<span class="rid">${esc(r.id.replace('BDS-', ''))}</span><span><b>${esc(r.name)}${iss ? `<span class="flag" title="Số vấn đề đang mở">${iss} vấn đề</span>` : ''}</b><small>${esc(r.address_source || 'địa chỉ để trống')} · ${esc(r.province_source)}</small>${NORTH[r.id]?`<small>Hồ sơ Bắc Champa · ${northLocations.length===1?esc(decimalCoords(northLocations[0])):northLocations.length?northLocations.length+' vị trí cần đối chiếu':'Chờ tọa độ'}</small>`:''}${research ? `<small>${esc(KMZ_LABEL[r.kmz_link_status] || r.kmz_link_status)}${r.profile_id ? ' · có hồ sơ' : ''}</small>` : ''}</span>`;
    b.onclick = () => chooseRow(r, {focus: true});
    li.append(b); frag.append(li);
  });
  box.append(frag);
  if (!list.length) box.innerHTML = '<div class="empty">Không có dòng nguồn khớp.</div>';
  drawRows(list); drawPlaceGroups(); if (research) renderLegend();
  const key = list.map(r => r.id).join(',');
  if (map && research && showRows && key !== lastRowKey && lastRowKey && tab === 'R') {
    const ll = Object.values(rowPts).map(pt => [pt.lat, pt.lon]); if (ll.length) fitTo(ll, true);
  }
  lastRowKey = key;
  return list;
}
const onFilter = () => { renderPlaces(); renderRows(); };
['#search', '#kind', '#kindStatus', '#theme', '#dateQuery', '#inscriptionQuery', '#coord', '#evidence', '#oldprov', '#rprov', '#rprov25', '#rtable', '#rkmz', '#rissue'].forEach(s => $(s).addEventListener('input', onFilter));

/* ---------- Hồ sơ biên soạn ---------- */
const srcLine = id => {
  const s = SRC[id]; if (!s) return '';
  const link = s.access === 'noi_bo' && !research ? '' : (s.url ? ` <a href="${safeHref(s.url)}" target="_blank" rel="noopener noreferrer">mở ↗</a>` : '');
  const meta = research ? `<br><span class="acc">${esc(V.access[s.access] || s.access)} · ${esc(V.read_level[s.read_level] || '')}${s.checked ? ' · kiểm ' + esc(s.checked) : ''}${s.note ? ' · ' + esc(s.note) : ''}</span>` : (s.access === 'noi_bo' ? ' <span class="acc">(tài liệu nội bộ, chưa công khai)</span>' : '');
  return `<li>${esc(s.citation)}${link}${meta} · ${entityLink("source", id, "Xem liên kết hồ sơ")}</li>`;
};
const srcShort = ids => (ids || []).filter(Boolean).map(id => SRC[id] ? esc(SRC[id].short) : (WF[id] ? 'hồ sơ nội bộ “' + esc(WF[id].title) + '”' : esc(id))).join('; ') || 'chưa có nguồn';
const rowBtn = (id, extra = '') => RBY[id] ? `<button type="button" class="linkbtn" data-row="${esc(id)}">${esc(id)} · ${esc(RBY[id].name)}</button>${extra}` : esc(id);
const placeBtn = p => `<button type="button" class="linkbtn" data-place="${esc(p.id)}">${esc(placeCode(p))}. ${esc(p.name)}</button>`;

/* ---------- Mạng liên kết có định danh ---------- */
const entityKey = s => s.type === 'E' ? `entity:${s.kind}:${s.id}` : s.id;
const ENTITY_RECORDS = {object:OBJ, inscription:INS, source:SRC};
function entityRecord(kind,id) {
 const records=Object.hasOwn(ENTITY_RECORDS,kind)?ENTITY_RECORDS[kind]:null;
 return records&&Object.hasOwn(records,id)?records[id]:null;
}
const entityLink = (kind, id, label) => `<a class="network-link" href="#${esc('entity:'+kind+':'+id)}" data-entity-kind="${esc(kind)}" data-entity-id="${esc(id)}">${esc(label || entityRecord(kind,id)?.name || entityRecord(kind,id)?.short || id)}</a>`;
function evidenceLink(id, locator) {
 const source = SRC[id];
 if (!source || source.access === 'noi_bo') return '';
 const label = [source.short || id, locator].filter(Boolean).join(' · ');
 return entityLink('source', id, label);
}
const sourceKey = id => SRC[id]?.url ? SRC[id].url.replace(/#.*$/, '').replace(/\/$/, '') : 'id:'+id;
let sourceUsers;
function getSourceUsers() {
 if(sourceUsers)return sourceUsers;
 const byPlace=new Map(),byEntity=new Map();
 function index(target,ids,record) {
  for(const key of new Set(ids.map(sourceKey))){
   if(!target.has(key))target.set(key,[]);
   target.get(key).push(record);
  }
 }
 for(const p of places){
  index(byPlace,[...(p.sources||[]),...(p.objects||[]).flatMap(id=>OBJ[id]?.sources||[]),...inscriptionIds(p).flatMap(id=>INS[id]?.sources||[])],p);
 }
 for(const kind of ['object','inscription']){
  for(const t of Object.values(ENTITY_RECORDS[kind]))index(byEntity,t.sources||[],{id:t.id,kind,name:t.name});
 }
 sourceUsers={byPlace,byEntity};
 return sourceUsers;
}
function relatedPlaceLinks(p) {
 const direct=p.related_sources;
 if (!direct) {
  const {byPlace}=getSourceUsers();
  const matches=new Set((p.sources||[]).flatMap(id=>byPlace.get(sourceKey(id))||[]));
  const buttons=places.filter(other=>other.id!==p.id && matches.has(other)).map(placeBtn).join('');
  return buttons ? '<div class="network-links">'+buttons+'</div>' : '';
 }
 const sourceIds=Object.keys(direct);
 const layers=layersOf(p);
 const related=places.filter(other=>other.id!==p.id && other.related_sources &&
  layersOf(other).some(layer=>layers.includes(layer)))
  .map(other=>({other,shared:sourceIds.filter(id=>Object.hasOwn(other.related_sources,id))}))
  .filter(({shared})=>shared.length)
  .sort((a,b)=>sourceIds.indexOf(a.shared[0])-sourceIds.indexOf(b.shared[0]) ||
   b.shared.length-a.shared.length || a.other.name.localeCompare(b.other.name,'vi'));
 if (!related.length) return '';
 return '<ul>'+related.map(({other,shared})=>'<li>'+placeBtn(other)+'<br><span class="acc">'+
  shared.map(id=>evidenceLink(id,other.related_sources[id])).join(' · ')+'</span></li>').join('')+'</ul>';
}
function networkForPlace(p) {
 const objects=(p.objects||[]).filter(id=>OBJ[id]), inscriptions=inscriptionIds(p);
 const related=relatedPlaceLinks(p);
 return `<details class="sec network-section" open><summary>Liên kết hồ sơ</summary><p class="acc">Theo dõi hiện vật, bi ký và tài liệu từ hồ sơ này.</p>${ENC?.registry['place:'+p.id] ? `<p><a href="encyclopedia/record.html?id=${encodeURIComponent(ENC.registry['place:'+p.id])}">Mục từ trong Bách Khoa ↗</a></p>` : ''}${objects.length?'<h4>Hiện vật</h4><div class="network-links">'+objects.map(id=>entityLink('object',id)).join('')+'</div>':''}${inscriptions.length?'<h4>Bi ký</h4><div class="network-links">'+inscriptions.map(id=>entityLink('inscription',id,id+' · '+INS[id].name)).join('')+'</div>':''}<h4>Tài liệu tham khảo</h4><div class="network-links">${(p.sources||[]).filter(id=>SRC[id] && (research||SRC[id].access!=='noi_bo')).map(id=>entityLink('source',id,SRC[id].short)).join('')}</div>${related?'<h4>Hồ sơ cùng sử dụng tài liệu</h4>'+related+'<p class="acc">Dùng chung tài liệu không tự chứng minh quan hệ lịch sử giữa các di tích.</p>':''}</details>`;
}
function publishedSource(id, label) {
 const source = SRC[id];
 return source?.url && source.access !== 'noi_bo'
  ? `<a href="${safeHref(source.url)}" target="_blank" rel="noopener noreferrer">${esc(label || source.short)} ↗</a>`
  : '';
}
let collectionIndex;
function getCollectionIndex() {
 if(collectionIndex)return collectionIndex;
 collectionIndex=[['object',A.objects,'object_ids','objects'],['inscription',A.inscriptions,'inscription_ids','inscriptions']]
   .flatMap(([kind,records,institutionKey,placeKey])=>records.map(record=>{
     const repositories=A.institutions.filter(m=>m.id===record.repository_id||(m[institutionKey]||[]).includes(record.id));
     const placeIds=new Set(repositories.map(m=>m.place).filter(Boolean));
     DISPLAY.filter(p=>inWorkspace(p,'bao-tang')&&(p[placeKey]||[]).includes(record.id)).forEach(p=>placeIds.add(p.id));
     const hay=norm([record.id,record.name,record.inventory,record.material,record.date,record.btc,record.btdn,record.kept,record.found,
       ...(record.alt_names||[]),...(record.inscription_ids||[])].join(' ')).replace(/\bc (\d)/g,'c$1');
     return {kind,record,repositories,placeIds,hay};
   })).sort((a,b)=>a.record.name.localeCompare(b.record.name,'vi'));
 return collectionIndex;
}
function setupCollection(host, placeId) {
 host.innerHTML=`<div class="collection-filters">
    <label>Từ khóa<input data-collection-query type="search" placeholder="Tên, số kiểm kê, chất liệu, niên đại, mã bia…"></label>
    ${placeId?'':'<label>Nơi lưu giữ<select data-collection-repository><option value="">Mọi nơi lưu giữ</option></select></label>'}
  </div>
  <p class="acc" data-collection-count role="status"></p>
  <ul class="collection-results"></ul>
  <button class="btn ghost small" type="button" data-collection-next hidden>Xem thêm</button>`;
 const query=$('[data-collection-query]',host), repo=$('[data-collection-repository]',host), more=$('[data-collection-next]',host);
 if(repo)fillSelect(repo,A.institutions.map(m=>m.id),id=>MUSEUM[id].name);
 const index=getCollectionIndex().filter(entry=>!placeId||entry.placeIds.has(placeId));
 let limit=20;
 function render(){
  const terms=norm(query.value).replace(/\bc (\d)/g,'c$1').split(' ').filter(Boolean);
  const matches=index.filter(entry=>terms.every(term=>/^c\d+[a-z]*$/.test(term) ?
      entry.hay.split(' ').some(word=>word===term) : entry.hay.includes(term))
    && (!repo?.value||entry.repositories.some(m=>m.id===repo.value)));
  $('[data-collection-count]',host).textContent=matches.length ?
    `${Math.min(matches.length,limit)} / ${matches.length} mục` : 'Không có hiện vật hoặc văn khắc phù hợp trong danh mục.';
  $('.collection-results',host).innerHTML=matches.slice(0,limit).map(({kind,record})=>{
    const label=[record.inventory || (kind==='inscription'?record.id:''),record.material,record.date,record.kept].filter(Boolean).join(' · ');
    return `<li>${entityLink(kind,record.id)}${label?`<small>${esc(label)}</small>`:''}</li>`;
  }).join('');
  more.hidden=matches.length<=limit;
 }
 function reset(){limit=20;render();}
 query.addEventListener('input',reset);
 repo?.addEventListener('change',reset);
 more.onclick=()=>{limit+=20;render();};
 render();
}
const SA_HUYNH_RESEARCH = {
  "qng-sh002": "nien-dai",
  "qng-sh008": "nien-dai",
  "sa-huynh-ky2026-199": "nien-dai",
  "qng-sh005": "canh-quan",
  "qng-sh006": "canh-quan",
  "sa-huynh-ky2026-232": "canh-quan",
  "sa-huynh-ky2026-245": "canh-quan",
  "kmz-gps-0192": "tiep-bien",
  "tra-kieu": "tiep-bien",
  "sa-huynh-ky2026-267": "tiep-bien",
  "sa-huynh-ky2026-234": "tiep-bien",
  "qng-qn040": "tiep-bien",
  "thanh-chau-sa": "tiep-bien",
  "bao-tang-tong-hop-quang-ngai": "bao-ton",
  "nha-trung-bay-van-hoa-sa-huynh": "bao-ton",
  "bao-tang-sa-huynh-champa-duy-xuyen": "bao-ton"
};
const CHAMPA_RESEARCH = {
  "thanh-co-luy-quang-tri": "dia-ly",
  "thanh-loi-hue": "lich-su",
  "tra-kieu": "lich-su",
  "kmz-gps-0192": "lich-su",
  "thanh-chau-sa": "cap-nhat",
  "qng-qn040": "cap-nhat",
  "thanh-do-ban": "lich-su",
  "my-son": "kien-truc",
  "dong-duong": "van-khac",
  "chien-dan": "kien-truc",
  "duong-long": "kien-truc",
  "po-nagar": "le-hoi",
  "po-klong-garai": "le-hoi",
  "kmz-gps-0396": "cong-dong",
  "bao-tang-dieu-khac-cham": "dieu-khac",
  "bao-tang-hai-ngoai": "dieu-khac",
  "bao-tang-my-son": "bao-ton"
};
function addWorkspaceDossierSections(body,p) {
 if(layersOf(p).includes('gieng')){
   body.querySelector('.profile-nav').insertAdjacentHTML('beforeend','<a class="topic-link topic-history" href="tong-quan-gieng-cham.html#toa-do">Đối chiếu Tổng quan Giếng Chăm</a>');
 }
 if(p.id==='khue-trung'){
   const well=document.createElement('a');
   well.className='topic-link';
   well.href=workspaceHref('gieng-cham','gieng-gps-0086');
   well.textContent='Hồ sơ Giếng Chăm Khuê Trung';
   body.querySelector('.profile-nav').append(well);
 }
 const champaSection=CHAMPA_RESEARCH[p.id];
 if(champaSection){
   const overview=document.createElement('a');
   overview.className='topic-link topic-history';
   overview.href='tong-quan-champa.html#'+champaSection;
   overview.textContent='Đối chiếu Tổng quan Champa';
   body.querySelector('.profile-nav').append(overview);
 }
 const sectionId=SA_HUYNH_RESEARCH[p.id];
 if(sectionId){
   const overview=document.createElement('a');
   overview.className='topic-link topic-history';
   overview.href='tong-quan-sa-huynh.html#'+sectionId;
   overview.textContent='Đối chiếu Tổng quan Sa Huỳnh';
   body.querySelector('.profile-nav').append(overview);
 }
 if(inWorkspace(p,'bao-tang')){
  const section=document.createElement('details');
  section.className='sec';
  section.innerHTML='<summary>Tra danh mục tại nơi lưu giữ</summary><div></div>';
  section.addEventListener('toggle',()=>{
    const host=section.lastElementChild;
    if(section.open&&!host.childElementCount)setupCollection(host,p.id);
  });
  body.querySelector('.profile-nav').after(section);
 }
 const memberships=OVERLAY_KEYS.filter(key=>inWorkspace(p,key));
 if(memberships.length>1)memberships.filter(key=>key!==workspace).forEach(key=>{
   const a=document.createElement('a');
   a.className='topic-link';
   a.href=workspaceHref(key,p.id);
   a.textContent='Xem trên bản đồ '+workspaceText('vi',key)[2];
   body.querySelector('.profile-nav').append(a);
 });
}
function museumLocation(t) {
 const museum = MUSEUM[t.repository_id];
 if (!t.kept) return '';
 const url = museum?.place && PBY[museum.place] ? '#'+museum.place : museum?.catalogue_url || t.repository_url;
 return `<b>Nơi lưu giữ:</b> ${url ? `<a href="${safeHref(url)}">${esc(t.kept)} →</a>` : esc(t.kept)}`;
}
function entitySourceList(t, refs) {
 const rows = refs.map(id => {
  const locators = (t.source_locators || []).filter(ref => ref.source_id === id).map(ref => ref.locator);
  return `<li>${publishedSource(id) || entityLink('source',id,SRC[id].short)}${locators.length ? `<br><span class="acc">${esc(locators.join(' · '))}</span>` : ''}</li>`;
 });
 return rows.length ? '<h3>Nguồn trích dẫn</h3><ul>'+rows.join('')+'</ul>' : '';
}
const inscriptionLabels = {
 vi:{heading:'Văn khắc', content:'Nội dung văn khắc', summary:'Tóm lược từ bản đọc và bản dịch', excerpt:'Dịch đoạn chọn hoặc văn bản ngắn', reading:'Ghi chú bản đọc và hiện vật', regional:'Đối chiếu khu vực', transfer:'Nơi từng chuyển đến', collection:'Hồ sơ bộ sưu tập', source:'Ấn bản đối chiếu', locator:'Đoạn đối chiếu', encyclopedia:'Mục từ Bách khoa'},
 en:{heading:'Inscriptions', content:'Inscription text', summary:'Summary of the edition and translation', excerpt:'Translation of a selected passage or short text', reading:'Notes on the reading and object', regional:'Regional comparison', transfer:'Former location', collection:'Collection record', source:'Editions and references', locator:'Passage consulted', encyclopedia:'Encyclopedia entry'}
};
const inscriptionLanguage = () => window.CHAMPA_I18N?.language() || 'vi';
const regionalInscriptionNotes = {
 'mieu-ba-khue-trung': {vi:'Hóa Quê là địa bàn lịch sử. Vị trí phát hiện cụ thể của C.142 chưa xác định.',en:'Hóa Quê is the historical locality. The exact findspot of C.142 is undetermined.'},
 'thanh-hoa-chau': {vi:'C.112 thuộc Phú Lương. Niên đại văn khắc không định niên đại khởi dựng thành Hóa Châu.',en:'C.112 belongs to Phú Lương. Its date does not establish when Hóa Châu Citadel was founded.'},
 'thanh-ho': {vi:'C.41 khắc trên vách đá Chợ Dinh. Dẫn ở đây để đối chiếu khu vực.',en:'C.41 is carved on the cliff at Chợ Dinh and is cited here for regional comparison.'},
 'kmz-gps-0536': {vi:'Hai hiện vật có xuất xứ Drang Lai và từng được chuyển qua Yang Mum.',en:'Both objects originated at Drang Lai and were moved to Yang Mum.'},
 'kmz-gps-0175': {vi:'Dẫn theo cụm Chiêm Sơn. Hai minh văn chưa được xác lập là phát hiện trong hố khai quật Triền Tranh.',en:'Cited for the Chiêm Sơn area. Neither inscription is documented as a find from the Triền Tranh excavation trench.'}
};
function inscriptionReading(t) {
 const entry=INSCRIPTION_CONTENT[t.id];
 if(!entry)return t.content?`<p>${esc(t.content)}</p>`:'';
 const lang=inscriptionLanguage(), labels=inscriptionLabels[lang];
 const id=ENC?.registry['inscription:'+t.id];
 const sources=entry.sources.map(ref=>`<li><a href="${safeHref(ref.url)}" target="_blank" rel="noopener noreferrer">${esc(ref.label)} ↗</a></li>`).join('');
 const encyclopedia=id?`<a href="encyclopedia/record.html?id=${encodeURIComponent(id)}${lang==='en'?'&amp;lang=en':''}">${labels.encyclopedia} ↗</a>`:'';
 return `<div class="inscription-reading" data-localized-inscription lang="${lang}">
   <p class="acc">${labels[entry.kind]}</p><p>${esc(entry[lang])}</p>
   <p class="acc">${labels.locator} · ${esc(entry.locator)}</p>
   <div class="inscription-references"><b>${labels.source}</b><ul>${sources}</ul>${encyclopedia}</div>
 </div>`;
}
function placeInscriptions(p) {
 const ids=inscriptionIds(p);
 if(!ids.length)return '';
 const lang=inscriptionLanguage(), labels=inscriptionLabels[lang];
 const regional=new Set(p.regional_inscriptions||[]);
 const collection=A.institutions.some(m=>m.place===p.id)||inWorkspace(p,'bao-tang');
 const rows=ids.map(id=>{
  const t=INS[id];
  const role=regional.has(id)?(p.id==='kmz-gps-0536'?labels.transfer:labels.regional):collection?labels.collection:'';
  return `<article class="inscription-card" data-inscription-code="${esc(id)}" data-inscription-relation="${regional.has(id)?'regional':collection?'collection':'site'}">
   <h3>${entityLink('inscription',id,t.name.includes(id)?t.name:id+' · '+t.name)}</h3>
   ${role?`<p class="acc">${role}${regional.has(id)&&regionalInscriptionNotes[p.id]?' · '+esc(regionalInscriptionNotes[p.id][lang]):''}</p>`:''}${inscriptionReading(t)}
  </article>`;
 }).join('');
 return `<details class="sec profile-inscriptions" data-localized-inscription lang="${lang}"><summary>${labels.heading} (${ids.length})</summary>${rows}</details>`;
}
function renderEntity(sel) {
 const t=entityRecord(sel.kind,sel.id);if(!t)return '';
 const photoSrc=t.photo_src || (sel.kind==='object'?PBY[t.place]?.photos?.find(photo=>photo.object_id===t.id)?.src:null);
 const epigraphs=sel.kind==='object'?(t.inscription_ids||[]).filter(id=>INS[id]).map(id=>INS[id]):[];
 const carrier=sel.kind==='inscription' && OBJ[t.carrier_object_id];
 const origin=PBY[t.place];
 const isSource=sel.kind==='source';
 const users=isSource?getSourceUsers():null;
 const related=users?(users.byPlace.get(sourceKey(t.id))||[]):places.filter(p=>(sel.kind==='object'?(p.objects||[]):inscriptionIds(p)).includes(t.id)||p.id===t.place);
 const refs=(t.sources||[]).filter(id=>SRC[id] && (research||SRC[id].access!=='noi_bo'));
 const peers=users?.byEntity.get(sourceKey(t.id))||[];
 const reading=sel.kind==='inscription'&&INSCRIPTION_CONTENT[t.id];
 const inscriptionSection=reading?`<section class="entity-inscription" data-localized-inscription lang="${inscriptionLanguage()}"><h3>${inscriptionLabels[inscriptionLanguage()].content}</h3>${inscriptionReading(t)}</section>`:'';
 return `<button class="close" type="button" aria-label="Đóng hồ sơ">×</button><div class="dbody"><span class="eyebrow">${esc(({object:'HIỆN VẬT',inscription:'BI KÝ',source:'TÀI LIỆU THAM KHẢO'})[sel.kind])}</span><h2 id="dTitle" tabindex="-1">${esc(t.name||t.short||t.id)}</h2>${sel.kind==='inscription'?'<p class="acc">'+esc(t.id)+'</p>':''}${photoSrc?`<figure class="entity-photo"><a href="${safeHref(photoSrc)}" target="_blank" rel="noopener noreferrer"><img src="${safeHref(photoSrc)}" alt="${esc(t.name)}"></a><figcaption>Ảnh: Lê Trí Công</figcaption></figure>`:''}${t.citation?'<p>'+esc(t.citation)+'</p>':''}${t.date?'<p><b>Niên đại:</b> '+esc(t.date)+'</p>':''}${t.inventory?'<p><b>Số kiểm kê / ký hiệu:</b> '+esc(t.inventory)+'</p>':''}${inscriptionSection||(t.content?'<p>'+esc(t.content)+'</p>':'')}${t.found?`<p><b>Nơi tìm thấy:</b> ${esc(t.found)}${origin ? ` · <a href="#${esc(origin.id)}">Hồ sơ ${esc(origin.name)} →</a>` : ''}</p>`:''}${t.kept?'<p>'+museumLocation(t)+'</p>':''}${t.note?'<p class="notice">'+esc(t.note)+'</p>':''}${t.museum_efeo_url ? `<p><a href="${safeHref(t.museum_efeo_url)}">Đối chiếu hồ sơ EFEO ↗</a></p>` : ''}${t.url && t.access!=='noi_bo'?`<p><a class="btn" href="${safeHref(t.url)}" target="_blank" rel="noopener noreferrer">Mở tài liệu gốc ↗</a></p>`:''}${t.museum_gallery_url?`<p><a class="btn" href="${safeHref(t.museum_gallery_url)}">${esc(t.museum_gallery_label)} · Bảo tàng Điêu khắc Chăm →</a></p>`:''}${t.repository_url?`<p><a href="${safeHref(t.repository_url)}" target="_blank" rel="noopener noreferrer">Bộ sưu tập tại bảo tàng ↗</a></p>`:''}${carrier ? `<p><b>Vật mang chữ:</b> ${entityLink('object',carrier.id,carrier.name)}</p>` : ''}${epigraphs.length?'<h3>Văn khắc trên hiện vật</h3><div class="network-links">'+epigraphs.map(i=>entityLink('inscription',i.id,i.id+' · '+i.name)).join('')+'</div>':''}<h3>Hồ sơ có liên kết</h3><div class="network-links">${related.map(placeBtn).join('')||'<p>Chưa có hồ sơ liên kết.</p>'}</div>${entitySourceList(t,refs)}${peers.length?'<h3>Hiện vật và bi ký sử dụng tài liệu</h3><div class="network-links">'+peers.map(o=>entityLink(o.kind,o.id,o.name)).join('')+'</div>':''}<div class="actions"><button class="btn ghost" type="button" id="share">Sao chép liên kết</button><button class="btn ghost backmap" type="button" id="backmap">Về bản đồ</button></div></div>`;
}
function chooseEntity(kind,id) {if(entityRecord(kind,id))openPanel({type:'E',kind,id},{focus:true});}
function linkNumberedCitations(d,p) {
 if(!p?.reference_ids)return;
 const refs=p.reference_ids;
 d.querySelectorAll('.myson-article p').forEach(el=>{
  const m=el.textContent.match(/^\[(\d+)\]\s/);if(m&&refs[m[1]]){el.id='ref-'+p.id+'-'+m[1];el.insertAdjacentHTML('beforeend',' '+entityLink('source',refs[m[1]],'Xem liên kết hồ sơ ↗'));}
 });
 const walker=document.createTreeWalker(d,NodeFilter.SHOW_TEXT),nodes=[];
 while(walker.nextNode()) {const n=walker.currentNode;if(n.parentElement.closest('a,button,.network-section,.src,[data-localized-inscription]')||n.parentElement.closest('[id^="ref-"]'))continue;if(/\[\d[\d\s;–,\-]*\]/.test(n.textContent))nodes.push(n);}
 nodes.forEach(n=>{const text=n.textContent;const out=esc(text).replace(/\[(\d[\d\s;–,\-]*)\]/g,(whole,inside)=>{const nums=[];for(const part of inside.split(/[;,]/)){const range=part.trim().match(/^(\d+)\s*[–-]\s*(\d+)$/);if(range&&+range[2]-+range[1]<30){for(let i=+range[1];i<=+range[2];i++)nums.push(i);}else if(/^\d+$/.test(part.trim()))nums.push(+part.trim());}if(!nums.length||nums.some(i=>!refs[i]))return esc(whole);return '['+nums.map(i=>entityLink('source',refs[i],String(i))).join('; ')+']';});const span=document.createElement('span');span.innerHTML=out;n.replaceWith(span);});
}

function linkInscriptionMentions(d) {
 const walker=document.createTreeWalker(d,NodeFilter.SHOW_TEXT),nodes=[];
 while(walker.nextNode()){const n=walker.currentNode;if(n.parentElement.closest('a,button,.network-section,.src,[data-localized-inscription],[id^="ref-"]'))continue;if(/C\.\d/.test(n.textContent))nodes.push(n);}
 nodes.forEach(n=>{
  const out=esc(n.textContent).replace(/\b(C\.\d+(?:[A-Z]|\.\d+)?)([ \u00a0]+[A-Z]\d*(?![\w.]))?/g,(full,code,suffix)=>{
   const id=suffix?code+' '+suffix.trim():code;
   if(entityRecord('inscription',id))return entityLink('inscription',id,full);
   return entityRecord('inscription',code)?entityLink('inscription',code,code)+(suffix||''):full;
  });
  const span=document.createElement('span');span.innerHTML=out;n.replaceWith(span);
 });
}
function spatialConservationPanel(p) {
 const boundaries=(p.spatial_geometries||[]).filter(x=>['Polygon','MultiPolygon'].includes(x?.geometry?.type));
 const conservation=p.conservation;
 const boundaryText=boundaries.length?`${boundaries.length} đường bao có dữ liệu cấu trúc`:'Chưa có đường bao có chứng cứ';
 const conservationText=conservation?(conservation.condition||'Đã có bản ghi, cần xem chi tiết'):'Chưa đánh giá có cấu trúc';
 const risk=conservation?.risk_level||'unknown';
 return `<details class="sec spatial-conservation" open><summary>Không gian &amp; bảo tồn</summary>
   <div class="exchange-status-grid"><div><span class="exchange-label">Phạm vi không gian</span><b>${esc(boundaryText)}</b><p>Điểm trên bản đồ là điểm đại diện hoặc mốc đối chiếu, không phải đường bao di tích.</p></div>
   <div><span class="exchange-label">Tình trạng bảo tồn</span><b>${esc(conservationText)}</b><p>Mức rủi ro: ${esc(risk)}. “Chưa đánh giá” không có nghĩa là không có rủi ro.</p></div></div>
   <p class="exchange-links"><a href="open-data/heritage-atlas.json#place/${encodeURIComponent(p.id)}">Bản ghi trao đổi ↗</a> · <a href="open-data/release.json">Phiên bản và SHA-256 ↗</a></p>
 </details>`;
}
function renderPlace(p) {
  const loc = primaryLoc(p), st = statusOf(loc.status);
  const dates = (p.dating || []).filter(d => research || !d.research_only).map(d => {
    const reference = research && evidenceLink(d.source, d.locator);
    return `<div class="date"><b>${esc(V.date_kind[d.kind] || d.kind)}: ${esc(d.label)}</b><span>${esc(d.basis || '')}</span>${reference ? `<div class="date-reference">${reference}</div>` : ''}</div>`;
  }).join('');
  const structures = (p.structures || []).map(id => ST[id]).filter(Boolean);
  const things = (p.objects || []).map(id => OBJ[id]).filter(Boolean);
  const pubSources = p.sources || [];
  const isWell = layersOf(p).includes('gieng');
  const gmQuery = hasLocation(loc) && (isWell || st.rank >= 2) ? `${loc.lat},${loc.lon}` : `${p.name}, ${p.admin.current || p.admin.former}`;
  const gmUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(gmQuery)}`;
  const rel = [...(p.corpus_ids || []).map(c => rowBtn(c, ' <span class="acc">(cùng di tích — đề xuất)</span>')), ...(p.corpus_related || []).map(c => rowBtn(c, ' <span class="acc">(địa điểm liên quan, không đồng nhất)</span>'))];

  let h = `<button class="close" type="button" aria-label="Đóng hồ sơ">×</button><div class="dbody" data-place="${esc(p.id)}">
  <span class="eyebrow">${esc(placeCode(p))} · ${esc(p.kind.toUpperCase())}</span>
  <h2 id="dTitle" tabindex="-1">${esc(p.name)}</h2>
  ${p.alt_names && p.alt_names.length ? `<div class="alt">Tên khác: ${p.alt_names.map(esc).join(', ')}</div>` : ''}
  <nav class="topic-nav" aria-label="Chủ đề hồ sơ"></nav>
  <p class="admin"><b>${p.map_scope === 'overseas' ? 'Địa chỉ điểm đại diện' : 'Hành chính hiện nay'}:</b> ${esc(p.admin.current || 'chưa xác nhận')}${research && p.admin.current_note ? ` <span class="acc">(${esc(p.admin.current_note)} Nguồn: ${srcShort([p.admin.current_source])})</span>` : ''}${p.admin.former ? `<br><b>Trước 7/2025:</b> ${esc(p.admin.former)}` : ''}${p.admin.historical ? `<br><b>Địa danh lịch sử:</b> ${esc(p.admin.historical)}${p.admin.historical_locator ? ` <span class="acc">(${esc(p.admin.historical_locator)})</span>` : ''}` : ''}</p>
  ${!hasLocation(loc) && !isWell ? '<div class="directions-link"><p class="acc">Hồ sơ tra cứu · Chưa xác nhận tọa độ để ghim hoặc dẫn đường.</p></div>' : p.directions_enabled === false && !isWell ? `<div class="directions-link"><p class="acc">${esc(decimalCoords(loc))} · ${esc(p.directions_note || "Điểm đại diện cảnh quan.")}</p></div>` : `<div class="directions-link"><a class="google-maps-link" href="${safeHref(gmUrl)}" target="_blank" rel="noopener noreferrer" aria-label="Mở ${esc(p.name)} bằng Google Maps"><img src="assets/branding/google-maps-app.webp" alt="" width="30" height="30">Google Maps ↗</a><p class="acc">${isWell ? (hasLocation(loc) ? esc(decimalCoords(loc)) + ' · ' + esc(p.directions_note || statusOf(loc.status).label) : 'Tìm theo tên giếng; hồ sơ chưa có tọa độ được xác nhận.') : esc(decimalCoords(loc)) + (st.rank < 2 ? ' · Vị trí minh họa; tìm đường theo tên di tích.' : '')}</p></div>`}
  <p class="subtitle">${esc(p.subtitle)}</p>
  <div class="dates">${dates}</div>
  <p class="lead">${esc(publicGpsCredit(p.intro))}</p>
  ${research ? spatialConservationPanel(p) : ''}
  <nav class="profile-nav" aria-label="Đọc hồ sơ">${(p.map_symbol === 'sa_huynh' || ['kmz-gps-0192', 'tra-kieu', 'bao-tang-sa-huynh-champa-duy-xuyen'].includes(p.id)) ? '<a class="topic-link topic-history" href="tong-quan-sa-huynh.html#ho-so">Tổng quan Sa Huỳnh ↗</a>' : ''}${p.museum_crosscheck_url ? `<a class="topic-link topic-sculpture" href="${safeHref(p.museum_crosscheck_url)}">Đối chiếu giữa các bảo tàng ↗</a>` : ''}${p.museum_efeo_url ? `<a class="topic-link topic-sculpture" href="${safeHref(p.museum_efeo_url)}">Đối chiếu hồ sơ EFEO ↗</a>` : ''}${p.overseas_museum_url ? `<a class="topic-link topic-sculpture" href="${safeHref(p.overseas_museum_url)}">Bảo tàng Hải ngoại ↗</a>` : ''}</nav>
  ${p.article_html ? `<details class="sec full-dossier" ${research?'open':''}><summary>Hồ sơ đầy đủ</summary><div lang="vi">${CORE.sanitizeHTML(publicGpsCredit(p.article_html))}</div></details>` : ''}
  ${research ? networkForPlace(p) : ''}
  ${p.photos && p.photos.length ? `<details class="sec" open><summary>Ảnh và tổng mặt bằng (${p.photos.length})</summary><div class="heritage-gallery">${p.photos.map((photo, photoIndex) => {
    const href = safeHref(photo.src);
    const image = `<img src="${safeHref(photo.thumbnail || photo.src, {allowDataImage: true})}" alt="${esc(photo.alt)}" loading="lazy" decoding="async"${photo.width && photo.height ? ` width="${photo.width}" height="${photo.height}"` : ''}>`;
    const media = href ? `<a href="${href}" target="_blank" rel="noopener noreferrer" aria-label="Mở ảnh ${esc(photo.title)}">${image}</a>` : image;
    return `<figure${photo.object_id ? ` id="photo-${esc(photo.object_id)}${p.photos.findIndex(x => x.object_id === photo.object_id) === photoIndex ? '' : '-' + photoIndex}"` : ''}>${media}<figcaption><b>${esc(photo.title)}</b><br><span>${esc(photo.credit)}</span>${photo.caption ? `<br><span>${esc(photo.caption)}</span>` : ''}${photo.source_url || /\bEFEO\b/i.test(photo.credit || "") ? `<br><a href="${safeHref(photo.source_url || "https://collection.efeo.fr/ws/web/app/collection")}" target="_blank" rel="noopener noreferrer">${esc(photo.source_label || (/\bEFEO\b/i.test(photo.credit || "") ? "Kho ảnh EFEO" : "Nguồn ảnh"))} ↗</a>` : ""}${photo.object_id && OBJ[photo.object_id]?.museum_gallery_url ? `<br>${entityLink('object',photo.object_id,'Hồ sơ hiện vật · '+OBJ[photo.object_id].inventory)}<br><a href="${safeHref(OBJ[photo.object_id].museum_gallery_url)}">${esc(OBJ[photo.object_id].museum_gallery_label)} · Bảo tàng Chăm →</a>` : ''}${photo.object_id && OBJ[photo.object_id]?.repository_url ? `<br><a href="${safeHref(OBJ[photo.object_id].repository_url)}" target="_blank" rel="noopener noreferrer">Bộ sưu tập tại Bảo tàng Chăm Đà Nẵng ↗</a>` : ''}</figcaption></figure>`;
  }).join('')}</div></details>` : ''}
  ${p.more && p.more.length ? `<details class="sec"><summary>Đọc thêm về di tích</summary>${p.more.map(x => `<p>${esc(x)}</p>`).join('')}</details>` : ''}
  ${structures.length ? `<details class="sec"><summary>Công trình thành phần (${structures.length})</summary><ul>${structures.map(s => `<li><b>${esc(s.name)}</b>${s.dims ? ' — ' + esc(s.dims) : ''}${s.notes ? '<br>' + esc(s.notes) : ''}<br><span class="acc">Nguồn: ${srcShort([s.source])}${s.locator ? ', ' + esc(s.locator) : ''}</span></li>`).join('')}</ul></details>` : ''}
  ${things.length ? `<details class="sec"><summary>Hiện vật liên quan (${things.length})</summary><ul>${things.map(t => `<li><b>${entityLink('object', t.id, t.name)}</b>${t.inventory ? ' — ' + esc(t.inventory) : ''}${t.dharma && SRC[t.dharma] ? ` — <a href="${safeHref(SRC[t.dharma].url)}" target="_blank" rel="noopener noreferrer">${esc(SRC[t.dharma].short)} ↗</a>` : ''}
      ${t.languages ? `<br>Ngôn ngữ: ${esc(t.languages)} · Niên đại: ${esc(t.date)}` : ''}${t.content ? `<br>${esc(t.content)}` : ''}
      <br><b>Nơi tìm thấy:</b> ${esc(t.found || 'chưa ghi')}<br>${museumLocation(t) || '<b>Nơi lưu giữ:</b> chưa xác minh'}${t.photo_src ? `<br><a href="${safeHref(t.photo_src)}" target="_blank" rel="noopener noreferrer">Xem ảnh hiện vật ↗</a>` : ''}${t.note ? `<br><span class="acc">${esc(t.note)}</span>` : ''}</li>`).join('')}</ul></details>` : ''}
  ${placeInscriptions(p)}
  ${p.cautions && p.cautions.length ? `<details class="sec" ${research ? '' : 'open'}><summary>Điểm cần phân biệt</summary><ul>${p.cautions.map(c => `<li>${esc(c)}</li>`).join('')}</ul></details>` : ''}
  ${research && rel.length ? `<details class="sec" open><summary>Dòng nguồn trong sách (${rel.length})</summary><ul>${rel.map(x => `<li>${x}</li>`).join('')}</ul><p class="acc">Liên kết hồ sơ ↔ dòng nguồn là đề xuất của người biên soạn, chưa phải phép đồng nhất đã kiểm.</p></details>` : ''}
  <details class="sec src"><summary>Nguồn tư liệu (${pubSources.length})</summary><ul>${pubSources.map(srcLine).join('')}</ul></details>`;

  if (research) {
    h += `<details class="sec" open><summary>Mệnh đề và mức chứng cứ (${(p.claims || []).length})</summary>
      ${claimSections(p.claims || [])}</details>
    <details class="sec location-evidence"><summary>Hồ sơ vị trí (${[loc,...secondaryLocs(p)].filter(hasLocation).length})</summary>${!hasLocation(loc)?'<p>Chưa xác nhận tọa độ; không sinh điểm bản đồ.</p>':''}<dl class="kv">${[loc, ...secondaryLocs(p)].filter(hasLocation).map(l => `
      <dt>${esc(V.location_role[l.role] || l.role)}${l === loc ? ' · điểm chính' : ''}${l.imported ? ' (đã nhập)' : ''}${l.replaced ? ' (điểm cũ)' : ''} — ${esc(statusOf(l.status).label)}</dt>
      <dd>${Number(l.lat).toFixed(6)}, ${Number(l.lon).toFixed(6)}${l !== loc && hasLocation(loc) ? ' · cách điểm chính ' + fmtDist(haversine(l, loc)) : ''} · sai số: ${l.accuracy_m != null ? esc(l.accuracy_m) + ' m' : 'chưa ghi'} · nguồn: ${evidenceLink(l.source, l.locator) || (l.source ? srcShort([l.source]) : (l.file ? 'tệp ' + esc(l.file) : 'chưa có'))}
      ${l.map_visible===false?'<br><b>Mốc lưu đối chiếu; không hiển thị trên bản đồ.</b>':''}${l.imported && l.prev ? `<br>Lệch so với điểm cũ: ${fmtDist(haversine(l, l.prev))}` : ''}${l.date ? '<br>Ngày đo: ' + esc(l.date) : ''}${l.device ? ' · thiết bị: ' + esc(l.device) : ''}${l.by ? ' · người đo: ' + esc(publicGpsCredit(l.by)) : ''}${l.note ? '<br>' + esc(publicGpsCredit(l.note)) : ''}</dd>`).join('')}</dl></details>
    ${(p.working_files || []).length ? `<details class="sec"><summary>Hồ sơ làm việc nội bộ (${p.working_files.length})</summary><ul>${p.working_files.map(id => WF[id]).filter(Boolean).map(w => `<li>${w.url ? `<a href="${safeHref(w.url)}" target="_blank" rel="noopener noreferrer">${esc(w.title)} ↗</a>` : `${esc(w.title)} <span class="acc">(liên kết nội bộ không kèm bản công khai)</span>`}<br><span class="acc">${esc(w.assessment)}</span></li>`).join('')}</ul></details>` : ''}
    ${(p.next_checks || []).length ? `<details class="sec"><summary>Cần kiểm tiếp</summary><ul>${p.next_checks.map(x => `<li>${esc(x)}</li>`).join('')}</ul></details>` : ''}`;
  }
  h += `<div class="notice"><b>Tọa độ: ${esc(decimalCoords(loc))}</b><br>${hasLocation(loc)?(loc.crs_assumed?'Vĩ độ, kinh độ · Hiển thị trên nền WGS 84; datum nguồn chưa nêu':'Vĩ độ, kinh độ · WGS 84'):'Hồ sơ chưa được gắn điểm trên bản đồ.'}${hasLocation(loc) ? ' · ' + esc(st.label) : ''}</div>
  <div class="actions">
  <button class="btn ghost" type="button" id="share">Sao chép liên kết</button><button class="btn ghost backmap" type="button" id="backmap">Về bản đồ</button></div>
  </div>`;
  return h;
}

/* ---------- Dòng nguồn ---------- */
function publicGpsCredit(text) {
  return String(text ?? '')
    .replace(/(tọa độ|GPS)(?: dự án)? do Lê Trí Công cung cấp/gi, '$1 do Tác giả cung cấp')
    .replace(/điểm Lê Trí Công cung cấp/gi, 'điểm do Tác giả cung cấp')
    .replace(/^Lê Trí Công$/i, 'Tác giả');
}

function renderFort(p) {
 const locs=displayLocs(p);
 return `<button class="close" type="button" aria-label="Đóng">×</button><div class="dbody"><p class="eyebrow">PHẾ TÍCH THÀNH · HỒ SƠ ĐỊNH VỊ</p><h2 id="dTitle" tabindex="-1">${p.no}. ${esc(p.name)}</h2><p class="lead">${esc(p.intro||'Hồ sơ định vị được bổ sung từ danh mục tọa độ dự án. Phần lịch sử, các pha xây dựng và hiện trạng cần được biên soạn, đối chiếu nguồn riêng.')}</p><p>${esc(p.region)}</p><h3>Vị trí</h3>${locs.map((l,i)=>`<p>${locs.length>1?'Vị trí '+(i+1)+' · ':''}${esc(decimalCoords(l))}<br><button class="btn ghost small" data-fly="${l.lat},${l.lon}">Xem điểm trên bản đồ</button> <a class="btn ghost small" href="https://www.google.com/maps/search/?api=1&query=${l.lat},${l.lon}" target="_blank" rel="noopener noreferrer">Google Maps ↗</a></p>`).join('')||'<p>Chờ tọa độ. Chưa dùng điểm cùng tên ở tỉnh khác để thay thế.</p>'}<h3>Căn cứ và giới hạn</h3><p>${esc(publicGpsCredit(p.source_note))}</p><ul>${locs.map(l=>`<li>${esc(l.source_id)} · nhãn nguồn: ${esc(l.source_name)}</li>`).join('')}${p.sources.map(x=>`<li><a href="${safeHref(x.url)}" target="_blank" rel="noopener noreferrer">${esc(x.title)} ↗</a></li>`).join('')}</ul>${p.source_row?`<p><a href="#${esc(p.source_row)}">Dòng nguồn ${esc(p.source_row)} ↗</a></p>`:''}<p class="acc">Các điểm khảo sát đánh số quanh một thành không được tính thành các di tích riêng. Chưa xác lập đường bao thành từ các điểm ghim.</p><div class="actions"><button id="share" class="btn ghost">Sao chép liên kết</button><button id="backmap" class="btn ghost backmap">Về bản đồ</button></div></div>`;
}
function renderRow(r) {
  const links = LINKS_OF[r.id] || [], iss = ISS_OF[r.id] || [], parm = PARM_OF[r.id] || [], prof = PROFILES_OF[r.id] || [];
  const imp = imported[r.id];
  const dd = (k, v) => v == null || v === '' ? '' : `<dt>${esc(k)}</dt><dd>${v}</dd>`;
  let h = `<button class="close" type="button" aria-label="Đóng">×</button><div class="dbody">
  <span class="eyebrow">${DBY[r.id]?'HỒ SƠ DI TÍCH':'DÒNG NGUỒN'} · ${esc(r.id)} · ${esc(r.source_row_id)}</span>
  <h2 id="dTitle" tabindex="-1">${DBY[r.id]?DBY[r.id].no+'. ':''}${esc(r.name)}</h2>
  <p><a href="encyclopedia/record.html?id=${encodeURIComponent(r.id)}">Bách khoa: bài giới thiệu và nguồn tham khảo ↗</a></p>
  ${NORTH[r.id]?`<section class="north-location"><h3>Vị trí trên bản đồ</h3>${northernPoints([r]).map((pt,i)=>`<p>${northernPoints([r]).length>1?'Vị trí '+(i+1)+' · ':''}${esc(decimalCoords(pt))} <button type="button" class="btn ghost small" data-fly="${pt.lat},${pt.lon}">Xem điểm</button> <a class="btn ghost small" href="https://www.google.com/maps/search/?api=1&query=${pt.lat},${pt.lon}" target="_blank" rel="noopener noreferrer">Google Maps ↗</a></p>`).join('')||'<p>Chưa có tọa độ trong bộ hồ sơ; bài giới thiệu vẫn có thể đọc đầy đủ.</p>'}<details><summary>Căn cứ định vị</summary><p>Tọa độ WGS 84 lấy từ các liên kết vị trí hiện có của dự án, giữ nguyên từng cặp vĩ độ–kinh độ. Bản thảo 0.3.1 chưa xác minh thực địa các liên kết này; nơi có nhiều vị trí được giữ riêng để đối chiếu.</p></details></section>`:''}
  ${window.ChampaNorth?.render(r.id,{map:true})||''}
  ${r.name_raw !== r.name ? `<div class="alt">Tên trong sách: “${esc(r.name_raw)}”</div>` : ''}
  ${r.name_norm_basis ? `<div class="alt">${esc(r.name_norm_basis)}</div>` : ''}
  <div><span class="tag">${esc(TABLE_LABEL[r.table_type])}</span><span class="tag">${esc(r.category)}</span></div>
  <dl class="grid2">
    ${dd('Tỉnh theo sách', esc(r.province_source))}
    ${dd('Địa chỉ theo sách', r.address_source ? esc(r.address_source) : '<i>để trống trong nguồn</i>')}
    ${dd('Tỉnh hiện nay', esc(r.province_2025) + ' <span class="acc">(suy theo NQ 202/2025 ở cấp tỉnh; xã/phường chưa đối chiếu)</span>')}
    ${dd('Trang in', esc(r.printed_page))}
    ${r.table_type === 'nhom_thap' ? dd('Số công trình theo sách', esc(r.structure_count_source ?? '—') + ' <span class="acc">(theo quy ước đếm của sách)</span>') : ''}
    ${dd('Ghi chú của sách', r.note_source ? '“' + esc(r.note_source) + '”' : '')}
    ${dd('Tình trạng theo sách', esc(r.status_source))}
    ${dd('Tình trạng hiện nay', esc(r.status_current || 'chưa kiểm'))}
  </dl>
  ${prof.length ? `<p><b>Hồ sơ biên soạn:</b> ${prof.map(x => placeBtn(x.p) + (x.rel === 'lien_quan' ? ' <span class="acc">(liên quan, không đồng nhất)</span>' : ' <span class="acc">(đề xuất cùng di tích)</span>')).join('; ')}</p>` : ''}`;

  if (research) {
    h += `<details class="sec" open><summary>Vị trí — ứng viên KMZ (${links.length})</summary>`;
    if (imp) h += `<p><b>Tọa độ đã nhập:</b> ${Number(imp.lat).toFixed(6)}, ${Number(imp.lon).toFixed(6)} · ${esc(statusOf(imp.status).label)} · tệp ${esc(imp.file)}</p>`;
    h += links.length ? `<ul>${links.map(l => `<li><b>“${esc(l.ten_kmz)}”</b> <span class="acc">(${esc(l.tep_kmz)})</span><br>${Number(l.lat).toFixed(6)}, ${Number(l.lon).toFixed(6)} · ${esc(matchLabel(l.kieu_khop))}${l.ly_do ? ' — ' + esc(l.ly_do) : ''}
        <br><span class="acc">${l.trong_khung_tinh === 'co' ? 'trong khung tỉnh' : 'NGOÀI khung tỉnh'} · ${esc(KMZ_LABEL[l.de_xuat] || l.de_xuat)}${l.doi_chieu_nhan_kmz === 'nhan_kmz_khop_dia_chi_nguon' ? ' · nhãn KMZ khớp địa chỉ nguồn' : l.doi_chieu_nhan_kmz === 'nhan_kmz_khac_dia_chi_nguon' ? ' · nhãn KMZ KHÁC địa chỉ nguồn' : ''} · ${esc(l.trang_thai_duyet === 'chua_duyet' ? 'chưa duyệt' : l.trang_thai_duyet)} · ${esc(l.link_id)}</span>
        ${l.trong_khung_tinh === 'co' && map ? `<br><button type="button" class="btn ghost small" data-fly="${esc(l.lat)},${esc(l.lon)}">Xem điểm trên bản đồ</button>` : ''}</li>`).join('')}</ul>`
      : '<p class="acc">Bộ KMZ 533 điểm không có điểm trùng tên. Chưa gán tọa độ — không đoán.</p>';
    h += `<p class="acc">Liên kết dựa trên tên (trùng tên, trùng khi bỏ dấu, hoặc tên gần do người rà chọn có lý do), kiểm thêm khung tỉnh xấp xỉ. Chưa ai duyệt; không dùng làm tọa độ khảo sát.</p></details>`;
    if (iss.length) h += `<details class="sec" open><summary>Vấn đề (${iss.length})</summary>${iss.map(i => `<div class="claim"><b>${esc(i.issue_id)}</b> · ${esc(i.loai)} · ưu tiên ${esc(i.uu_tien)} · ${esc(i.trang_thai)}<br>${esc(i.mo_ta)}
      <small><b>Bằng chứng:</b> ${esc(i.bang_chung)}</small><small><b>Việc cần làm:</b> ${esc(i.viec_can_lam)}</small><small><b>Đóng khi:</b> ${esc(i.dieu_kien_dong)}</small></div>`).join('')}</details>`;
    if (parm.length) h += `<details class="sec"><summary>Đầu mối Parmentier — OCR (${parm.length})</summary><ul>${parm.map(x => `<li>“${esc(x.item_text)}” <span class="acc">· tập ${esc(x.volume)}, tr. ${x.page_de_xuat != null ? esc(x.page_de_xuat) : 'khoảng ' + esc(x.page_min ?? '?') + '–' + esc(x.page_max ?? '?')} · ${x.cach_lien_ket === 'doc_tay_ocr' ? 'người rà đọc dạng OCR méo' : 'trùng tên tự động'} · ${esc(x.item_id)}</span></li>`).join('')}</ul><p class="acc">Chỉ mục OCR chưa đối chiếu ảnh trang; là đầu mối tra cứu, không phải bằng chứng đồng nhất.</p></details>`;
    h += `<details class="sec"><summary>Ghi chú kiểm và đính chính</summary><p>${esc(r.verification)}</p><p class="acc">${esc(r.review)}</p></details>`;
  } else if (iss.length) {
    h += `<p class="acc">Dòng này có ${iss.length} vấn đề đang được kiểm; xem ở chế độ Nghiên cứu.</p>`;
  }
  h += `<div class="notice"><b>Đây là một dòng trong bảng của sách</b> (Lê Đình Phụng – Phạm Văn Triệu, tr. 60–71), giữ nguyên để truy nguyên. Một dòng chưa phải một di tích độc lập đã xác minh; tên trùng không bị gộp.</div>
  <div class="actions"><button class="btn ghost" type="button" id="share">Sao chép liên kết</button><button class="btn ghost backmap" type="button" id="backmap">Về bản đồ</button></div>
  </div>`;
  return h;
}

/* ---------- Chọn / đóng ---------- */
const plainLinkClick = e => e.button===0&&!e.metaKey&&!e.ctrlKey&&!e.shiftKey&&!e.altKey;
function wireDetail(d, hashId) {
  $('.close', d).onclick = closeDetail;
  const back=document.createElement('button');back.type='button';back.className='detail-back';back.title='Trở lại';back.setAttribute('aria-label','Trở lại');
  back.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 5-7 7 7 7M5 12h14"/></svg>';
  $('.close',d).after(back);
  const bar=document.createElement('div');bar.className='detail-bar';
  const barTitle=document.createElement('span');barTitle.className='detail-bar-title';barTitle.setAttribute('aria-hidden','true');
  barTitle.textContent=$('#dTitle',d)?.textContent||'';
  $('.close',d).before(bar);bar.append(barTitle,back,$('.close',d));
  d.classList.remove('is-scrolled');
  d.onscroll=()=>d.classList.toggle('is-scrolled',d.scrollTop>48);
  back.onclick=()=>{
    const previous=panelBackStack.pop();
    if(!previous){closeDetail();return;}
    restoringPanel=true;
    openPanel(previous.selection,{focus:true, restoreWorkspace:workspaceFromUrl(previous.url)});
    restoringPanel=false;
    if(previous.research===research){
      $$('details',d).forEach((section,i)=>{section.open=previous.sections[i] ?? section.open;});
      history.replaceState(null,'',previous.url);
      d.scrollTop=previous.scroll;
    }
  };
  $('#backmap', d).onclick = () => { if (phoneLayout.matches) closeDetail(); ($('#tableview').hidden ? $('#maparea') : $('#tableview')).scrollIntoView({behavior: reduceMotion ? 'auto' : 'smooth'}); };
  $$('[data-map-return]', d).forEach(button => button.onclick = () => { closeDetail(); ($('#tableview').hidden ? $('#maparea') : $('#tableview')).scrollIntoView({behavior: reduceMotion ? 'auto' : 'smooth'}); });
  $('#share', d).onclick = async () => {
    const shareURL=new URL(location.href);
    shareURL.searchParams.set('mode',research?'research':'public');
    shareURL.searchParams.set('lang',document.documentElement.lang==='en'?'en':'vi');
    if(!shareURL.hash.includes('/muc/'))shareURL.hash=hashId;
    const url=shareURL.href;
    try { await navigator.clipboard.writeText(url); $('#share').textContent = 'Đã sao chép ✓'; }
    catch (e) { $('#share').textContent = 'Không sao chép được'; $('#announce').textContent = 'Liên kết: ' + url; d.insertAdjacentHTML('beforeend', `<p class="acc share-fallback">Liên kết: <code>${esc(url)}</code></p>`); }
  };
  $$('[data-entity-kind]', d).forEach(a => a.onclick = event => { if(plainLinkClick(event)){event.preventDefault();chooseEntity(a.dataset.entityKind,a.dataset.entityId);} });
  $$('[data-row]', d).forEach(b => b.onclick = () => chooseRow(RBY[b.dataset.row], {focus: true}));
  $$('button[data-place]', d).forEach(b => b.onclick = () => choose(DBY[b.dataset.place], {focus: true}));
  $$('[data-fly]', d).forEach(b => b.onclick = () => { closeTable(); const [la, lo] = b.dataset.fly.split(',').map(Number); flyTo(la, lo, 14); });
}
// Compact the byline only; keep photo credits and source authors exactly as supplied.
function compactProjectMentions(root) {
  root.querySelectorAll('.article-date').forEach(el => {
    el.textContent = el.textContent.replace(/Biên soạn:\s*Lê Trí Công\s*[·—-]?\s*/g, '');
  });
}
// The six scholarly tabs are a stable contract. Match only explicit section
// headings; never classify prose because a paragraph happens to contain a
// keyword. Archaeological chronology belongs under History, while landscape
// remains in the original dossier unless an editor gives it an explicit
// architecture or religion heading.
const PROFILE_TOPICS=[
 ['kien-truc','Kiến trúc','architecture'],
 ['dieu-khac','Điêu khắc','sculpture'],
 ['lich-su','Lịch sử','history'],
 ['van-khac','Văn khắc','inscription'],
 ['bao-ton','Bảo tồn','conservation'],
 ['tin-nguong','Tôn giáo – tín ngưỡng','religion']
];
const normalizeProfileHeading = text => String(text || '').toLowerCase().normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd')
  .replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
const PREFIX = /^(?:(?:ho so mo rong|chi tiet|phan|muc|section)\s*)?(?:\d+(?:\s+\d+)*\s*)?/;
const STARTS = {
  'kien-truc': /^(kien truc|cau truc kien truc|to chuc khong gian|mat bang|khong gian va kien truc|cac nhom den|den thap|cong trinh thanh phan)\b/,
  'dieu-khac': /^(dieu khac|nghe thuat dieu khac|hien vat dieu khac|tuong tho|dai tho|be tho|phu dieu|nghe thuat tao hinh)\b/,
  'lich-su': /^(lich su|nhung moc lich su|moc lich su|tien trinh lich su|cac moc lich su|dien bien lich su|qua trinh hinh thanh|cac giai doan|nhung giai doan|nien dai|cac dot nghien cuu|lich su phat hien|lich su khai quat)\b/,
  'van-khac': /^(van khac|bi ky|bia ky|cac bia ky|nhung van khac|he thong van khac|cac van khac|tu lieu van khac)\b/,
  'bao-ton': /^(bao ton|hien trang bao ton|tinh trang bao ton|cong tac bao ton|tu bo|trung tu|gia co|quan ly va bao ve|phuc dung)\b/,
  'tin-nguong': /^(ton giao|tin nguong|ton giao tin nguong|tin nguong ton giao|tho tu|thuc hanh tho tu|nghi le|than linh|than duoc tho|canh quan thieng)\b/
};
const SUBJECT_WORDS = [
  ['kien-truc', /\bkien truc\b/],
  ['dieu-khac', /\bdieu khac\b/],
  ['lich-su', /\blich su\b/],
  ['van-khac', /\bvan khac\b|\bbi ky\b|\bbia ky\b/],
  ['bao-ton', /\bbao ton\b/],
  ['tin-nguong', /\bton giao\b|\btin nguong\b/]
];
function headingKey(input) {
  const v = normalizeProfileHeading(input).replace(PREFIX, '').trim();
  if (!v || v.length > 130) return null;
  const named = SUBJECT_WORDS.filter(([,re]) => re.test(v)).map(([key]) => key);
  if (new Set(named).size > 1) return null;
  const matches = PROFILE_TOPICS.filter(([key]) => STARTS[key].test(v)).map(([key]) => key);
  return matches.length === 1 ? matches[0] : null;
}
function activateProfileLink(link,updateURL=true){
 const d=$('#detail'),target=d.querySelector('#'+CSS.escape(link.dataset.target));if(!target)return;
 d.querySelectorAll('[data-section-key]').forEach(a=>{a.classList.remove('active');a.removeAttribute('aria-current');});
 link.classList.add('active');link.setAttribute('aria-current','location');
 for(let node=target;node&&node!==d;node=node.parentElement)if(node.tagName==='DETAILS')node.open=true;
 if(updateURL)history.replaceState(null,'',link.getAttribute('href'));
 target.classList.remove('section-arrival');requestAnimationFrame(()=>target.classList.add('section-arrival'));
 const topics=d.querySelector('.topic-nav');
 if(phoneLayout.matches){
  topics?.querySelector('.topic-toggle')?.setAttribute('aria-expanded','false');
  topics?.querySelector('.topic-dropdown')?.removeAttribute('open');
 }
 const offset=(topics?.offsetHeight||0)+20;
 const behavior=reduceMotion?'auto':'smooth';
 target.tabIndex=-1;target.focus({preventScroll:true});
 if(phoneLayout.matches){
  const top=d.scrollTop+target.getBoundingClientRect().top-d.getBoundingClientRect().top-offset;
  d.scrollTo({top,behavior});
 }else{
  target.style.scrollMarginTop=offset+'px';
  target.scrollIntoView({block:'start',behavior});
 }
 $('#announce').textContent='Đã mở mục '+link.textContent+' trong hồ sơ '+PBY[selected.id].name;
}
function wireProfileNavigation(d,p){
 // Citation targets may sit inside a collapsed bibliography. Keep the profile
 // route while opening and scrolling to the cited entry.
 d.querySelectorAll('.full-dossier a[href^="#"]').forEach(a=>{
  const target=document.getElementById(a.getAttribute('href').slice(1));
  if(!target||!d.contains(target))return;
  a.addEventListener('click',e=>{
   if(!plainLinkClick(e))return;
   e.preventDefault();
   let parent=target.closest('details');
   while(parent){parent.open=true;parent=parent.parentElement?.closest('details');}
   target.scrollIntoView({block:'start'});
  });
 });
 const details=[...d.querySelectorAll('details')],findDetail=re=>details.find(e=>re.test(norm(e.querySelector('summary')?.textContent||'')));
 const headings=[...d.querySelectorAll('h3,h4,details > summary')].filter(e=>!e.closest('.network-section,.src,.profile-map-info,[data-localized-inscription]')&&!/bai gioi thieu|ho so mo rong:|lien ket tra cuu|tai lieu tham khao|hien vat lien quan|diem can phan biet|ho so vi tri|menh de va muc chung cu/.test(norm(e.textContent)));
 const topics=d.querySelector('.topic-nav'),navigation=d.querySelector('.profile-nav');
 const source=d.querySelector('details.src');
 const topicToggle=document.createElement('button');
 topicToggle.type='button';topicToggle.className='topic-toggle';
 topicToggle.textContent='Chủ đề hồ sơ';
 topicToggle.setAttribute('aria-expanded','false');
 const topicLinks=document.createElement('div');
 topicLinks.className='topic-links';topicLinks.id='topics-'+p.id;
 topicToggle.setAttribute('aria-controls',topicLinks.id);
 topicToggle.onclick=()=>topicToggle.setAttribute('aria-expanded',String(topicToggle.getAttribute('aria-expanded')==='false'));
 topics.append(topicToggle,topicLinks);
 function add(nav,key,label,tone,target){
  const id='profile-'+p.id+'-'+key;
  // A target can serve several subjects; each link retains its own stable route.
  if(!target.id)target.id=id;
  const a=document.createElement('a');a.className='topic-link topic-'+tone;a.textContent=label;a.href='#'+p.id+'/muc/'+key;a.dataset.sectionKey=key;a.dataset.target=target.id;
  a.onclick=e=>{if(plainLinkClick(e)){e.preventDefault();activateProfileLink(a);}};nav.append(a);
 }
 PROFILE_TOPICS.forEach(([key,label,tone])=>{
  let target=d.querySelector('.full-dossier [data-profile-section="'+key+'"]');
  if(key==='van-khac')target=d.querySelector('.profile-inscriptions')||target||d.querySelector('#museum-van-khac');
  if(!target)target=headings.find(e=>headingKey(e.textContent)===key);
  if(!target&&key==='kien-truc')target=findDetail(/cong trinh thanh phan/);
   if(!target&&key==='lich-su'&&(p.dating||[]).length)target=d.querySelector('.dates');
  if(!target&&['dieu-khac','van-khac'].includes(key)){
   const kind=key==='dieu-khac'?'object':'inscription';
   target=[...d.querySelectorAll('[data-entity-kind="'+kind+'"]')].map(e=>e.closest('li')).find(Boolean);
  }
  if(!target){
   target=document.createElement('details');target.className='sec topic-gap';
   const summary=document.createElement('summary');summary.textContent=label;target.append(summary);
   const note=document.createElement('p');note.textContent='Hồ sơ hiện chưa có mục '+label.toLowerCase()+' riêng. Có thể đối chiếu các tài liệu đã dẫn trong mục Nguồn.';target.append(note);
   const a=document.createElement('a');a.href='#'+p.id+'/muc/nguon';a.textContent='Đến nguồn tư liệu →';a.onclick=e=>{e.preventDefault();const link=d.querySelector('[data-section-key="nguon"]');if(link)activateProfileLink(link);};target.append(a);
   source.before(target);
  }
  if(key==='van-khac'){
   const menu=document.createElement('details');menu.className='topic-dropdown';
   const summary=document.createElement('summary');summary.className='topic-link topic-inscription';summary.textContent=label;menu.append(summary);
   const list=document.createElement('div');list.className='inscription-source-menu';
   const regionalIds = new Set(p.regional_inscriptions || []);
   const ids = inscriptionIds(p);
   ids.forEach(id=>{
    const t=INS[id],refs=[INSCRIPTION_CONTENT[id]?.sources[0]?.url,t.url,SRC[t.dharma]?.url,...(t.sources||[]).map(ref=>SRC[ref]?.url)];
    const url=refs.find(url=>url&&/^https?:\/\//i.test(url)&&safeHref(url));
    const row=document.createElement(url?'a':'span');row.className='inscription-source-row';
    if(url){row.href=safeHref(url);row.target='_blank';row.rel='noopener noreferrer';}
    const code=document.createElement('strong');code.textContent=id;row.append(code);
    const note=document.createElement('span');
    const label = url ? 'Mở nguồn công bố ↗' : 'Chưa có liên kết công khai';
    note.textContent = regionalIds.has(id) ? 'Đối chiếu khu vực · ' + label : label;
    row.append(note);list.append(row);
   });
   if(!ids.length){const note=document.createElement('p');note.textContent='Chưa có văn khắc được liên kết với địa điểm này.';list.append(note);}
   const en=inscriptionLanguage()==='en';
   add(list,key,en?'Read inscriptions in the dossier':'Xem phần văn khắc trong hồ sơ','inscription',target);
   const articleTarget=d.querySelector('.full-dossier [data-profile-section="van-khac"]');
   if(articleTarget&&articleTarget!==target)add(list,'van-khac-bai-viet',en?'Read the article section':'Đọc phần văn khắc trong bài chuyên đề','inscription',articleTarget);
   menu.append(list);topicLinks.append(menu);
  }else add(topicLinks,key,label,tone,target);
 });
 const intro=d.querySelector('.myson-article')||d.querySelector('.lead');
 add(navigation,'gioi-thieu','Giới thiệu','overview',intro);
 const locations=d.querySelector('.location-evidence');if(locations)add(navigation,'vi-tri','Vị trí','overview',locations);
 const dates=d.querySelector('.dates');if(research && dates?.children.length)add(navigation,'nien-dai','Niên đại','history',dates);
 const photos=d.querySelector('.heritage-gallery')?.closest('details');if(photos)add(navigation,'anh','Ảnh · Bản vẽ','photos',photos);
 d.querySelectorAll('details[data-museum-section]').forEach(room=>{
  add(navigation,room.id.slice('museum-'.length),room.dataset.museumSection,'sculpture',room);
 });
 [['phong-le','Phong Lệ'],['tra-kieu','Trà Kiệu'],['my-son','Mỹ Sơn']].forEach(([key,label])=>{const room=d.querySelector('#museum-'+key);if(room)add(navigation,key,'Phòng '+label,'sculpture',room);});
 add(navigation,'nguon','Nguồn','sources',source);
 const evidence=findDetail(/menh de va muc chung cu/);if(evidence)add(navigation,'chung-cu','Chứng cứ','evidence',evidence);
}

// Reuse the exact classification used by map markers; do not infer from the title.
function profileIconKey(sel){
  if(sel.type==='E')return ['object','inscription','source'].includes(sel.kind)?sel.kind:'mixed';
  if(sel.type==='F')return 'thanh';
  const record=sel.type==='P'?PBY[sel.id]:RBY[sel.id];
  return record?SYMBOLS.type(record):'mixed';
}
const CLAIM_GROUPS = [
  ['DL', 'DỮ LIỆU', 'Điều ghi trong nguồn hoặc quan sát được.'],
  ['PT', 'PHÂN TÍCH', 'Đối chiếu và phân loại dựa trên dữ liệu.'],
  ['SL', 'SUY LUẬN', 'Diễn giải và giả thuyết cần kiểm chứng riêng.']
];

function claimSections(claims) {
  return CLAIM_GROUPS.map(([tier, label, help]) => {
    const entries = claims.filter(c => c.tier === tier || (tier === 'SL' && c.tier === 'GT'));
    return `<section class="claim-group"><h4>${label}</h4><p class="acc">${help}</p>${
      entries.map(c => `<div class="claim${c.status === 'CONTRADICTED_WITHIN_SCOPE' ? ' contra' : ''}">
        <span class="badge b-${esc(c.tier)}">${esc(V.tier[c.tier]?.label || c.tier)}</span><b>${esc(c.id)}</b> ${esc(c.text)}
        <small>${esc(V.claim_status[c.status] || c.status)} · Nguồn: ${srcShort(c.sources)}</small>
        <small>${esc(c.review || '')}</small></div>`).join('') || '<p class="acc">Chưa ghi mệnh đề riêng.</p>'
    }</section>`;
  }).join('');
}

function addRevisionForm(host, selection) {
  const key = 'dossier-proposal-v1:' + selection.type + ':' + selection.id;
  const saved = store.get(key);
  const panel = document.createElement('details');
  panel.className = 'sec dossier-proposal';
  panel.innerHTML = `<summary>Đề xuất hiệu đính hồ sơ</summary>
    <p class="acc">Bản nháp lưu riêng trong trình duyệt này. Tải JSON để chuyển cho người biên tập đối chiếu với hồ sơ đã xuất bản.</p>
    <form>
      ${CLAIM_GROUPS.map(([tier, label]) => `<label>${label}<textarea name="${tier}" rows="2" maxlength="4000"></textarea></label>`).join('')}
      <label>Nguồn và vị trí trích dẫn<textarea name="sources" rows="2" maxlength="4000" placeholder="Trang, hình, mã văn khắc, URL hoặc số lưu trữ"></textarea></label>
      <label>Ảnh hoặc bản vẽ<textarea name="media" rows="2" maxlength="4000" placeholder="URL, tác giả, quyền sử dụng và chú thích"></textarea></label>
      <div class="row-btns"><button class="btn" type="submit">Lưu bản nháp</button><button class="btn ghost" type="button">Tải JSON</button></div>
      <p role="status" class="acc"></p>
    </form>`;
  host.append(panel);
  const form = panel.querySelector('form');
  const fields = [...form.querySelectorAll('textarea')];
  fields.forEach(field => { field.value = saved?.proposal?.[field.name] || ''; });
  const status = panel.querySelector('[role="status"]');
  function proposal() {
    const values = Object.fromEntries(fields.map(field => [field.name, field.value.trim()]));
    return {
      schema: 'champa-dossier-proposal/v1',
      target: {id: selection.id, type: selection.type, entity_kind: selection.kind},
      base: {version: A.meta.version, compiled: A.meta.compiled},
      edited_at: new Date().toISOString(),
      proposal: values
    };
  }
  form.onsubmit = event => {
    event.preventDefault();
    const draft = proposal();
    status.textContent = store.set(key, draft) ? 'Đã lưu bản nháp trên trình duyệt này.' : 'Trình duyệt không lưu được. Dùng nút Tải JSON để giữ bản nháp.';
  };
  form.querySelector('[type="button"]').onclick = () => {
    download('de-xuat-' + selection.id.replace(/[^a-z0-9_-]/gi, '-') + '.json', JSON.stringify(proposal(), null, 2), 'application/json');
    status.textContent = 'Đã yêu cầu tải đề xuất JSON.';
  };
}

function renderSelected() {
  const d = $('#detail');
  const inscriptionsOpen=d.querySelector('.profile-inscriptions')?.open;
  const samePlace=selected.type==='P'&&d.querySelector('.dbody')?.dataset.place===selected.id;
  const metadataHost = $('#mapMetadata');
  const mapNotes = [$('#maptopTitle').parentElement, $('#legend')];
  mapNotes.forEach(node => metadataHost.append(node));
  if (selected.type === 'P') d.innerHTML = renderPlace(PBY[selected.id]); else if (selected.type === 'F') d.innerHTML = renderFort(DBY[selected.id]); else if (selected.type === 'E') d.innerHTML = renderEntity(selected); else d.innerHTML = renderRow(RBY[selected.id]);
  if(samePlace&&inscriptionsOpen){const section=d.querySelector('.profile-inscriptions');if(section)section.open=true;}
  const title=d.querySelector('#dTitle');
  if(title){
    const icon=SYMBOLS.icon(profileIconKey(selected));
    const heading=document.createElement('div');heading.className='detail-heading';
    const image=document.createElement('img');image.className='detail-category-icon';image.src=icon.src;image.alt=icon.label;image.width=36;image.height=36;
    title.before(heading);heading.append(image,title);
    const favicon=document.querySelector('link[rel="icon"]');if(favicon)favicon.href=icon.src;
    document.title=title.textContent+' · '+CFG.title;
  }
  if (selected.type === 'P') { linkNumberedCitations(d,PBY[selected.id]); linkInscriptionMentions(d); }
  d.querySelectorAll('table').forEach(table => {
    const wrap = document.createElement('div'); wrap.className = 'article-table-scroll';
    wrap.tabIndex = 0; wrap.setAttribute('role', 'region'); wrap.setAttribute('aria-label', 'Bảng dữ liệu, vuốt ngang để xem đủ cột');
    table.before(wrap); wrap.append(table);
  });
  const mapInfo = document.createElement('details'); mapInfo.className = 'sec profile-map-info';
  mapInfo.innerHTML = '<summary>Thông tin bản đồ và chú giải vị trí</summary>';
  mapNotes.forEach(node => mapInfo.append(node));
  const body = $('.dbody', d);
  body.append(mapInfo);
  if(selected.type==='P')addWorkspaceDossierSections(body,PBY[selected.id]);
  if(selected.type==='E'&&selected.kind==='inscription'&&['C.66','C.86','C.142'].includes(selected.id)){
    body.querySelector('.actions').insertAdjacentHTML('beforebegin','<p><a class="topic-link topic-history" href="tong-quan-champa.html#van-khac">Đối chiếu Tổng quan Champa</a></p>');
  }
  if (research) addRevisionForm(body, selected);
  if(selected.type==='P') wireProfileNavigation(d,PBY[selected.id]);
  compactProjectMentions(d);
  wireDetail(d, entityKey(selected));
  window.CHAMPA_I18N?.detail(d, DBY[selected.id] || PBY[selected.id], research);
}
function flyTo(lat, lon, z) {
  if (!map) return;
  const d = $('#detail');
  if (isNarrow() || d.hidden) { map.setView([lat, lon], Math.max(map.getZoom(), z), {animate: !reduceMotion}); return; }
  map.setView([lat, lon], Math.max(map.getZoom(), z), {animate: false});
  const px = map.project([lat, lon]); map.panTo(map.unproject(px.add([d.offsetWidth / 2 + 20, 0])), {animate: !reduceMotion});
}
function openPanel(sel, {focus, restoreWorkspace}) {
  if(!restoringPanel&&selected&&entityKey(selected)!==entityKey(sel)){
    const detail=$('#detail');
    const sections=$$('details',detail).map(section=>section.open);
    const previousKey=entityKey(selected);
    const previousHash=location.hash.startsWith('#'+previousKey+'/muc/') ? location.hash : '#'+previousKey;
    panelBackStack.push({selection:{...selected},url:location.pathname+location.search+previousHash,scroll:detail.scrollTop,sections,research});
  }
  const record = sel.type==='R' ? RBY[sel.id] : sel.type==='E' ? null : DBY[sel.id];
  const nextWorkspace = restoreWorkspace || (record && !inWorkspace(record) ?
    OVERLAY_KEYS.find(key=>inWorkspace(record,key)) : workspace);
  if(nextWorkspace)enterWorkspace(nextWorkspace);
  if(record && !layerVisible(record)){
    workspaceLayersOf(record).forEach(k=>visibleSelection().add(k));
    applyLayers();
  }
  const prev = selected; selected = sel;
  history.replaceState(null, '', location.pathname + location.search + '#' + entityKey(sel));
  const d = $('#detail'); const wasHidden = d.hidden;
  d.hidden = false; document.body.classList.add('panel-open');
  renderSelected();
  d.scrollTop = 0;
  if (map && prev && prev.type === 'P' && markers[prev.id]) refreshMarker(PBY[prev.id]);
  renderPlaces(); renderRows();
  if (focus) {
    const t = $('#dTitle');
    if (isNarrow() && !phoneLayout.matches) d.scrollIntoView({behavior: reduceMotion ? 'auto' : 'smooth', block: 'start'});
    if (t) t.focus({preventScroll: true});
  }
  return wasHidden;
}
function choose(p, {move = true, focus = false} = {}) {
  if (!p) return;
  if(p._extra==='row')return chooseRow(p.row,{move,focus});
  if(p._extra==='fort'){openPanel({type:'F',id:p.id},{focus});if(map&&move)fitTo(displayLocs(p).map(l=>[l.lat,l.lon]),true);return;}
  const fromOverseas = selected?.type === 'P' && PBY[selected.id]?.map_scope === 'overseas';
  const previousWorkspace = workspace;
  const wasHidden = openPanel({type: 'P', id: p.id}, {focus});
  if (map && $('#tableview').hidden && hasLocation(primaryLoc(p))) {
    refreshMarker(p);
    const loc = primaryLoc(p);
    if (move || fromOverseas || previousWorkspace!==workspace) flyTo(loc.lat, loc.lon, 11);
    else if (wasHidden && !isNarrow()) {
      const pt = map.latLngToContainerPoint([loc.lat, loc.lon]), d = $('#detail');
      if (pt.x > map.getSize().x - d.offsetWidth - 30) { const px = map.project([loc.lat, loc.lon]); map.panTo(map.unproject(px.add([d.offsetWidth / 2 + 20, 0])), {animate: !reduceMotion}); }
    }
  }
  $('#announce').textContent = 'Đã mở hồ sơ ' + p.name;
}
function chooseRow(r, {move = true, focus = false} = {}) {
  if (!r) return;
  openPanel({type: 'R', id: r.id}, {focus});
  if (map && move && (DBY[r.id] || (research && showRows)) && $('#tableview').hidden) {
    const pts = DBY[r.id] ? Object.values(rowPoints([r])) : Object.values(rowPts).filter(pt => pt.rows.includes(r));
    if (pts.length === 1) flyTo(pts[0].lat, pts[0].lon, 12); else if (pts.length > 1) fitTo(pts.map(pt => [pt.lat, pt.lon]), true);
  }
  $('#announce').textContent = 'Đã mở dòng nguồn ' + r.id + ' ' + r.name;
}
function closeDetail() {
  panelBackStack.length=0;
  const d = $('#detail'); d.hidden = true; document.body.classList.remove('panel-open');
  const prev = selected; selected = null;
  const favicon=document.querySelector('link[rel="icon"]');if(favicon)favicon.href='assets/branding/identity-v2/logos/app-icon-micro-brick.svg';
  document.title=CFG.title;
  window.CHAMPA_I18N?.refresh();
  history.replaceState(null, '', location.pathname + location.search);
  if (prev && prev.type === 'P' && map) refreshMarker(PBY[prev.id]);
  renderPlaces(); renderRows();
  if (map && prev?.type === 'P' && PBY[prev.id].map_scope === 'overseas') {
    const localPoints = placeLatLngs(regionalPlaces(filteredPlaces()));
    if (localPoints.length) fitTo(localPoints, true);
  }
  if (!prev || prev.type === 'E') return;
  const btn = prev.type === 'P' ? $$('#plist .card').find(b => b.querySelector('b') && b.querySelector('b').textContent === PBY[prev.id].name)
    : $$('#rlist .card').find(b => b.querySelector('.rid') && 'BDS-' + b.querySelector('.rid').textContent === prev.id);
  if (btn) btn.focus({preventScroll: matchMedia('(max-width:600px)').matches});
}
document.addEventListener('keydown', e => { if (e.key === 'Escape' && !$('#detail').hidden ) closeDetail(); });
function fromHash() {
  let h;
  try { h=decodeURIComponent(location.hash.slice(1)); } catch { return false; }
  const [base,...tail]=h.split('/muc/');
  if(A.place_aliases&&Object.hasOwn(A.place_aliases,base)){h=A.place_aliases[base]+(tail.length?'/muc/'+tail.join('/muc/'):'');history.replaceState(null,'',location.pathname+location.search+'#'+h);}
  if(h==='bac-champa'){enterWorkspace('champa');setTab('P');if(map)fitTo(additions.flatMap(p=>displayLocs(p).map(l=>[l.lat,l.lon])),true);return true;}
  if(Object.hasOwn(DBY,h)&&DBY[h]._extra){setTab('P');choose(DBY[h],{move:true,focus:false});return true;}
  if(h==='relations'&&relationsUI){enterWorkspace('champa');setMode(true);relationsUI.open();return true;}
  if(h.includes('/muc/')){const [id,key]=h.split('/muc/');if(Object.hasOwn(PBY,id)){setTab('P');choose(PBY[id],{move:true,focus:false});const link=$$('[data-section-key]',$('#detail')).find(a=>a.dataset.sectionKey===key);if(link){activateProfileLink(link,false);history.replaceState(null,'','#'+h);}return true;}}
  if (h.startsWith('entity:')) { const [,kind,...parts]=h.split(':'); const id=parts.join(':'); if(entityRecord(kind,id)){chooseEntity(kind,id);return true;} }
  if (Object.hasOwn(PBY,h)) { setTab('P'); choose(PBY[h], {move: true, focus: false}); return true; }
  if (Object.hasOwn(RBY,h)) { chooseRow(RBY[h], {move: !!NORTH[h], focus: false}); setTab('R'); return true; }
  return false;
}
window.addEventListener('hashchange', fromHash);

/* ---------- Bảng dữ liệu (thay Mo_corpus.html) ---------- */
const C = (key, label, opt = {}) => Object.assign({key, label}, opt);
const TABLES = {
  corpus: {label: `Dòng nguồn (${ROWS.length})`, pub: true, rows: ROWS, open: r => chooseRow(r, {focus: true}),
    note: 'Bảng chép từ sách, tr. 60–71. Tỉnh/địa chỉ là địa danh theo nguồn. Số công trình chỉ có ở bảng nhóm tháp và không cộng với số dòng phế tích.',
    cols: [C('id', 'Mã', {mono: 1}), C('name', 'Tên'), C('name_raw', 'Tên trong sách'), C('province_source', 'Tỉnh (sách)'), C('address_source', 'Địa chỉ (sách)'),
      C('province_2025', 'Tỉnh hiện nay'), C('table_type', 'Bảng', {get: r => TABLE_LABEL[r.table_type]}), C('category', 'Phân loại'), C('structure_count_source', 'Số CT (sách)'),
      C('printed_page', 'Trang'), C('note_source', 'Ghi chú sách'), C('kmz_link_status', 'KMZ', {res: 1, get: r => KMZ_LABEL[r.kmz_link_status] || r.kmz_link_status}),
      C('issue_ids', 'Vấn đề', {res: 1}), C('parmentier_leads', 'Parmentier', {res: 1}), C('profile_id', 'Hồ sơ'), C('source_row_id', 'Mã dòng nguồn', {mono: 1})]},
  links: {label: `Liên kết KMZ đề xuất (${LINKS.length})`, rows: LINKS, open: l => chooseRow(RBY[l.corpus_id], {focus: true}),
    note: 'Liên kết theo tên giữa dòng nguồn và bộ KMZ của tác giả. Tất cả đang “chưa duyệt”. Điền quyết định ở cột trang_thai_duyet trong lien_ket_kmz.csv.',
    cols: [C('link_id', 'Mã LK', {mono: 1}), C('corpus_id', 'Dòng', {mono: 1}), C('ten_corpus', 'Tên dòng'), C('tinh_nguon', 'Tỉnh (sách)'), C('dia_chi_nguon', 'Địa chỉ (sách)'),
      C('ten_kmz', 'Nhãn KMZ'), C('lat', 'Vĩ độ'), C('lon', 'Kinh độ'), C('kieu_khop', 'Kiểu khớp', {get: l => matchLabel(l.kieu_khop)}), C('ly_do', 'Lý do'),
      C('trong_khung_tinh', 'Trong khung tỉnh'), C('so_ung_vien_trong_tinh', 'Số ứng viên'), C('doi_chieu_nhan_kmz', 'Nhãn KMZ ↔ địa chỉ'),
      C('de_xuat', 'Đề xuất', {get: l => KMZ_LABEL[l.de_xuat] || l.de_xuat}), C('trang_thai_duyet', 'Duyệt'), C('kmz_global_id', 'Global_ID KMZ', {mono: 1})]},
  issues: {label: `Hàng đợi vấn đề (${ISS.length})`, rows: ISS, open: i => i.corpus_ids[0] && chooseRow(RBY[i.corpus_ids[0]], {focus: true}),
    note: 'Mỗi vấn đề có bằng chứng, việc cần làm và điều kiện đóng. Cột “van_de_v1” nối về hàng đợi của bản 1.0.',
    cols: [C('issue_id', 'Mã', {mono: 1}), C('uu_tien', 'Ưu tiên'), C('loai', 'Loại'), C('trang_thai', 'Trạng thái'), C('corpus_ids', 'Dòng liên quan', {get: i => i.corpus_ids.join('; ')}),
      C('mo_ta', 'Mô tả', {wrap: 1}), C('bang_chung', 'Bằng chứng', {wrap: 1}), C('de_xuat', 'Đề xuất', {wrap: 1}), C('viec_can_lam', 'Việc cần làm', {wrap: 1}),
      C('dieu_kien_dong', 'Đóng khi', {wrap: 1}), C('van_de_v1', 'Từ bản 1.0')]},
  parm: {label: `Chỉ mục Parmentier — OCR (${PARM.length})`, rows: PARM, open: x => x.corpus_de_xuat && chooseRow(RBY[x.corpus_de_xuat.split('; ')[0]], {focus: true}),
    note: 'Tách từ mục lục OCR; số trang đề xuất theo ràng buộc thứ tự, chưa đối chiếu ảnh. Không dùng để đếm di tích.',
    cols: [C('item_id', 'Mã mục', {mono: 1}), C('volume', 'Tập'), C('loai', 'Loại'), C('item_text', 'Mục (OCR)', {wrap: 1}), C('page_ocr', 'Trang OCR'),
      C('page_de_xuat', 'Trang đề xuất', {get: x => x.page_de_xuat ?? (x.page_min != null || x.page_max != null ? `${x.page_min ?? '?'}–${x.page_max ?? '?'}` : '')}),
      C('cach_doc_trang', 'Cách đọc trang'), C('corpus_de_xuat', 'Dòng nguồn đề xuất'), C('cach_lien_ket', 'Cách liên kết')]}
};
let tset = 'corpus', tsort = {key: null, dir: 1}, tcurrent = [];
function fillTableSets() {
  const sel = $('#tset'), cur = sel.value || tset; sel.innerHTML = '';
  Object.entries(TABLES).filter(([, t]) => research || t.pub).forEach(([k, t]) => { const o = document.createElement('option'); o.value = k; o.textContent = t.label; sel.append(o); });
  sel.value = TABLES[cur] && (research || TABLES[cur].pub) ? cur : 'corpus'; tset = sel.value;
}
const cellVal = (c, r) => { const v = c.get ? c.get(r) : r[c.key]; return v == null ? '' : v; };
function tableRows() {
  const t = TABLES[tset], cols = t.cols.filter(c => research || !c.res), q = norm($('#tsearch').value);
  let rows = t.rows;
  if (q) rows = rows.filter(r => norm(cols.map(c => cellVal(c, r)).join(' ')).includes(q));
  if (tsort.key) { const c = cols.find(x => x.key === tsort.key); if (c) rows = [...rows].sort((a, b) => { const x = cellVal(c, a), y = cellVal(c, b); return (typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y), 'vi', {numeric: true})) * tsort.dir; }); }
  return {cols, rows};
}
function renderTable() {
  const t = TABLES[tset], {cols, rows} = tableRows(); tcurrent = rows;
  $('#tnote').textContent = t.note;
  $('#tcount').textContent = `${rows.length} / ${t.rows.length} dòng`;
  $('#tdata thead').innerHTML = '<tr>' + cols.map(c => `<th scope="col" aria-sort="${tsort.key === c.key ? (tsort.dir > 0 ? 'ascending' : 'descending') : 'none'}"><button type="button" data-k="${esc(c.key)}">${esc(c.label)}</button></th>`).join('') + '</tr>';
  $('#tdata tbody').innerHTML = rows.map((r, i) => '<tr>' + cols.map((c, j) => {
    const v = esc(cellVal(c, r));
    return `<td class="${c.wrap ? 'wrap' : ''}${c.mono ? ' mono' : ''}">${j === 0 ? `<button type="button" class="linkbtn" data-i="${i}" aria-label="Mở ${v}">${v}</button>` : v}</td>`;
  }).join('') + '</tr>').join('');
  $$('#tdata th button').forEach(b => b.onclick = () => { tsort = {key: b.dataset.k, dir: tsort.key === b.dataset.k ? -tsort.dir : 1}; renderTable(); $(`#tdata th button[data-k="${CSS.escape(b.dataset.k)}"]`).focus(); });
  $$('#tdata tbody [data-i]').forEach(b => b.onclick = () => t.open(tcurrent[+b.dataset.i]));
}
function openTable() { $('#maparea').hidden = true; $('#tableview').hidden = false; fillTableSets(); renderTable(); $('#tset').focus(); }
function closeTable() { if ($('#tableview').hidden) return; $('#tableview').hidden = true; $('#maparea').hidden = false; if (map) map.invalidateSize(); }
$('#openTable').onclick = openTable;
$('#tclose').onclick = () => { closeTable(); $('#openTable').focus(); };
$('#tset').onchange = () => { tset = $('#tset').value; tsort = {key: null, dir: 1}; renderTable(); };
$('#tsearch').addEventListener('input', renderTable);
const csvQ = CORE.files.csvCell;
$('#tcsv').onclick = () => {
  const {cols, rows} = tableRows();
  const lines = [cols.map(c => c.key).join(',')].concat(rows.map(r => cols.map(c => csvQ(Array.isArray(r[c.key]) ? r[c.key].join('; ') : (r[c.key] ?? ''))).join(',')));
  download(`${tset}_loc_${new Date().toISOString().slice(0, 10)}.csv`, '﻿' + lines.join('\r\n'), 'text/csv;charset=utf-8');
};

/* ---------- Nhập / xuất tọa độ ---------- */
function parseCSV(text) {
  const firstLine = text.split(/\r?\n/)[0] || '';
  const delim = [';', '\t', ','].map(d => [d, firstLine.split(d).length]).sort((a, b) => b[1] - a[1])[0][0];
  const rows = []; let row = [], cell = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else q = false; } else cell += c; }
    else if (c === '"' && cell === '') q = true;  // nháy kép chỉ mở trường ở đầu ô, nên ký hiệu giây (") trong tọa độ được giữ nguyên
    else if (c === delim) { row.push(cell); cell = ''; }
    else if (c === '\n' || c === '\r') { if (c === '\r' && text[i + 1] === '\n') i++; row.push(cell); rows.push(row); row = []; cell = ''; }
    else cell += c;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  const head = (rows.shift() || []).map(h => norm(h).replace(/ /g, '_'));
  return {delim, records: rows.filter(r => r.some(x => x.trim())).map(r => Object.fromEntries(head.map((h, i) => [h, (r[i] || '').trim()])))};
}
function parseCoord(v,delim) { return T.coordinate(v,delim); }
const pick = (r, keys) => { for (const k of keys) if (r[k] != null && r[k] !== '') return r[k]; return null; };
function recordsFrom(text, fileName) {
  const t = text.replace(/^﻿/, '').trim();
  if (/\.kml$/i.test(fileName) || t.startsWith('<')) {
    const xml = new DOMParser().parseFromString(t, 'application/xml');
    if (xml.querySelector('parsererror')) throw new Error('Không đọc được KML.');
    return [...xml.getElementsByTagName('Placemark')].map(pm => {
      const name = (pm.getElementsByTagName('name')[0] || {}).textContent || '';
      const coords = ((pm.getElementsByTagName('coordinates')[0] || {}).textContent || '').trim().split(/\s+/)[0].split(',');
      const data = {}; [...pm.getElementsByTagName('Data')].forEach(d => { data[norm(d.getAttribute('name')).replace(/ /g, '_')] = ((d.getElementsByTagName('value')[0] || {}).textContent || '').trim(); });
      return Object.assign(data, {ten: name.trim(), lon: coords[0], lat: coords[1], _delim: ','});
    });
  }
  if (/\.(geo)?json$/i.test(fileName) || t.startsWith('{')) {
    const g = JSON.parse(t);
    const feats = g.type === 'FeatureCollection' ? g.features : (g.type === 'Feature' ? [g] : []);
    return feats.filter(f => f.geometry && f.geometry.type === 'Point').map(f => {
      const pr = {}; Object.entries(f.properties || {}).forEach(([k, v]) => { pr[norm(k).replace(/ /g, '_')] = v == null ? '' : String(v); });
      if (f.id != null && !pr.id) pr.id = String(f.id);
      return Object.assign(pr, {lon: String(f.geometry.coordinates[0]), lat: String(f.geometry.coordinates[1]), _delim: ','});
    });
  }
  const {delim, records} = parseCSV(t);
  return records.map(r => Object.assign(r, {_delim: delim}));
}
/* Khớp: hồ sơ theo id hoặc tên; dòng nguồn CHỈ theo mã BDS-… (không khớp mờ theo tên, đúng quy tắc khóa của gói). */
function matchTarget(r) {return T.target(r,places,ROWS);}
function prevPoint(m) {
  if (m.type === 'P') { const l = originalPrimary(m.obj); return {lat: l.lat, lon: l.lon}; }
  const l = inProvLinks(m.obj.id); return l.length === 1 ? {lat: l[0].lat, lon: l[0].lon} : null;
}
async function importText(text, fileName) {
 const fallbackStatus=$('#importStatus').value;
 let recs;
 try {
  const raw=text.replace(/^﻿/,'').trim();
  const g=raw.startsWith('{')?JSON.parse(raw):null;
  if(g?.type==='ChampaCoordinatePatch'){
   if(g.schema_version!=='1.0'||!Array.isArray(g.changes))throw new Error('Phiên bản hoặc cấu trúc bản vá không được hỗ trợ.');
   const {checksum,...payload}=g;
   if(checksum){const hash=await T.digest(payload);if(!hash||checksum.algorithm!=='SHA-256'||hash!==checksum.value)throw new Error('Mã kiểm toàn vẹn bản vá không khớp hoặc trình duyệt không kiểm được.');}
   recs=g.changes.map(c=>({id:c.id,...c.after,_patchBefore:c.before,_patchAfter:c.after,_patchHistory:c.history,_delim:','}));
  }else recs=recordsFrom(text,fileName);
 }catch(e){$('#importReport').textContent='Không nhập được: '+e.message;return;}
 const rows=[],next={...imported},seen=new Set();let accepted=0;
 for(const r of recs){
  const label=pick(r,['ten','name','id'])||'(không tên)';
  const primary=String(r.chinh??r.primary??'').toLowerCase();
  if(['false','0','no'].includes(primary)){rows.push([label,'—','Bỏ qua điểm phụ; tệp này chỉ thay điểm chính.','']);continue;}
  const m=matchTarget(r);
  if(!m){rows.push([label,'—','Không khớp mã hoặc tên chính xác, duy nhất. Không tự chọn tên gần.','']);continue;}
  const id=m.obj.id,tname=m.type==='P'?m.obj.name:id+' '+m.obj.name;
  if(seen.has(id)){rows.push([label,tname,'Trùng mã trong cùng tệp; bỏ qua dòng lặp.','']);continue;}
  const lat=parseCoord(pick(r,['lat','vi_do','latitude','y']),r._delim),lon=parseCoord(pick(r,['lon','lng','kinh_do','longitude','x']),r._delim);
  if(!T.valid(lat,lon)){
   const advice=T.valid(lon,lat)?' Có thể đảo Lat/Lon; sửa tệp rồi nhập lại.':' Kiểm hệ tọa độ (WGS84), VN-2000/UTM và giá trị số.';
   rows.push([label,tname,'Từ chối: tọa độ không hợp lệ.'+advice,'']);continue;
  }
  const base=m.type==='P'?originalPrimary(m.obj):null;
  const effective=imported[id]?(m.type==='P'?primaryLoc(m.obj):imported[id]):base;
  if(r._patchBefore!==undefined){
   if(T.canonical(T.snapshot(effective))===T.canonical(T.snapshot(r._patchAfter))){rows.push([label,tname,'Đã có đúng hiệu đính này; không nhập lặp.','']);continue;}
   if(T.canonical(T.snapshot(effective))!==T.canonical(T.snapshot(r._patchBefore))){rows.push([label,tname,'Xung đột với bản đang dùng; không ghi đè.','']);continue;}
  }
  const accRaw=pick(r,['accuracy_m','sai_so_m','sai_so']);const acc=accRaw==null?null:parseCoord(accRaw,';');
  if(acc!==null&&(!Number.isFinite(acc)||acc<0)){rows.push([label,tname,'Từ chối: sai số phải là số không âm hoặc để trống.','']);continue;}
  const roleRaw=pick(r,['role','location_role','vai_tro']);
  const role=V.location_role[roleRaw]?roleRaw:Object.keys(V.location_role).find(k=>V.location_role[k]===roleRaw);
  if(roleRaw&&!role){rows.push([label,tname,'Từ chối: vai trò vị trí không có trong danh mục.','']);continue;}
  const stRaw=norm(pick(r,['status','muc_kiem','trang_thai'])||'').replace(/ /g,'_');
  const source=pick(r,['source','nguon','coordinate_source','source_text']);
  const value={lat,lon,role:role||effective?.role||base?.role||null,status:V.coord_status[stRaw]?stRaw:fallbackStatus,accuracy_m:acc,
   date:pick(r,['ngay_do','date','verified_date']),device:pick(r,['thiet_bi','device']),by:pick(r,['nguoi_do','by','verified_by']),
   source:source&&SRC[source]?source:null,source_text:pick(r,['source_text'])||source||null,note:pick(r,['ghi_chu','note','notes','description']),file:fileName,imported_at:new Date().toISOString()};
  value.base=Object.prototype.hasOwnProperty.call(imported[id]||{},'base')?imported[id].base:T.snapshot(effective);
  value.history=[...(imported[id]?.history||[]),...(Array.isArray(r._patchHistory)?r._patchHistory:[]),{at:value.imported_at,by:value.by,source_file:fileName,reason:value.note,before:T.snapshot(effective),after:T.snapshot(value)}];
  next[id]=value;seen.add(id);accepted++;
  const prev=effective||prevPoint(m),warn=lat<8||lat>24||lon<102||lon>110?' · ngoài khung Việt Nam, cần kiểm':'';
  rows.push([label,tname,'Đã nhập vào bản làm việc'+warn,prev?fmtDist(haversine({lat,lon},prev)):'chưa có điểm cũ']);
 }
 imported=next;const saved=store.set(KEY_COORDS,imported);
 $('#importReport').innerHTML=`<p><b>${accepted}</b> điểm đã nhập vào bản làm việc. ${saved?'Đã lưu trong trình duyệt; hãy tải bản vá để sao lưu.':'Chưa lưu được trong trình duyệt; hãy tải bản vá ngay.'}</p><p class="acc">Nhập tệp không tự xác nhận tọa độ đã được kiểm thực địa.</p><table><thead><tr><th>Dòng</th><th>Hồ sơ</th><th>Kết quả</th><th>Độ dịch chuyển</th></tr></thead><tbody>${rows.map(r=>'<tr>'+r.map(c=>'<td>'+esc(c)+'</td>').join('')+'</tr>').join('')}</tbody></table>`;
 afterImport();
}

function afterImport() {
  relationsUI?.refresh();
  places.forEach(refreshMarker); drawSecondary(); renderPlaces(); renderRows(); renderLegend();
  if (map) fitTo(overviewLatLngs(filteredPlaces()), true);
  if (selected) renderSelected();
}
$('#importFile').addEventListener('change', e => {
  const f = e.target.files[0]; if (!f) return;
  CORE.files.readText(f, {maxBytes: 5 * 1024 * 1024, extensions: ['csv', 'geojson', 'json', 'kml']})
    .then(text => importText(text, f.name))
    .catch(err => { $('#importReport').innerHTML = `<p class="acc">Không nhập: ${esc(err.message)}</p>`; });
  e.target.value = '';
});
$('#clearImport').onclick = () => {
  imported = {}; store.del(KEY_COORDS);
  $('#importReport').innerHTML = '<p>Đã xóa tọa độ đã nhập; các điểm trở về dữ liệu gốc.</p>';
  afterImport();
};
function download(name, text, type) { CORE.files.download(name, text, type); }
function exportProperties(id,l,extra={}) {
 return {...extra,id,role:l.role||null,vai_tro:V.location_role[l.role]||l.role||null,chinh:!!l.primary,status:l.status,accuracy_m:l.accuracy_m??null,
  date:l.date||null,device:l.device||null,by:l.by||null,source:l.source||null,source_text:l.source_text||l.file||null,note:l.note||null,
  imported_at:l.imported_at||null,history:l.history||[]};
}
$('#exportGeo').onclick=()=>{
 const features=places.flatMap(p=>[primaryLoc(p),...secondaryLocs(p)].filter(l=>hasLocation(l)&&l.map_visible!==false).map(l=>({type:'Feature',geometry:{type:'Point',coordinates:[l.lon,l.lat]},properties:exportProperties(p.id,l,{lop:'ho_so',so:placeCode(p),ten:p.name,loai:p.kind})})))
 .concat(ROWS.filter(r=>imported[r.id]).map(r=>({type:'Feature',geometry:{type:'Point',coordinates:[imported[r.id].lon,imported[r.id].lat]},properties:exportProperties(r.id,{...imported[r.id],primary:true},{lop:'dong_nguon_da_nhap',ten:r.name})})));
 download('champa-toa-do.geojson',JSON.stringify({type:'FeatureCollection',name:'Champa',crs_note:'EPSG:4326; [kinh độ, vĩ độ]',note:'Bản làm việc; nhập tệp không tự xác nhận thực địa. Không gồm các ứng viên KMZ chưa duyệt.',features},null,2),'application/geo+json');
};
$('#exportCsv').onclick=()=>{
 const head=['id','ten','lat','lon','status','accuracy_m','role','ngay_do','thiet_bi','nguoi_do','nguon','ghi_chu'];
 const row=(id,name,l)=>[id,name,l.lat??'',l.lon??'',l.status||'',l.accuracy_m??'',l.role||'',l.date||'',l.device||'',l.by||'',l.source_text||l.source||'',l.note||''];
 const rows=places.map(p=>row(p.id,p.name,primaryLoc(p))).concat(ROWS.map(r=>row(r.id,r.name,imported[r.id]||{})));
 download('champa-toa-do.csv','﻿'+[head.join(','),...rows.map(r=>r.map(csvQ).join(','))].join('\r\n'),'text/csv;charset=utf-8');
};
$('#exportPatch').onclick=async()=>{
 try{
  const changes=Object.entries(imported).filter(([id])=>PBY[id]||RBY[id]).map(([id,l])=>({id,target_type:PBY[id]?'profile':'source_row',before:l.base??(PBY[id]?T.snapshot(originalPrimary(PBY[id])):null),after:T.snapshot(PBY[id]?primaryLoc(PBY[id]):l),history:l.history||[]}));
  const payload={type:'ChampaCoordinatePatch',schema_version:'1.0',created_at:new Date().toISOString(),dataset_version:ENC?.version||null,crs:'EPSG:4326',note:'Bản vá làm việc, chưa tự động hợp nhất vào dữ liệu công bố.',changes};
  const hash=await T.digest(payload);const patch={...payload,checksum:hash?{algorithm:'SHA-256',value:hash}:null};
  download('champa-hieu-dinh-'+new Date().toISOString().slice(0,10)+'.json',JSON.stringify(patch,null,2),'application/json');
  $('#importReport').textContent='Đã xuất '+changes.length+' hiệu đính'+(hash?' kèm mã kiểm toàn vẹn SHA-256.':' (trình duyệt không hỗ trợ mã kiểm toàn vẹn).');
 }catch(e){$('#importReport').textContent='Không xuất được bản vá: '+e.message;}
};

/* ---------- Khởi động ---------- */
const homeBrand=document.querySelector(".brand-home");
if(homeBrand) homeBrand.href=location.pathname;
const nThap = ROWS.filter(r => r.table_type === 'nhom_thap'), nCT = nThap.reduce((s, r) => s + (r.structure_count_source || 0), 0);
$('#pill').textContent = `${DISPLAY.length} hồ sơ · ${ROWS.length} dòng nguồn`;
$('#tabP').textContent = `Di tích (${DISPLAY.length})`;
$('#tabR').textContent = `Dòng nguồn (${ROWS.length})`;
$('#about').innerHTML = `<p>${esc((A.meta.publication_note || '').replace(/^Nền corpus v1\.1 · đính chính Hương Quế ngày 03\/11\/2026\. /, ''))}</p><p>${esc(A.meta.scope)}</p><p>Bảng nhóm tháp có ${nThap.length} dòng (${nCT} công trình theo quy ước đếm của sách); bảng phế tích có ${ROWS.length - nThap.length} dòng. Hai con số không cộng thành “tổng di tích”.</p><p>${esc(A.meta.admin_note)}</p><p>${esc(publicGpsCredit(A.meta.about_map))}</p>`;
document.body.classList.toggle('research', research);
$('#modePublic').setAttribute('aria-pressed', String(!research));
$('#modeResearch').setAttribute('aria-pressed', String(research));
renderLayerControls();
setTab('P'); fillTableSets();
syncWorkspace();
if (map) places.forEach(p => { const l = primaryLoc(p); if(hasLocation(l))markers[p.id].setLatLng([l.lat, l.lon]); });
const initial = renderPlaces();
renderRows(); renderLegend(); drawSecondary();
if (map) { lastKey = initial.map(p => p.id).join(','); fitTo(hasChampaSources() ? [...placeLatLngs(regionalPlaces(initial)),[16.5,112.0],[10.0,114.2]] : placeLatLngs(initial)); }
relationsUI=window.initChampaRelations({map,places,sources:SRC,primaryLoc,statusOf,choose,chooseEntity,download,isResearch:()=>research && hasChampaSources() && (workspace!=='tong-hop'||enabledOverlays.has('champa'))});
fromHash();
window.addEventListener('resize', () => { if (map) map.invalidateSize(); });
window.__BDS_APP__ = {choose, chooseRow, openTable, closeTable};
window.CHAMPA_I18N?.init({refresh:()=>{renderPlaces();renderRows();renderLegend();if(selected&&!$('#detail').hidden)renderSelected();},isResearch:()=>research,workspace:workspaceText});
compactProjectMentions($("#about"));
})();
