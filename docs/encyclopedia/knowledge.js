'use strict';
(()=>{
const K=window.CHAMPA_KNOWLEDGE,D=K.data,R=K.research,C=K.corpora?.corpora||[];
const E=Object.fromEntries(D.entities.map(e=>[e.id,e])),SR=Object.fromEntries(R.source_dossiers.map(e=>[e.id,e]));
const CR=Object.fromEntries(C.map(c=>[c.id,c]));
const labels={...K.labels,institution:'Bảo Tàng',corpus:'Corpus liên ngành',source_row:'Dòng nguồn sách',bibliography_source:'Thư mục Champa và Sa Huỳnh',comparative_source:'Thư mục đối sánh',bibliography_guide:'Hướng dẫn nguồn theo mục từ'},statuses={table_comparison_candidate:'Đối chiếu bảng — ứng viên',not_located_in_selected_table:'Chưa nối được trong bảng đã đọc',awaiting_scholarly_crosscheck:'Chờ đối chiếu học thuật mới'};
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const norm=v=>String(v??'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').replace(/[\s.\-_:]/g,'');
const url=v=>{try{const raw=String(v??'').trim(),abs=/^[a-z][a-z0-9+.-]*:/i.test(raw.replace(/[\u0000-\u0020]/g,'')),u=new URL(raw,location.href);/* file: chỉ khi là đường dẫn tương đối của chính gói (mở trên máy) */return ['http:','https:'].includes(u.protocol)||(u.protocol==='file:'&&!abs)?esc(raw):'#';}catch{return '#';}};
const old=e=>e?.identifiers?.find(i=>i.scheme==='atlas_legacy')?.value;
const params=new URLSearchParams(location.search);
let language=params.get('lang')==='en'?'en':'vi';
const recordHref=id=>`record.html?id=${encodeURIComponent(id)}${language==='en'?'&amp;lang=en':''}`;
const inscriptionLabels={
 vi:{title:'Nội dung văn khắc',summary:'Tóm lược từ bản đọc và bản dịch',excerpt:'Dịch đoạn chọn hoặc văn bản ngắn',reading:'Ghi chú bản đọc và hiện vật',sources:'Ấn bản đối chiếu',locator:'Đoạn đối chiếu',corpus:'Corpus văn khắc Champa v3.4.7'},
 en:{title:'Inscription text',summary:'Summary of the edition and translation',excerpt:'Translation of a selected passage or short text',reading:'Notes on the reading and object',sources:'Editions and references',locator:'Passage consulted',corpus:'Champa Inscription Corpus v3.4.7'}
};
function inscriptionContent(e){
 const entry=e.data.bilingual_content;
 if(!entry)return '';
 const strings=inscriptionLabels[language];
 const options=['vi','en'].map(lang=>`<button type="button" data-inscription-lang="${lang}" lang="${lang}" aria-label="${lang==='vi'?'Tiếng Việt':'English'}" aria-pressed="${lang===language}">${lang.toUpperCase()}</button>`).join('');
 return `<section class="panel inscription-content" lang="${language}">
  <div class="inscription-heading"><h2>${strings.title}</h2><div class="inscription-languages" role="group" aria-label="Ngôn ngữ nội dung / Content language">${options}</div></div>
  <p class="badge">${strings[entry.kind]}</p>${paragraphs(entry[language])}
  <p class="source-note">${strings.locator} · ${esc(entry.locator)}</p>
  <h3>${strings.sources}</h3><ul>${entry.sources.map(ref=>`<li><a href="${url(ref.url)}" target="_blank" rel="noopener noreferrer">${esc(ref.label)} ↗</a></li>`).join('')}</ul>
  <p class="source-note">${strings.corpus} · ${esc(old(e))}</p>
 </section>`;
}

const entityLink=id=>E[id]?`<a href="${recordHref(id)}">${esc(E[id].title)}</a>`:'';
const sourceLink=id=>entityLink(K.registry['reference:'+id]);
const corpusLink=id=>CR[id]?`<a href="${recordHref(id)}">${esc(CR[id].short_title)}</a>`:'';
const atlasLink=(id,label)=>`<a href="../?lang=${language}#${encodeURIComponent(id)}">${esc(label||'Mở trong bản đồ')} ↗</a>`;
const assetBase='../';
const museumReviewUrl=path=>url(assetBase+path);
const museumReview=document.querySelector('a[href="../documents/champa-hai-bao-tang.html#doi-chieu-efeo"]');
if(museumReview)museumReview.href=museumReviewUrl('documents/champa-hai-bao-tang.html#doi-chieu-efeo');
document.querySelectorAll('.brand img').forEach(img=>{img.src=assetBase+'assets/branding/identity-v1/logos/mark-do-gach.svg';});
const paragraphs=t=>String(t||'').split(/\n\s*\n/).map(p=>`<p>${esc(p)}</p>`).join('');
const fields=(o,keys)=>`<dl class="facts">${keys.filter(([k])=>o[k]!==undefined&&o[k]!==null&&o[k]!=='').map(([k,l])=>`<dt>${esc(l)}</dt><dd>${esc(typeof o[k]==='object'?JSON.stringify(o[k]):o[k])}</dd>`).join('')}</dl>`;
function parentTitle(e){const p=D.entities.find(p=>p.type==='place'&&old(p)===e.data.place);return e.title+(e.type==='structure'&&p?' ('+p.title+')':'');}
function referenceList(ids){return `<div class="links">${[...new Set(ids)].map(entityLink).join('')}</div>`;}
function article(e){
 if(!e.data.article_html||!window.AtlasCore)return '';
 const box=document.createElement('div');box.innerHTML=window.AtlasCore.sanitizeHTML(e.data.article_html);
 box.querySelectorAll('.article-date').forEach(p=>p.textContent=p.textContent.replace(/Biên soạn:\s*Lê Trí Công\s*[·—-]?\s*/g,''));
 box.querySelectorAll('img[src^="assets/"]').forEach(img=>img.setAttribute('src',assetBase+img.getAttribute('src')));
 box.querySelectorAll('a[href^="assets/"],a[href^="my-son-ban-ve.html"]').forEach(a=>a.setAttribute('href',assetBase+a.getAttribute('href')));
 const citations=Object.fromEntries(D.relations.filter(r=>r.source===e.id&&r.type==='numbered_reference').map(r=>[r.note.match(/\[(\d+)\]/)?.[1],r.target]));
 const walker=document.createTreeWalker(box,NodeFilter.SHOW_TEXT),texts=[];while(walker.nextNode())texts.push(walker.currentNode);
 for(const node of texts){if(node.parentElement.closest('a,script,style'))continue;const text=node.textContent,matches=[...text.matchAll(/\[(\d+)\]/g)];if(!matches.length)continue;const f=document.createDocumentFragment();let p=0;for(const m of matches){f.append(text.slice(p,m.index));const id=citations[m[1]];if(id){const a=document.createElement('a');a.href='record.html?id='+encodeURIComponent(id);a.textContent=m[0];f.append(a);}else f.append(m[0]);p=m.index+m[0].length;}f.append(text.slice(p));node.replaceWith(f);}
 return '<details class="panel"><summary>Bài giới thiệu đầy đủ từ hồ sơ atlas</summary>'+box.innerHTML+'</details>';
}
function renderSource(d){
 const r=d.source_record,v=d.northern_review;
 const corpusLinks=C.filter(c=>c.linked_source_row_ids.includes(d.id));
 return `<p class="eyebrow">Dòng nguồn · ${esc(d.id)}</p><h1>${esc(d.title)}</h1><p>${atlasLink(d.id,'Xem dòng sách trên bản đồ')}</p><p class="badge warn">${esc(statuses[d.review_status])}</p><aside class="notice">Bài biên soạn và dữ liệu dòng sách được trình bày riêng; định danh và vị trí chưa được tự nâng mức xác minh. Tọa độ ứng viên không được nâng mức kiểm chứng bởi liên kết thư mục.</aside>${corpusLinks.length?`<section class="panel corpus-links"><b>Đối chiếu trong thư mục corpus</b><div class="links">${corpusLinks.map(c=>corpusLink(c.id)).join('')}</div></section>`:''}${window.ChampaNorth?.render(d.id)||''}<h2>Dữ liệu dòng sách được bảo toàn</h2>${fields(r,[['name_raw','Tên chép từ sách'],['source_row_id','Mã dòng bảng'],['province_source','Tỉnh theo nguồn'],['address_source','Địa chỉ theo nguồn'],['printed_page','Trang in của sách'],['status_source','Tình trạng theo sách'],['status_current','Hiện trạng đang ghi'],['verification','Mức kiểm bản chép']])}<p class="source-note">${esc(d.base_reference)}</p>${v?`<details class="panel"><summary>Ghi chú đối chiếu một tài liệu khảo cổ</summary><section><p>${sourceLink(v.source_id)} · ${esc(v.locator)}</p>${fields(v,[['source_name','Tên trong luận án'],['read_method','Phạm vi kiểm'],['coordinate_action','Tọa độ']])}<p>${esc(v.observation)}</p><p class="source-note">Kết quả trong nguồn phản ánh thời điểm khảo sát của tác giả. Liên kết danh tính vẫn cần rà soát.</p></section></details>${v.eclevi?`<h2>Đầu mối ảnh ECLEVI / PACHA</h2><section class="panel"><p><a href="${url(v.eclevi.url)}" target="_blank" rel="noopener noreferrer">${esc(v.eclevi.caption_name)} ↗</a></p><p>${esc(v.eclevi.note)}</p><p>${sourceLink(v.eclevi.source_id)}</p></section>`:''}`:''}${d.id==='BDS-0053'?`<h2>Lịch sử nguồn Giám Biều</h2><p>BAVH 1915 dẫn lại khảo tả Parmentier 1909; Parmentier 1919 bàn lại tư liệu BAVH. Các ghi chép phụ thuộc nhau, không phải ba xác nhận độc lập.</p><div class="links">${sourceLink('S-NORTH-BAVH1915')}${sourceLink('S-NORTH-PAR1909')}${sourceLink('S-NORTH-PAR1919-HUE')}</div>`:''}${d.parmentier_leads.length?`<h2>Đầu mối Parmentier OCR</h2><p>Chưa kiểm ảnh trang; không dùng làm bằng chứng đồng nhất.</p>${d.parmentier_leads.map(x=>`<section class="panel"><code>${esc(x.item_id)}</code><p>${esc(x.item_text)}</p><p class="source-note">Tập ${esc(x.volume)} · trang đề xuất ${esc(x.page_de_xuat??'chưa xác định')}</p></section>`).join('')}`:''}<h2>Liên kết hồ sơ</h2><div class="links">${d.profile_links.map(l=>atlasLink(l.profile_id,l.profile_id)+(l.relation==='related_not_identical'?' (liên quan, không đồng nhất)':' (đề xuất cùng di tích)')).join('')||'<p>Chưa có phép nối hồ sơ biên soạn.</p>'}</div><h2>Việc còn phải kiểm</h2><ul>${d.next_checks.map(t=>`<li>${esc(t)}</li>`).join('')}</ul><p>${sourceLink('S-NORTH-PAR1909')&&v?'Các nguồn khảo tả khác phải bổ sung định vị riêng trước khi dùng hỗ trợ mệnh đề.':''}</p>`;
}
function renderCorpus(c){
 const grouped=c.entity_types.map(t=>[t,c.linked_entity_ids.map(id=>E[id]).filter(e=>e?.type===t)]).filter(([,rows])=>rows.length);
 const rows=c.linked_source_row_ids.map(id=>SR[id]).filter(Boolean);
 return `<p class="eyebrow">Corpus liên ngành · <code>${esc(c.id)}</code></p><h1>${esc(c.title)}</h1><p class="intro">${esc(c.public_summary)}</p><div class="stats">${[[c.counts.encyclopedia_entities,'mục từ Bách khoa'],[c.counts.atlas_records,'bản ghi atlas'],[c.counts.source_rows,'dòng nguồn liên quan']].map(([v,l])=>`<div class="stat"><b>${v}</b><small>${l}</small></div>`).join('')}</div><aside class="notice">${esc(K.corpora.scope_note)}</aside>${fields(c,[['version','Phiên bản corpus'],['canonical_source','Nguồn chuẩn'],['source_state','Trạng thái nguồn'],['scope','Phạm vi ảnh chụp']])}${c.sha256?`<p class="source-note">SHA-256 bản chuẩn trong registry: <code>${esc(c.sha256)}</code></p>`:''}<h2>Giới hạn kiểm chứng</h2><ul>${c.limits.map(x=>`<li>${esc(x)}</li>`).join('')}</ul>${c.source_titles?.length?`<h2>Nguồn kiến trúc được định tuyến</h2><ul>${c.source_titles.map(x=>`<li>${esc(x)}</li>`).join('')}</ul>`:''}<h2>Quy tắc nhập vào hồ sơ</h2><ul>${K.corpora.review_policy.map(x=>`<li>${esc(x)}</li>`).join('')}</ul>${grouped.map(([t,items])=>`<details class="panel"><summary>${esc(labels[t])} (${items.length})</summary><div class="links">${items.map(e=>entityLink(e.id)).join('')}</div></details>`).join('')}${rows.length?`<details class="panel"><summary>Dòng nguồn liên quan (${rows.length})</summary><div class="links">${rows.map(d=>`<a href="record.html?id=${encodeURIComponent(d.id)}">${esc(d.id+' · '+d.title)}</a>`).join('')}</div></details>`:''}`;
}
function bibliographyLinks(id){
 const books=window.CHAMPA_BIBLIOGRAPHY?.books||[];
 const cited=books.filter(b=>b.reference_entity_ids.includes(id)||b.cited_by_entity_ids.includes(id));
 const suggested=books.filter(b=>b.proposed_profile_ids.includes(id)&&!cited.includes(b));
 const guides=(window.CHAMPA_BIBLIOGRAPHY?.topics||[]).filter(topic=>topic.profile_ids?.includes(id));
 const links=items=>items.map(b=>'<a href="bibliography.html?id='+encodeURIComponent(b.bib_id)+'">'+esc(b.title)+'</a>').join('');
 return (guides.length?'<section class="panel"><h2>Giếng Chăm · Nguồn và chứng cứ</h2><p><a href="gieng-cham-gieng-chim.html">Khung gỗ và giả thuyết giếng chìm · bài có minh họa</a></p><div class="links">'+
   guides.map(topic=>'<a href="bibliography.html?topic='+encodeURIComponent(topic.topic_id)+'">'+esc(topic.title)+'</a>').join('')+'</div></section>':'')+
  (cited.length?'<section class="panel"><h2>Thư mục học thuật liên quan</h2><div class="links">'+links(cited)+'</div></section>':'')+
  (suggested.length?'<section class="panel"><h2>Gợi ý tài liệu để đối chiếu</h2><div class="links">'+links(suggested)+'</div></section>':'');
}
function renderEntity(e){
 const t=e.data,legacy=old(e),review=R.profile_reviews.find(p=>p.entity_id===e.id);
 const claims=D.statements.filter(s=>s.entity_id===e.id),out=D.relations.filter(r=>r.source===e.id&&r.status!=='retired'),incoming=D.relations.filter(r=>r.target===e.id&&r.status!=='retired'),cites=out.filter(r=>['cites','numbered_reference'].includes(r.type)).map(r=>r.target);
 const route={place:legacy,object:'entity:object:'+legacy,inscription:'entity:inscription:'+legacy,reference:'entity:source:'+legacy}[e.type]||t.place;
 const assessment=R.source_assessments.find(s=>s.entity_id===e.id);
 const textKeys=[['intro','Khái quát'],['subtitle','Chủ điểm'],['date','Niên đại ghi trong hồ sơ'],['languages','Ngôn ngữ'],['inventory','Số kiểm kê'],['found','Nơi phát hiện'],['kept','Nơi lưu giữ'],['dims','Kích thước theo nguồn'],['content','Nội dung'],['citation','Thư mục'],['notes','Ghi chú'],['note','Lưu ý']];
 const corpusLinks=C.filter(c=>c.linked_entity_ids.includes(e.id));
 const bilingual=e.type==='inscription'?inscriptionContent(e):'';
 let h=`<p class="eyebrow">${esc(labels[e.type])} · <code>${esc(e.id)}</code></p><h1>${esc(parentTitle(e))}</h1>${e.aliases.length?`<p class="muted">Tên khác: ${esc(e.aliases.join(' · '))}</p>`:''}<p class="links">${route?atlasLink(route):''}${t.article_path?`<a href="${url(t.article_path)}">Đọc bài chuyên đề →</a>`:''}</p><aside class="notice">Mục từ giữ mức chứng cứ của hồ sơ gốc. Các ghi chú rà soát dưới đây chỉ xác nhận phạm vi đã đọc, chưa thẩm định lại toàn bộ.</aside>${corpusLinks.length?`<section class="panel corpus-links"><b>Đối chiếu trong thư mục corpus</b><div class="links">${corpusLinks.map(c=>corpusLink(c.id)).join('')}</div></section>`:''}${review?`<section class="panel"><h2>Ghi nhận rà soát ${esc(review.review_date||'04/11/2026')}</h2><p>${esc(review.review_summary)}</p><p class="source-note">${esc(review.locator)}</p>${review.reference_id?entityLink(review.reference_id):''}<p class="source-note">Hồ sơ atlas hiện liệt kê ${review.listed_source_count} nguồn; số lượng nguồn không tự chứng minh độ đúng của mọi câu.</p></section>`:''}${bilingual}${textKeys.filter(([k])=>t[k]&&(k!=='content'||!bilingual)).map(([k,l])=>`<section><h2>${esc(l)}</h2>${paragraphs(t[k])}</section>`).join('')}`;
 if(t.museum_efeo_url)h+=`<p><a href="${museumReviewUrl(t.museum_efeo_url)}">Đối chiếu hồ sơ EFEO ↗</a></p>`;
 if(t.museum_efeo_url&&t.source_locators?.length)h+=`<h2>Định vị nguồn</h2><ul>${t.source_locators.map(l=>{
   const ref=E[l.reference_id];
   const link=ref?.data?.url?`<a href="${url(ref.data.url)}" target="_blank" rel="noopener noreferrer">${esc(parentTitle(ref))} ↗</a>`:entityLink(l.reference_id);
   return `<li>${link} · ${esc(l.locator)}</li>`;
 }).join('')}</ul>`;

 if(e.type==='institution'){
  const held=D.relations.filter(r=>r.type==='held_by'&&r.target===e.id&&r.status!=='retired').map(r=>E[r.source]).filter(o=>o?.type==='object');
  const unique=[...new Map(held.map(o=>[o.id,o])).values()];
  const groups=new Map();
  for(const o of unique){const site=D.entities.find(p=>p.type==='place'&&old(p)===o.data.place);const group=o.data.collection_group||site?.title||'Chưa phân nhóm theo xuất xứ';if(!groups.has(group))groups.set(group,[]);groups.get(group).push(o);}
  if(unique.length)h+=`<section class="panel museum-collections"><h2>Hồ sơ điêu khắc liên kết (${unique.length})</h2><p>Nhóm theo xuất xứ được hồ sơ ghi nhận; nơi lưu giữ và phong cách là các trường riêng. Số lượng dưới đây là hồ sơ đã nối trong Bách Khoa, không phải tổng kiểm kê của bảo tàng.</p>${[...groups].map(([group,objects])=>`<h3>${esc(group)}</h3><div class="links">${objects.map(o=>`<a href="${recordHref(o.id)}">${esc(o.title)} · ${esc(o.data.inventory||'chưa có số kiểm kê')}</a>`).join('')}</div>`).join('')}</section>`;
 }
 if(e.type==='object'){
  const museums=out.filter(r=>r.type==='held_by').map(r=>E[r.target]).filter(Boolean);
  if(museums.length)h+=`<section class="panel"><h2>Bảo Tàng lưu giữ</h2><div class="links">${museums.map(m=>entityLink(m.id)).join('')}</div><p>Đọc nguồn và thời điểm ghi nhận trong hồ sơ hiện vật trước khi dùng làm xác nhận hiện trạng.</p></section>`;
 }
 h+=article(e);
 if(t.url&&t.access!=='noi_bo')h+=`<p><a href="${url(t.url)}" target="_blank" rel="noopener noreferrer">Mở nguồn / trang thư mục ↗</a></p>`;
 if(assessment)h+=`<h2>Đã đọc đến đâu?</h2><section class="panel">${paragraphs(assessment.read_scope)}<p class="source-note">${esc(assessment.fulltext_access)}</p></section>`;
 if(legacy==='bang-an')h+=`<h2>Nguồn cần bổ sung cho Bằng An</h2><p>${sourceLink('S-BK-C141')} · ${sourceLink('S-MY-SON-REF-19')}</p><p>Boisselier tr.219–220 là đầu mối OCR đã đọc, cần khóa bằng ảnh trang. Không điền một năm dương lịch duy nhất cho phần niên đại bia bị khuyết.</p>`;
 if(claims.length)h+=`<h2>Mệnh đề và căn cứ (${claims.length})</h2><section class="panel">${claims.map(c=>`<article class="claim"><span class="badge">${esc(c.epistemic_layer)}</span> <span class="badge warn">${esc(c.support_status)}</span><p>${esc(c.text)}</p>${referenceList(c.reference_ids)}<p class="source-note">${c.source_locators.length?c.source_locators.map(l=>entityLink(l.reference_id)+': '+esc(l.locator)).join('<br>'):'Chưa có định vị trang/dòng cho mệnh đề.'}</p>${c.review_note?`<p class="source-note">${esc(c.review_note)}</p>`:''}</article>`).join('')}</section>`;
 if(cites.length)h+=`<h2>Nguồn của mục từ</h2>${referenceList(cites)}`;
 const related=out.filter(r=>!['cites','numbered_reference','illustrated_by'].includes(r.type));
 const pictures=out.filter(r=>r.type==='illustrated_by').map(r=>D.media.find(m=>m.id===r.target)).filter(m=>m&&m.status!=='retired'&&m.path);
 if(pictures.length)h+=`<details class="panel" id="tu-lieu-anh"><summary>Tư liệu ảnh (${pictures.length})</summary><div class="gallery">${pictures.map(m=>`<figure><a href="${url(assetBase+m.path)}" target="_blank" rel="noopener noreferrer"><img loading="lazy" decoding="async" src="${url(assetBase+(m.source_record?.thumbnail||m.path))}" alt="${esc(m.source_record?.alt||m.title)}"></a><figcaption>${esc(m.title)}<br>${m.source_record?.caption?`<span>${esc(m.source_record.caption)}</span><br>`:''}<small>${esc(m.credit)} · Quyền sử dụng: ${esc(({permission_recorded:'Có ghi nhận phép dùng trong dự án',public_domain_original:'Tác phẩm gốc hết hạn; quyền bản số chưa kiểm',review_required:'Còn kiểm quyền bản số',permission_pending:'Chờ phép công bố'})[m.rights_status]||m.rights_status)}</small></figcaption></figure>`).join('')}</div></details>`;
 if(related.length)h+=`<h2>Mục từ liên quan</h2><section class="panel">${related.map(r=>`<p>${esc(r.type)} → ${entityLink(r.target)} <small>${esc(r.note)}</small></p>`).join('')}</section>`;
 if(incoming.length)h+=`<h2>Được dẫn / liên kết từ</h2>${referenceList(incoming.map(r=>r.source))}`;
 const reviewedBy=R.profile_reviews.filter(p=>p.reference_id===e.id);
 if(reviewedBy.length)h+=`<h2>Được dùng trong ghi chú rà soát</h2>${referenceList(reviewedBy.map(p=>p.entity_id))}`;
 const rows=R.source_dossiers.filter(d=>e.type==='place'?d.profile_links.some(l=>l.profile_id===legacy):d.northern_review&&(d.northern_review.source_id===legacy||d.northern_review.eclevi?.source_id===legacy));
 if(rows.length)h+=`<h2>Dòng sách liên quan (${rows.length})</h2><div class="links">${rows.map(d=>`<a href="record.html?id=${d.id}">${esc(d.id+' · '+d.title)}</a>`).join('')}</div>`;
 const lineage=R.source_lineage.filter(l=>l.source===legacy||l.target===legacy);
 if(lineage.length)h+=`<h2>Quan hệ giữa các nguồn</h2><section class="panel">${lineage.map(l=>`<p>${sourceLink(l.source)} → ${esc(l.type)} → ${sourceLink(l.target)}<br><small>${esc(l.locator)} · ${esc(l.note)}</small></p>`).join('')}</section>`;
 return h+bibliographyLinks(e.id);
}
const record=document.getElementById('record');
if(record){
 const raw=params.get('id')||'';
 const own=(table,key)=>Object.hasOwn(table,key)?table[key]:undefined;
 const id=[CR,SR,E].some(table=>Object.hasOwn(table,raw))?raw:own(K.registry,'place:'+raw)||own(K.registry,raw)||raw;
 const corpus=own(CR,id),source=own(SR,id),d=corpus||source||own(E,id);
 document.title=(d?.title||'Không tìm thấy mục')+' · Bách Khoa';
 function renderRecord(){
  const back=d?.type==='inscription'?'./?type=inscription'+(language==='en'?'&amp;lang=en':''):'./';
  record.innerHTML=`<nav class="backlinks"><a href="${back}">← Tra cứu Bách khoa</a></nav>`+
   (d?(corpus?renderCorpus(d):source?renderSource(d):renderEntity(d)):'<h1>Chưa tìm thấy mục</h1><p>Kiểm lại mã hoặc trở về danh mục để tìm tên.</p>');
 }
 renderRecord();
 if(d?.type==='inscription')record.addEventListener('click',event=>{
  const next=event.target.closest('button[data-inscription-lang]')?.dataset.inscriptionLang;
  if(!next||next===language)return;
  language=next;
  const target=new URL(location.href);
  target.searchParams.set('lang',language);
  history.replaceState(history.state,'',target.pathname+target.search+target.hash);
  const galleryOpen=record.querySelector('#tu-lieu-anh')?.open;
  renderRecord();
  if(galleryOpen)record.querySelector('#tu-lieu-anh').open=true;
  record.querySelector('button[aria-pressed="true"]').focus({preventScroll:true});
 });
 function openPhotoGallery(){
  const gallery=document.getElementById('tu-lieu-anh');
  if(location.hash!=='#tu-lieu-anh'||!gallery)return;
  gallery.open=true;
  gallery.scrollIntoView();
 }
 window.addEventListener('hashchange',openPhotoGallery);
 openPhotoGallery();
 return;
}
const q=document.getElementById('q'),type=document.getElementById('type'),province=document.getElementById('province'),status=document.getElementById('status');
Object.entries(labels).filter(([k])=>k!=='source_row').forEach(([k,v])=>type.add(new Option(v,k)));
Object.keys(R.coverage.by_province).sort((a,b)=>a.localeCompare(b,'vi')).forEach(p=>province.add(new Option(p,p)));
const all=[...C.map(c=>({id:c.id,title:c.title,type:'corpus',province:'',subtitle:c.public_summary,status:'',raw:c})),...D.entities.filter(e=>e.data.bibliographic!==false).map(e=>({id:e.id,title:parentTitle(e),type:e.type,province:'',subtitle:e.aliases.join(' · ')||e.data.short||old(e),status:'',raw:e})),...R.source_dossiers.map(d=>({id:d.id,title:d.title,type:'source_row',province:d.province,subtitle:d.scholarly_article?.subtitle||d.source_record.address_source||'Địa chỉ để trống trong sách',status:d.review_status,raw:d}))];
const bibliography=window.CHAMPA_BIBLIOGRAPHY;
for(const b of bibliography?.books||[]){
 const bibliographyType=b.collection==='oe-fc'?'comparative_source':'bibliography_source';
 all.push({id:b.bib_id,title:b.title,type:bibliographyType,province:'',status:'',
  subtitle:[b.author,b.year,b.domain].filter(Boolean).join(' · '),raw:b,searchText:b.edition||b.publication,
  href:'bibliography.html?id='+encodeURIComponent(b.bib_id)});
}
for(const topic of bibliography?.topics||[]){
 all.push({id:topic.topic_id,title:topic.title,type:'bibliography_guide',province:'',status:'',
  subtitle:'Óc Eo – Phù Nam – Chân Lạp',raw:topic,searchText:topic.locator_guidance,
  href:'bibliography.html?topic='+encodeURIComponent(topic.topic_id)});
}
document.getElementById('stats').innerHTML=[[C.length,'corpus liên ngành'],[D.entities.length,'mục từ có mã ổn định'],[R.source_dossiers.length,'dòng nguồn riêng'],[R.coverage.northern_rows,'hồ sơ Bắc Champa']].map(([v,l])=>`<div class="stat"><b>${v}</b><small>${l}</small></div>`).join('');
function filter(){const term=norm(q.value),list=all.filter(x=>(!type.value||x.type===type.value)&&(!province.value||x.province===province.value)&&(!status.value||(status.value==='northern'?!!x.raw.northern_review:status.value==='eclevi'?!!x.raw.northern_review?.eclevi:x.status===status.value))&&norm([x.title,x.id,x.subtitle,x.type==='source_row'?x.raw.northern_review?.source_name||'':old(x.raw),x.raw.aliases?.join(' ')||'',x.raw.data?.inventory||'',x.type==='reference'?x.raw.data.citation||'':'',x.searchText||''].join(' ')).includes(term));document.getElementById('count').textContent=list.length+' kết quả · '+(type.value?labels[type.value]:'mục từ và dòng nguồn');document.getElementById('results').innerHTML=list.map(x=>`<a class="result" href="${x.href||recordHref(x.id)}"><span class="badge">${esc(labels[x.type])}</span><h3>${esc(x.title)}</h3><p>${esc(x.id)}${x.province?' · '+esc(x.province):''}</p><p>${esc(x.subtitle)}</p>${x.status?`<span class="badge warn">${esc(statuses[x.status])}</span>`:''}</a>`).join('')||'<p class="empty">Không có kết quả. Thử bỏ một bộ lọc hoặc tìm tên khác.</p>';}
q.value=params.get('q')||'';if(params.get('type'))type.value=params.get('type');if(params.get('status'))status.value=params.get('status');[q,type,province,status].forEach(el=>el.addEventListener(el===q?'input':'change',filter));document.getElementById('reset').onclick=()=>{q.value=type.value=province.value=status.value='';filter();q.focus();};filter();
})();
