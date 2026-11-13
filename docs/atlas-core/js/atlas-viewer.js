/*! Atlas Viewer 1.0.0 — trình xem bản đồ tổng quát chạy trên Atlas Core.
 *  Một bản đồ mới chỉ cần: atlas.config.json + dữ liệu GeoJSON (window.ATLAS_DATA).
 *  Thuộc tính mỗi điểm (properties): id, name, type, no, kind, summary, address, period,
 *  article_html (được làm sạch), image, image_caption, links [{label, url}], status, alt_names.
 *  Tên trường khác có thể ánh xạ qua config.fields, ví dụ {"name": "ten"}.
 */
(function (root) {
'use strict';
const CORE = root.AtlasCore, CFG = root.ATLAS_CONFIG;
if (!CORE || !CFG) throw new Error('Atlas Viewer cần atlas-core.js và atlas.config.js');
const {esc} = CORE, {$, $$} = CORE.dom;
const UI = Object.assign({search: 'Tìm tên, loại, địa chỉ…', all_types: 'Mọi loại', count: '{n} / {total} địa điểm', empty: 'Không có địa điểm phù hợp.', legend: 'Ký hiệu', close: 'Đóng', directions: 'Google Maps', share: 'Sao chép liên kết', copied: 'Đã sao chép ✓', back: 'Về bản đồ', links: 'Liên kết', sample: ''}, CFG.ui || {});
const F = Object.assign({id: 'id', name: 'name', type: 'type', no: 'no', kind: 'kind', summary: 'summary', address: 'address', period: 'period', article_html: 'article_html', image: 'image', image_caption: 'image_caption', links: 'links', status: 'status', alt_names: 'alt_names'}, CFG.fields || {});
const store = CORE.createStore(CFG.storage_namespace);
const reduceMotion = root.matchMedia('(prefers-reduced-motion: reduce)').matches;
const isNarrow = () => root.matchMedia('(max-width: 900px)').matches;

/* ---------- Dữ liệu ---------- */
const raw = root[(CFG.data && CFG.data.global) || 'ATLAS_DATA'] || {type: 'FeatureCollection', features: []};
const features = Array.isArray(raw) ? raw : (raw.features || []);
const S = CORE.symbols.create({types: CFG.symbols?.types, default: CFG.symbols?.default, resolve: r => r.type,
  sacred: r => (CFG.symbols?.sacred_ids || []).includes(r.id), emphasis: r => (CFG.symbols?.emphasis_ids || []).includes(r.id)});
const places = features.map((f, i) => {
  const pr = f.properties || f, g = f.geometry;
  const [lon, lat] = g && g.type === 'Point' ? g.coordinates.map(Number) : [Number(pr.lon), Number(pr.lat)];
  const p = {};
  for (const k of Object.keys(F)) p[k] = pr[F[k]];
  p.id = String(p.id ?? i + 1).replace(/[^\w.-]/g, '-');
  p.no = p.no ?? i + 1; p.lat = lat; p.lon = lon;
  p.type = S.type(p);
  p._hay = CORE.norm([p.name, p.kind, p.address, p.period, ...(p.alt_names || [])].join(' '));
  return p;
}).filter(p => p.name && CORE.geo.valid(p.lat, p.lon));
const BY = Object.fromEntries(places.map(p => [p.id, p]));

/* ---------- Khung trang ---------- */
document.title = CFG.title;
$('#brandTitle').textContent = CFG.title;
$('#brandTag').textContent = CFG.tagline || '';
if (CFG.logo) { const img = $('#brandLogo'); const u = CORE.safeUrl(CFG.logo); if (u) { img.src = u; img.hidden = false; } }
$('#asideTitle').textContent = CFG.heading || CFG.title;
$('#asideLede').textContent = CFG.description || '';
$('#sampleNote').textContent = UI.sample; $('#sampleNote').hidden = !UI.sample;
$('#credit').textContent = CFG.credit || '';
$('#search').placeholder = UI.search;
const typeSel = $('#typeFilter');
typeSel.add(new Option(UI.all_types, ''));
S.keys.filter(k => places.some(p => p.type === k)).forEach(k => typeSel.add(new Option(S.labels[k], k)));

/* ---------- Bản đồ ---------- */
let map = null, layer = null, selected = null;
const markerHtml = (p, sel) => S.html(p.type, p.no, S.sacred(p), p.status || '');
if (root.L) {
  map = L.map('map', {zoomControl: false, zoomAnimation: !reduceMotion});
  L.control.zoom({position: 'topright', zoomInTitle: 'Phóng to', zoomOutTitle: 'Thu nhỏ'}).addTo(map);
  L.control.scale({imperial: false, position: 'bottomright'}).addTo(map);
  const base = {};
  (CFG.map.tiles || []).forEach((t, i) => {
    if (!/^https:\/\//.test(t.url)) return;
    const l = L.tileLayer(t.url, {maxZoom: t.max_zoom || 19, attribution: CORE.sanitizeHTML(t.attribution || '')});
    base[t.name || 'Lớp ' + (i + 1)] = l; if (i === 0) l.addTo(map);
  });
  if (Object.keys(base).length > 1) L.control.layers(base, null, {position: 'topright'}).addTo(map);
  layer = L.layerGroup().addTo(map);
  map.setView(CFG.map.center || [16, 108], CFG.map.zoom || 8);
  map.on('zoomend', () => draw());
} else { $('#fallback').style.display = 'block'; }

function filtered() {
  const q = CORE.norm($('#search').value), t = typeSel.value;
  return places.filter(p => (!t || p.type === t) && (!q || p._hay.includes(q)));
}
function draw(list = filtered()) {
  if (!map) return;
  layer.clearLayers();
  const pts = list.map(p => Object.assign(map.latLngToLayerPoint([p.lat, p.lon]), {p}));
  for (const g of CORE.geo.groups(pts, CFG.map.cluster_radius_px || 46)) {
    if (g.length === 1) {
      const p = g[0].p, sel = selected === p.id;
      const cls = 'mk atlas-marker symbol-' + p.type + (S.importantRuin(p) ? ' important-ruin' : '') + (p.status ? ' ' + p.status : '') + (sel ? ' selected' : '');
      const m = L.marker([p.lat, p.lon], {icon: L.divIcon({className: cls, html: markerHtml(p, sel), iconSize: [40, 40], iconAnchor: [20, 20]}), keyboard: true, zIndexOffset: sel ? 2000 : 1000, title: ''});
      m.bindTooltip(esc(p.no + '. ' + p.name), {direction: 'top', offset: [0, -14]});
      m.on('click', () => choose(p.id, {move: false}));
      m.on('add', () => { const el = m.getElement(); if (el) { el.setAttribute('role', 'button'); el.setAttribute('aria-label', p.no + '. ' + p.name); } });
      m.addTo(layer);
    } else {
      const members = g.map(x => x.p), lat = members.reduce((s, p) => s + p.lat, 0) / members.length, lon = members.reduce((s, p) => s + p.lon, 0) / members.length;
      const m = L.marker([lat, lon], {icon: L.divIcon({className: 'place-cluster' + (members.some(p => p.id === selected) ? ' contains-selected' : ''), html: `<b>${members.length}</b><small>điểm</small>`, iconSize: [44, 44], iconAnchor: [22, 22]}), keyboard: true, zIndexOffset: 1100});
      m.on('click', () => map.fitBounds(L.latLngBounds(members.map(p => [p.lat, p.lon])), {padding: [60, 60], maxZoom: Math.min(18, map.getZoom() + 3), animate: !reduceMotion}));
      m.on('add', () => { const el = m.getElement(); if (el) { el.setAttribute('role', 'button'); el.setAttribute('aria-label', `Nhóm ${members.length} điểm: ` + members.map(p => p.name).join(', ')); } });
      m.addTo(layer);
    }
  }
}
function fit(list) {
  if (!map || !list.length) return;
  const right = !$('#detail').hidden && !isNarrow() ? $('#detail').offsetWidth + 50 : 50;
  map.fitBounds(L.latLngBounds(list.map(p => [p.lat, p.lon])), {paddingTopLeft: [50, 70], paddingBottomRight: [right, 60], maxZoom: CFG.map.max_fit_zoom || 13, animate: !reduceMotion});
}

/* ---------- Danh sách và chú giải ---------- */
function renderList() {
  const list = filtered();
  $('#count').textContent = UI.count.replace('{n}', list.length).replace('{total}', places.length);
  const box = $('#plist'); box.textContent = '';
  for (const p of list) {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'card';
    if (p.id === selected) b.setAttribute('aria-current', 'true');
    b.innerHTML = `<span class="num atlas-marker symbol-${esc(p.type)}${S.importantRuin(p) ? ' important-ruin' : ''}" aria-hidden="true">${markerHtml(p)}</span><span><b>${esc(p.name)}</b><small>${esc([p.kind || S.labels[p.type], p.address].filter(Boolean).join(' · '))}</small></span>`;
    b.onclick = () => choose(p.id, {focus: true});
    const li = document.createElement('div'); li.setAttribute('role', 'listitem'); li.append(b); box.append(li);
  }
  if (!list.length) box.innerHTML = `<div class="empty">${esc(UI.empty)}</div>`;
  draw(list);
  return list;
}
function renderLegend() {
  const used = S.keys.filter(k => places.some(p => p.type === k));
  $('#symbolConvention').innerHTML = `<summary>${esc(UI.legend)}</summary><div class="symbol-key-grid">` +
    used.map(k => `<span><i class="atlas-marker symbol-${esc(k)}" aria-hidden="true">${S.html(k)}</i>${esc(S.labels[k])}</span>`).join('') + '</div>';
}

/* ---------- Hồ sơ ---------- */
function detailHTML(p) {
  const gm = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(p.lat + ',' + p.lon)}`;
  const img = p.image ? CORE.safeUrl(p.image, {allowDataImage: true}) : '';
  const links = (Array.isArray(p.links) ? p.links : []).filter(l => l && CORE.safeUrl(l.url));
  return `<button class="close" type="button" aria-label="${esc(UI.close)}"></button><div class="dbody" data-place="${esc(p.id)}">
  <span class="eyebrow">${esc(p.no)} · ${esc((p.kind || S.labels[p.type] || '').toUpperCase())}</span>
  <h2 id="dTitle" tabindex="-1">${esc(p.name)}</h2>
  ${p.alt_names && p.alt_names.length ? `<div class="alt">${esc([].concat(p.alt_names).join(', '))}</div>` : ''}
  ${p.address ? `<p class="admin">${esc(p.address)}</p>` : ''}
  <div class="directions-link"><a class="google-maps-link" ${CORE.hrefAttrs(gm)}>${esc(UI.directions)} ↗</a></div>
  ${p.period ? `<div class="dates"><div class="date"><b>${esc(p.period)}</b></div></div>` : ''}
  ${p.summary ? `<p class="lead">${esc(p.summary)}</p>` : ''}
  ${img ? `<figure class="entity-photo"><img src="${esc(img)}" alt="${esc(p.image_caption || p.name)}" loading="lazy" decoding="async">${p.image_caption ? `<figcaption>${esc(p.image_caption)}</figcaption>` : ''}</figure>` : ''}
  ${p.article_html ? `<div class="myson-article">${CORE.sanitizeHTML(p.article_html)}</div>` : ''}
  ${links.length ? `<details class="sec" open><summary>${esc(UI.links)} (${links.length})</summary><ul>${links.map(l => `<li><a ${CORE.hrefAttrs(l.url)}>${esc(l.label || l.url)}</a></li>`).join('')}</ul></details>` : ''}
  <div class="actions"><button class="btn ghost" type="button" data-act="share">${esc(UI.share)}</button><button class="btn ghost backmap" type="button" data-act="back">${esc(UI.back)}</button></div></div>`;
}
function choose(id, {move = true, focus = false} = {}) {
  const p = BY[id]; if (!p) return;
  selected = id;
  const d = $('#detail'); d.innerHTML = detailHTML(p); d.hidden = false; d.scrollTop = 0;
  document.body.classList.add('panel-open');
  $('.close', d).onclick = close;
  $('[data-act="share"]', d).onclick = async e => { try { await navigator.clipboard.writeText(location.href.split('#')[0] + '#' + p.id); e.target.textContent = UI.copied; } catch (_) { e.target.textContent = location.href.split('#')[0] + '#' + p.id; } };
  $('[data-act="back"]', d).onclick = () => { close(); $('#maparea').scrollIntoView({behavior: reduceMotion ? 'auto' : 'smooth'}); };
  if (location.hash.slice(1) !== p.id) history.replaceState(null, '', '#' + encodeURIComponent(p.id));
  renderList();
  if (map && move) { map.setView([p.lat, p.lon], Math.max(map.getZoom(), CFG.map.focus_zoom || 12), {animate: !reduceMotion}); }
  if (focus) $('#dTitle').focus({preventScroll: true});
}
function close() {
  selected = null; $('#detail').hidden = true; document.body.classList.remove('panel-open');
  history.replaceState(null, '', location.pathname + location.search); renderList();
}
document.addEventListener('keydown', e => { if (e.key === 'Escape' && !$('#detail').hidden) close(); });
root.addEventListener('hashchange', () => { const id = decodeURIComponent(location.hash.slice(1)); if (BY[id]) choose(id); });

/* ---------- Khởi động ---------- */
$('#search').addEventListener('input', () => fit(renderList()));
typeSel.addEventListener('change', () => fit(renderList()));
root.addEventListener('resize', () => map && map.invalidateSize());
renderLegend();
const first = renderList();
const startId = decodeURIComponent(location.hash.slice(1));
if (BY[startId]) choose(startId, {move: true}); else if (!CFG.map.center) fit(first);
$('#pill').textContent = `${places.length} địa điểm`;
root.AtlasViewer = {choose, close, places: () => places.slice()};
})(window);
