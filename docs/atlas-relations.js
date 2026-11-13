/* Research overlay. Explicit provenance observations, never inferred historical routes. */
(function(root){
'use strict';
const esc=s=>String(s??'').replace(/[&<>"'`]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;','`':'&#96;'}[c]));
// URL qua bộ lọc của lõi; thiếu lõi thì không xuất liên kết (an toàn mặc định)
const safeHref=u=>esc(root.AtlasCore?root.AtlasCore.safeUrl(u):'');
function filter(records,f){return records.filter(r=>(!f.place||[r.from_place,r.to_place].includes(f.place))&&(!f.status||r.status===f.status)&&(!f.kind||r.type===f.kind)&&(!f.q||(r.title+' '+r.found+' '+r.kept).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').includes(f.q.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'')))&&((!f.min&&!f.max)||((r[f.timeField]===null||r[f.timeField]===undefined)?f.unknown:(!f.min||r[f.timeField]>=f.min)&&(!f.max||r[f.timeField]<=f.max))));}
root.CHAMPA_RELATION_UTILS={filter};
root.initChampaRelations=function(api){
 const data=root.CHAMPA_RELATIONS;if(!data)return {refresh(){}};
 const $=id=>document.getElementById(id),panel=$('relationsPanel'),toggle=$('relationsToggle'),list=$('relationList'),summary=$('relationCount');
 const layer=api.map?L.layerGroup():null,places=Object.fromEntries(api.places.map(p=>[p.id,p]));
 let active=null,current=[];
 const text=s=>String(s??'').replace(/Lê Trí Công/g,'tác giả dự án');
 Object.entries(data.types).forEach(([value,label])=>$('relationKind').add(new Option(label,value)));
 api.places.forEach(p=>$('relationPlace').add(new Option(p.name,p.id)));
 const sourceLink=id=>{const s=api.sources[id];return s?(s.url?`<a href="${safeHref(s.url)}" target="_blank" rel="noopener noreferrer">${esc(text(s.short||s.citation))} ↗</a>`:esc(text(s.citation))):'chưa có';};
 function endpoint(id){const l=id&&places[id]?api.primaryLoc(places[id]):null;return Number.isFinite(l?.lat)&&Number.isFinite(l?.lon)?l:null;}
 function draw(){
  if(!layer)return;layer.clearLayers();if(!api.isResearch()||!toggle.checked){layer.remove();return;}layer.addTo(api.map);
  const groups=new Map();current.forEach(r=>{if(!endpoint(r.from_place)||!endpoint(r.to_place))return;const key=r.from_place+'|'+r.to_place;if(!groups.has(key))groups.set(key,[]);groups.get(key).push(r);});
  groups.forEach(rows=>{const r=rows[0],a=endpoint(r.from_place),b=endpoint(r.to_place),selected=rows.some(x=>x.id===active),candidate=rows.every(x=>x.status==='project_record_needs_source');
   const line=L.polyline([[a.lat,a.lon],[b.lat,b.lon]],{color:selected?'#a44a21':candidate?'#8b6377':'#156a8a',weight:selected?5:3,opacity:.88,dashArray:candidate?'3 7':'9 5'}).addTo(layer);
   line.bindTooltip(esc(places[r.from_place].name+' → '+places[r.to_place].name+' · '+rows.length+' hiện vật')+'<br>Liên hệ xuất xứ–lưu giữ; không phải lộ trình.');
   line.on('click',()=>openRecord(rows[0].id));
  });
 }
 function openRecord(id){active=id;const node=list.querySelector('[data-relation-id="'+id+'"]');if(node){node.open=true;node.tabIndex=-1;node.focus({preventScroll:true});node.scrollIntoView({behavior:'smooth',block:'nearest'});}draw();}
 function render(){
  const min=Number($('relationFrom').value)||null,max=Number($('relationTo').value)||null;
  if(min&&max&&min>max){summary.textContent='Khoảng năm không hợp lệ: năm đầu phải nhỏ hơn hoặc bằng năm cuối.';current=[];list.innerHTML='';draw();return;}
  current=filter(data.records,{place:$('relationPlace').value,status:$('relationStatus').value,kind:$('relationKind').value,q:$('relationSearch').value,timeField:$('relationTime').value,min,max,unknown:$('relationUnknown').checked});
  const located=current.filter(r=>endpoint(r.from_place)&&endpoint(r.to_place)).length;
  summary.textContent=current.length+' / '+data.records.length+' quan hệ · '+located+' có hai đầu điểm để vẽ. '+(toggle.checked&&api.isResearch()?'Lớp đang bật.':'Lớp đang tắt.');
  list.innerHTML=current.length?current.map(r=>{
   const from=places[r.from_place]?.name||r.from_place,to=places[r.to_place]?.name||r.kept;
   const origin=endpoint(r.from_place),dest=endpoint(r.to_place);
   const locators=(r.source_locators||[]).map(x=>'<li>'+sourceLink(x.source_id)+': '+esc(text(x.locator))+'</li>').join('');
   return `<details class="relation-card${r.id===active?' active':''}" data-relation-id="${esc(r.id)}"${r.id===active?' open':''}><summary>${esc(r.title)}<small>${esc(from)} → ${esc(to)}</small></summary><span class="relation-status ${r.status==='project_record_needs_source'?'needs-source':''}">${esc(data.statuses[r.status])}</span><p><b>Nơi phát hiện:</b> ${esc(text(r.found))}</p><p><b>Nơi lưu giữ theo hồ sơ:</b> ${esc(r.kept)}</p><p><b>Năm phát hiện:</b> ${r.discovery_year?(r.discovery_approximate?'khoảng ':'')+r.discovery_year:'chưa nhập năm xác định'}<br><b>Năm nguồn lưu giữ:</b> ${r.source_year||'chưa rõ năm công bố'}<br><b>Năm chuyển hiện vật:</b> chưa biết</p><p><b>Nguồn lưu giữ:</b> ${sourceLink(r.source_id)}</p>${r.reference_ids.length?'<details><summary>Các nguồn và định vị đã có</summary><ul>'+r.reference_ids.map(id=>'<li>'+sourceLink(id)+'</li>').join('')+locators+'</ul></details>':''}<p class="acc">${esc(text(r.note))}</p><p class="acc">Hai điểm bản đồ là vị trí đại diện: ${origin?esc(api.statusOf(origin.status).label):'chưa định vị'} / ${dest?esc(api.statusOf(dest.status).label):'chưa có tọa độ nơi lưu giữ'}. Không xác định hành trình hoặc ngày di chuyển.</p><div class="relation-actions"><button type="button" data-object="${esc(r.object_id)}">Mở hồ sơ hiện vật</button><button type="button" data-origin="${esc(r.from_place)}">Nơi phát hiện</button>${r.to_place?'<button type="button" data-target="'+esc(r.to_place)+'">Nơi lưu giữ</button>':''}<button type="button" data-show="${esc(r.id)}">Chọn quan hệ</button></div></details>`;
  }).join(''):'<p>Không có quan hệ khớp bộ lọc. Chưa có dữ liệu không đồng nghĩa quan hệ lịch sử không tồn tại.</p>';
  list.querySelectorAll('[data-object]').forEach(b=>b.onclick=()=>api.chooseEntity('object',b.dataset.object));
  list.querySelectorAll('[data-origin]').forEach(b=>b.onclick=()=>api.choose(places[b.dataset.origin],{focus:true}));
  list.querySelectorAll('[data-target]').forEach(b=>b.onclick=()=>api.choose(places[b.dataset.target],{focus:true}));
  list.querySelectorAll('[data-show]').forEach(b=>b.onclick=()=>openRecord(b.dataset.show));
  draw();
 }
 function open(){const tools=panel.closest(".research-tools");if(tools)tools.open=true;panel.open=true;toggle.checked=true;render();if(api.map){const points=current.flatMap(r=>[endpoint(r.from_place),endpoint(r.to_place)]).filter(Boolean);if(points.length)api.map.fitBounds(L.latLngBounds(points.map(p=>[p.lat,p.lon])),{padding:[60,60],maxZoom:11});}panel.scrollIntoView({block:'nearest',behavior:'smooth'});$('relationsTitle').focus({preventScroll:true});history.replaceState(null,'','#relations');}
 $('openRelations').onclick=open;
 ['relationsToggle','relationKind','relationPlace','relationStatus','relationTime','relationFrom','relationTo','relationUnknown','relationSearch'].forEach(id=>$(id).addEventListener('input',render));
 $('relationReset').onclick=()=>{['relationPlace','relationKind','relationSearch','relationFrom','relationTo'].forEach(id=>$(id).value='');$('relationStatus').value='recorded_with_source';$('relationTime').value='source_year';$('relationUnknown').checked=true;active=null;render();};
 $('relationExport').onclick=()=>api.download('champa-quan-he-da-loc.json',JSON.stringify({...data,filters:{place:$('relationPlace').value,status:$('relationStatus').value,time_field:$('relationTime').value,from:$('relationFrom').value,to:$('relationTo').value,include_unknown:$('relationUnknown').checked},records:current},null,2),'application/json');
 render();return {refresh:render,open};
};
})(window);
