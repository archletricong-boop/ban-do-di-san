/*! Atlas Core 1.0.0 — lõi bản đồ di sản, độc lập dữ liệu.
 *  Không chứa tên, nhãn, dữ liệu hay địa chỉ của bất kỳ bản đồ cụ thể nào.
 *  Mọi thứ riêng của một bản đồ được truyền vào qua cấu hình (atlas.config.json).
 *  Chạy được trong trình duyệt (window.AtlasCore) và Node (module.exports) để kiểm thử.
 */
(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.AtlasCore = api;
})(typeof window !== 'undefined' ? window : globalThis, function (root) {
'use strict';
const VERSION = '1.0.0';

/* ======================================================================
   1. Văn bản
   ====================================================================== */
const ESC = {'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;', '`': '&#96;'};
/** Thoát HTML cho cả nội dung và giá trị thuộc tính. */
const esc = s => String(s ?? '').replace(/[&<>"'`]/g, c => ESC[c]);
/** Chuẩn hóa để tìm kiếm: chữ thường, bỏ dấu, đ→d. `extra` cho phép bản đồ thêm luật riêng. */
function norm(s, extra) {
  let t = String(s ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd');
  if (typeof extra === 'function') t = extra(t);
  return t.replace(/[^a-z0-9]+/g, ' ').trim();
}
/** Cắt chuỗi về độ dài an toàn (dùng cho dữ liệu nhập từ tệp). */
const clip = (s, n = 500) => { const t = String(s ?? ''); return t.length > n ? t.slice(0, n) : t; };

/* ======================================================================
   2. URL an toàn
   ====================================================================== */
const SAFE_SCHEMES = new Set(['http:', 'https:', 'mailto:', 'tel:']);
const DATA_IMAGE = /^data:image\/(png|jpe?g|webp|gif|avif);base64,[a-z0-9+/=\s]+$/i;
/**
 * Trả về URL nếu an toàn, ngược lại chuỗi rỗng.
 * Chặn javascript:, vbscript:, data: (trừ ảnh khi cho phép), file:, blob: và mọi lược đồ lạ.
 */
function safeUrl(u, {allowRelative = true, allowDataImage = false} = {}) {
  const s = String(u ?? '').trim();
  if (!s) return '';
  // Bỏ ký tự điều khiển/khoảng trắng mà trình duyệt bỏ qua khi phân tích lược đồ ("java\nscript:")
  const probe = s.replace(/[\u0000- \u007f-\u009f]/g, '');
  if (probe.startsWith('#')) return s;
  const m = probe.match(/^([a-z][a-z0-9+.-]*):/i);
  if (m) {
    const scheme = m[1].toLowerCase() + ':';
    if (SAFE_SCHEMES.has(scheme)) return s;
    if (allowDataImage && scheme === 'data:' && DATA_IMAGE.test(probe)) return s;
    return '';
  }
  if (!allowRelative) return '';
  if (probe.startsWith('//')) return 'https:' + s;      // URL không lược đồ → ép https
  if (/^[\\/]{2}/.test(probe)) return '';                // "\\evil" hoặc "/\evil"
  return s;
}
const isExternal = u => /^(https?:)?\/\//i.test(String(u || '').trim());
/** Thuộc tính href đã thoát; liên kết ngoài mở tab mới và không gửi Referer. */
function hrefAttrs(u, {newTab} = {}) {
  const safe = safeUrl(u);
  if (!safe) return 'href="#" aria-disabled="true" data-unsafe-url="1"';
  const ext = newTab ?? isExternal(safe);
  return `href="${esc(safe)}"` + (ext ? ' target="_blank" rel="noopener noreferrer"' : '');
}
const attrUrl = (u, opts) => esc(safeUrl(u, opts));

/* ======================================================================
   3. Làm sạch HTML biên tập (bài viết, chú thích có thẻ)
   Danh sách cho phép: thẻ không có trong danh sách bị bóc (giữ chữ),
   thẻ nguy hiểm bị bỏ cả nội dung; thuộc tính on*, style và URL không an toàn bị gỡ.
   ====================================================================== */
const ALLOWED_TAGS = new Set(['a','abbr','b','blockquote','br','caption','cite','code','col','colgroup','dd','del','details','dfn','div','dl','dt','em','figcaption','figure','h2','h3','h4','h5','h6','hr','i','img','ins','kbd','li','mark','ol','p','pre','q','s','section','small','span','strong','sub','summary','sup','table','tbody','td','tfoot','th','thead','time','tr','u','ul','wbr']);
const DROP_TAGS = new Set(['script','style','iframe','frame','frameset','object','embed','applet','template','noscript','link','meta','base','form','input','button','select','textarea','option','svg','math','canvas','audio','video','source','track','portal']);
const GLOBAL_ATTR = new Set(['class','id','title','lang','dir','role','tabindex']);
const TAG_ATTR = {a: ['href','target','rel','hreflang'], img: ['src','alt','width','height','loading','decoding'], td: ['colspan','rowspan','headers'], th: ['colspan','rowspan','scope','headers','abbr'], ol: ['start','reversed','type'], time: ['datetime'], details: ['open'], col: ['span'], colgroup: ['span'], q: ['cite'], blockquote: ['cite'], del: ['datetime'], ins: ['datetime']};
function allowedAttr(tag, name) {
  if (name.startsWith('on') || name === 'style' || name === 'srcdoc' || name === 'formaction') return false;
  if (GLOBAL_ATTR.has(name) || name.startsWith('aria-')) return true;
  if (name.startsWith('data-') && /^data-[a-z0-9-]+$/.test(name)) return true;
  return (TAG_ATTR[tag] || []).includes(name);
}
function cleanNode(node, doc) {
  for (const child of [...node.childNodes]) {
    if (child.nodeType === 8) { child.remove(); continue; }            // chú thích HTML
    if (child.nodeType !== 1) continue;
    const tag = child.localName;
    if (DROP_TAGS.has(tag)) { child.remove(); continue; }
    cleanNode(child, doc);
    if (!ALLOWED_TAGS.has(tag)) { child.replaceWith(...child.childNodes); continue; }
    for (const a of [...child.attributes]) {
      const name = a.name.toLowerCase();
      if (!allowedAttr(tag, name)) { child.removeAttribute(a.name); continue; }
      if (name === 'href' || name === 'cite') {
        const safe = safeUrl(a.value);
        if (!safe) child.removeAttribute(a.name); else child.setAttribute(a.name, safe);
      } else if (name === 'src') {
        const safe = safeUrl(a.value, {allowDataImage: true});
        if (!safe) child.removeAttribute(a.name); else child.setAttribute(a.name, safe);
      } else if (name === 'id' && !/^[A-Za-z][\w:.-]{0,80}$/.test(a.value)) {
        child.removeAttribute(a.name);                                 // chặn chiếm id hệ thống
      }
    }
    if (tag === 'a') {
      const href = child.getAttribute('href') || '';
      if (child.getAttribute('target') === '_blank' || isExternal(href)) { child.setAttribute('target', '_blank'); child.setAttribute('rel', 'noopener noreferrer'); }
      else child.removeAttribute('target');
    }
    if (tag === 'img' && !child.getAttribute('src')) child.remove();
    if (tag === 'img') { child.setAttribute('loading', child.getAttribute('loading') || 'lazy'); child.setAttribute('decoding', 'async'); }
  }
}
/** Làm sạch một đoạn HTML. Trong môi trường không có DOM, thoát toàn bộ (an toàn mặc định). */
function sanitizeHTML(html) {
  const s = String(html ?? '');
  if (!s) return '';
  const DP = root.DOMParser;
  if (typeof DP !== 'function') return esc(s);
  const doc = new DP().parseFromString('<!doctype html><html><body></body></html>', 'text/html');
  const box = doc.createElement('div');
  // Bỏ thuộc tính style trước khi phân tích: tài liệu trơ vẫn thừa hưởng CSP nên trình duyệt
  // sẽ ghi lỗi vi phạm (dù không áp dụng). Sau đó vẫn làm sạch đầy đủ bằng DOM.
  // Phân tích trong tài liệu trơ (không chạy script, không tải ảnh) rồi mới làm sạch
  box.innerHTML = s.replace(/\sstyle\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '');
  cleanNode(box, doc);
  return box.innerHTML;
}

/* ======================================================================
   4. Lưu cục bộ theo không gian tên, có kiểm dạng dữ liệu
   ====================================================================== */
function createStore(namespace, {maxBytes = 2_000_000, legacy = {}} = {}) {
  if (!/^[a-z0-9][a-z0-9_-]{1,40}$/i.test(String(namespace))) throw new Error('storage namespace không hợp lệ');
  const ls = () => { try { return root.localStorage || null; } catch (e) { return null; } };
  const full = k => namespace + ':' + k;
  const api = {
    namespace,
    get(k, validate) {
      const s = ls(); if (!s) return null;
      let raw = null;
      try { raw = s.getItem(full(k)); if (raw == null && legacy[k]) raw = s.getItem(legacy[k]); } catch (e) { return null; }
      if (raw == null) return null;
      let v; try { v = JSON.parse(raw); } catch (e) { return null; }
      if (typeof validate === 'function') { try { return validate(v); } catch (e) { return null; } }
      return v;
    },
    set(k, v) {
      const s = ls(); if (!s) return false;
      let raw; try { raw = JSON.stringify(v); } catch (e) { return false; }
      if (raw.length > maxBytes) return false;
      try { s.setItem(full(k), raw); if (legacy[k]) s.removeItem(legacy[k]); return true; } catch (e) { return false; }
    },
    del(k) { const s = ls(); if (!s) return; try { s.removeItem(full(k)); if (legacy[k]) s.removeItem(legacy[k]); } catch (e) {} },
    keys() { const s = ls(); if (!s) return []; const out = []; try { for (let i = 0; i < s.length; i++) { const k = s.key(i); if (k && k.startsWith(namespace + ':')) out.push(k.slice(namespace.length + 1)); } } catch (e) {} return out; }
  };
  return api;
}

/* ======================================================================
   5. Tệp: đọc có giới hạn, CSV, tải xuống
   ====================================================================== */
const MB = 1024 * 1024;
/** Đọc tệp văn bản người dùng chọn, kiểm đuôi và dung lượng trước khi đọc. */
function readText(file, {maxBytes = 5 * MB, extensions = null} = {}) {
  return new Promise((resolve, reject) => {
    if (!file) return reject(new Error('Chưa chọn tệp.'));
    const name = String(file.name || '');
    const ext = (name.match(/\.([a-z0-9]+)$/i) || [])[1]?.toLowerCase() || '';
    if (extensions && !extensions.includes(ext)) return reject(new Error(`Không nhận đuôi .${ext || '?'}; chỉ nhận ${extensions.map(e => '.' + e).join(', ')}.`));
    if (file.size > maxBytes) return reject(new Error(`Tệp ${(file.size / MB).toFixed(1)} MB vượt giới hạn ${(maxBytes / MB).toFixed(0)} MB.`));
    const rd = new root.FileReader();
    rd.onerror = () => reject(new Error('Không đọc được tệp.'));
    rd.onload = () => { const t = String(rd.result || ''); /\u0000/.test(t.slice(0, 4096)) ? reject(new Error('Tệp không phải văn bản.')) : resolve(t.replace(/^﻿/, '')); };
    rd.readAsText(file, 'utf-8');
  });
}
/** CSV: nhận dấu phẩy, chấm phẩy hoặc tab; xử lý ngoặc kép, xuống dòng trong ô, BOM. */
function parseCSV(text, {maxRows = 50000} = {}) {
  const t = String(text ?? '').replace(/^﻿/, '');
  const first = t.split(/\r?\n/, 1)[0] || '';
  const delim = [',', ';', '\t'].map(d => [d, first.split(d).length]).sort((a, b) => b[1] - a[1])[0][0];
  const rows = []; let row = [], cell = '', q = false;
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (q) { if (c === '"') { if (t[i + 1] === '"') { cell += '"'; i++; } else q = false; } else cell += c; continue; }
    if (c === '"') q = true;
    else if (c === delim) { row.push(cell); cell = ''; }
    else if (c === '\n' || c === '\r') { if (c === '\r' && t[i + 1] === '\n') i++; row.push(cell); rows.push(row); row = []; cell = ''; if (rows.length > maxRows) throw new Error('Tệp CSV quá nhiều dòng.'); }
    else cell += c;
  }
  if (cell !== '' || row.length) { row.push(cell); rows.push(row); }
  const clean = rows.filter(r => r.some(x => x.trim() !== ''));
  if (!clean.length) return {delim, header: [], records: []};
  const header = clean[0].map(h => h.trim());
  const records = clean.slice(1).map(r => Object.fromEntries(header.map((h, i) => [h, (r[i] ?? '').trim()])));
  return {delim, header, records};
}
/** Một ô CSV an toàn khi mở bằng Excel/Sheets: chặn tiêm công thức (=, +, -, @). */
function csvCell(v) {
  let s = String(v ?? '');
  if (/^[=+\-@\t\r]/.test(s) && !/^[+-]?\d+(?:[.,]\d+)?(?:e[+-]?\d+)?$/i.test(s)) s = "'" + s;
  return /[",\n\r;]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}
const toCSV = (rows, cols) => '﻿' + [cols.map(c => csvCell(c.label ?? c.key)).join(','), ...rows.map(r => cols.map(c => csvCell(typeof c.get === 'function' ? c.get(r) : r[c.key])).join(','))].join('\r\n');
/** Tải xuống tệp tạo trong trình duyệt; tên tệp được lọc ký tự. */
function download(name, text, type = 'text/plain;charset=utf-8') {
  const safeName = String(name || 'tai-xuong.txt').replace(/[\\/:*?"<>|\u0000-\u001f]+/g, '_').slice(0, 120);
  const url = URL.createObjectURL(new Blob([text], {type}));
  const a = root.document.createElement('a'); a.href = url; a.download = safeName; a.rel = 'noopener';
  root.document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

/* ======================================================================
   6. Địa lý: tọa độ nghiêm ngặt, gom nhóm, khoảng cách, băm
   ====================================================================== */
/** Đọc một tọa độ thập phân hoặc độ-phút-giây. Không suy đoán, không đảo lat/lon. */
function coordinate(v, delim) {
  if (v == null || String(v).trim() === '') return NaN;
  let s = String(v).trim();
  const d = s.match(/^(-?\d+(?:[.,]\d+)?)\s*[°º]\s*(\d+(?:[.,]\d+)?)?\s*['′]?\s*(\d+(?:[.,]\d+)?)?\s*["″]?\s*([NSEW])?$/i);
  if (d) {
    const n = x => Number(String(x || 0).replace(',', '.'));
    if (n(d[2]) >= 60 || n(d[3]) >= 60) return NaN;
    const x = Math.abs(n(d[1])) + n(d[2]) / 60 + n(d[3]) / 3600;
    return n(d[1]) < 0 || /[SW]/i.test(d[4] || '') ? -x : x;
  }
  if (delim !== ',') s = s.replace(',', '.');
  return /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(s) ? Number(s) : NaN;
}
const valid = (lat, lon) => Number.isFinite(lat) && Number.isFinite(lon) && Math.abs(lat) <= 90 && Math.abs(lon) <= 180;
/** Gom các điểm màn hình gần nhau (union–find). */
function groups(points, radius) {
  const parent = points.map((_, i) => i);
  const find = i => { while (parent[i] !== i) { parent[i] = parent[parent[i]]; i = parent[i]; } return i; };
  for (let i = 0; i < points.length; i++) for (let j = i + 1; j < points.length; j++) if (Math.hypot(points[i].x - points[j].x, points[i].y - points[j].y) < radius) parent[find(j)] = find(i);
  const out = new Map(); points.forEach((p, i) => { const k = find(i); if (!out.has(k)) out.set(k, []); out.get(k).push(p); });
  return [...out.values()];
}
function haversine(a, b) {
  const R = 6371008.8, r = x => x * Math.PI / 180;
  const dLat = r(b.lat - a.lat), dLon = r(b.lon - a.lon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(r(a.lat)) * Math.cos(r(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
const fmtDist = m => m < 1000 ? Math.round(m) + ' m' : (m / 1000).toFixed(m < 10000 ? 2 : 1).replace('.', ',') + ' km';
/** Khớp một bản ghi nhập với hồ sơ (id chính xác hoặc tên chính xác duy nhất) hoặc dòng nguồn (chỉ id). */
function target(record, places, rows = []) {
  const id = String(record.id || record.ma || record.ma_di_tich || record.corpus_id || '').trim();
  if (id) { const p = places.find(p => p.id === id); if (p) return {type: 'P', obj: p}; const r = rows.find(r => r.id === id.toUpperCase()); return r ? {type: 'R', obj: r} : null; }
  const name = norm(record.ten || record.name || record.ten_di_tich || record.di_tich || '');
  if (!name) return null;
  const matches = places.filter(p => [p.name, ...(p.alt_names || [])].some(n => norm(n) === name));
  return matches.length === 1 ? {type: 'P', obj: matches[0]} : null;
}
function canonical(value) {
  if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']';
  if (value && typeof value === 'object') return '{' + Object.keys(value).sort().filter(k => value[k] !== undefined).map(k => JSON.stringify(k) + ':' + canonical(value[k])).join(',') + '}';
  return JSON.stringify(value);
}
async function digest(value) {
  const c = root.crypto;
  if (!c?.subtle) return null;
  const bytes = new TextEncoder().encode(canonical(value));
  return [...new Uint8Array(await c.subtle.digest('SHA-256', bytes))].map(b => b.toString(16).padStart(2, '0')).join('');
}
const LOC_FIELDS = ['lat','lon','role','status','accuracy_m','date','device','by','source','source_text','note'];
const snapshot = l => l ? Object.fromEntries(LOC_FIELDS.map(k => [k, l[k] ?? null])) : null;
const samePoint = (a, b) => !!a && !!b && a.lat === b.lat && a.lon === b.lon && (!a.role || !b.role || a.role === b.role);
/** Kiểm một điểm đã lưu cục bộ: giữ đúng trường, đúng kiểu, cắt độ dài; loại điểm hỏng. */
function validLocation(l, {statuses} = {}) {
  if (!l || typeof l !== 'object') return null;
  const lat = Number(l.lat), lon = Number(l.lon);
  if (!valid(lat, lon)) return null;
  const out = {lat, lon};
  for (const k of ['role','status','date','device','by','source','source_text','note','file','imported_at','fileName']) if (l[k] != null) out[k] = clip(l[k], 1000);
  if (l.accuracy_m != null && Number.isFinite(Number(l.accuracy_m))) out.accuracy_m = Number(l.accuracy_m);
  if (statuses && out.status && !statuses.includes(out.status)) return null;
  if (l.prev) { const p = validLocation(l.prev); if (p) out.prev = p; }
  for (const k of ['imported','primary','replaced']) if (typeof l[k] === 'boolean') out[k] = l[k];
  return out;
}

/* ======================================================================
   7. Ký hiệu bản đồ: thư viện hình + bộ đăng ký do bản đồ cấu hình
   ====================================================================== */
const SHAPES = {
  circle:        '<circle cx="20" cy="20" r="16"/>',
  rounded_square:'<rect x="4" y="4" width="32" height="32" rx="8"/>',
  citadel:       '<path d="M7 7H15V4H25V7H33V15H36V25H33V33H25V36H15V33H7V25H4V15H7Z"/>',
  triangle_down: '<path d="M8 5H32Q37 5 34.5 10L23 33Q20 39 17 33L5.5 10Q3 5 8 5Z"/>',
  mountain:      '<path d="M17 7Q20 1 23 7L35 31Q38 36 32 36H8Q2 36 5 31Z"/>',
  ellipse:       '<ellipse cx="20" cy="20" rx="18" ry="12"/>',
  diamond:       '<path d="M20 3Q22 3 23.5 4.5L35.5 16.5Q37 18 37 20T35.5 23.5L23.5 35.5Q22 37 20 37T16.5 35.5L4.5 23.5Q3 22 3 20T4.5 16.5L16.5 4.5Q18 3 20 3Z"/>',
  hexagon:       '<path d="M12 5H28L37 20L28 35H12L3 20Z"/>',
  pin:           '<path d="M20 37C20 37 7 24 7 15.5A13 13 0 0 1 33 15.5C33 24 20 37 20 37Z"/>'
};
const DASHED = new Set(['minh_hoa', 'ung_vien']);
/**
 * Tạo bộ ký hiệu cho một bản đồ.
 * cfg.types: {khoa: {label, shape (tên trong thư viện) | svg (chuỗi hình tự vẽ, viewBox 0 0 40 40)}}
 * cfg.resolve(record) → khóa loại; cfg.sacred(record), cfg.emphasis(record) → boolean
 */
function createSymbols(cfg = {}) {
  const types = cfg.types || {point: {label: 'Địa điểm', shape: 'circle'}};
  const keys = Object.keys(types), fallback = cfg.default && types[cfg.default] ? cfg.default : keys[0];
  const labels = Object.fromEntries(keys.map(k => [k, types[k].label || k]));
  const shapeName = k => { const t = types[k] || types[fallback]; return t.svg ? 'custom' : (SHAPES[t.shape] ? t.shape : 'circle'); };
  const shapeOf = k => { const t = types[k] || types[fallback]; return t.svg || SHAPES[t.shape] || SHAPES.circle; };
  const type = rec => { const k = typeof cfg.resolve === 'function' ? cfg.resolve(rec) : rec?.map_symbol; return types[k] ? k : fallback; };
  const sacred = rec => typeof cfg.sacred === 'function' ? !!cfg.sacred(rec) : false;
  const importantRuin = rec => typeof cfg.emphasis === 'function' ? !!cfg.emphasis(rec) : false;
  function html(k, number = '', isSacred = false, status = '') {
    const shape = shapeOf(k), sn = shapeName(k);
    const dash = DASHED.has(status) ? ' stroke-dasharray="3 2"' : '';
    const ring = status === 'do_dac' ? `<g class="symbol-survey-ring" transform="translate(20 20) scale(.84) translate(-20 -20)">${shape}</g>` : '';
    const num = number !== '' && number != null ? `<span class="marker-number${isSacred ? ' sacred-number' : ''}${String(number).length > 2 ? ' marker-wide' : ''} on-${sn}">${esc(number)}</span>` : '';
    return `<svg class="shape-${sn}${isSacred ? ' is-sacred' : ''}" viewBox="0 0 40 40" aria-hidden="true" focusable="false"><g class="symbol-halo">${shape}</g><g class="symbol-body"${dash}>${shape}</g>${ring}</svg>${num}`;
  }
  return {labels, keys, type, sacred, importantRuin, html, shapeName};
}

/* ======================================================================
   8. Cấu hình bản đồ: kiểm hợp đồng tối thiểu
   ====================================================================== */
function checkConfig(c) {
  const err = [];
  if (!c || typeof c !== 'object') return ['Thiếu cấu hình.'];
  if (!/^[a-z0-9][a-z0-9-]{1,40}$/.test(c.id || '')) err.push('id: chỉ chữ thường, số, gạch nối.');
  if (!c.title) err.push('title: bắt buộc.');
  if (!/^[a-z0-9][a-z0-9_-]{1,40}$/i.test(c.storage_namespace || '')) err.push('storage_namespace: bắt buộc, duy nhất cho mỗi bản đồ.');
  const tiles = c.map?.tiles || [];
  if (!tiles.length) err.push('map.tiles: cần ít nhất một lớp nền.');
  tiles.forEach((t, i) => { if (!/^https:\/\//.test(t.url || '')) err.push(`map.tiles[${i}].url: phải là https.`); });
  if (c.map?.center && !(Array.isArray(c.map.center) && valid(+c.map.center[0], +c.map.center[1]))) err.push('map.center: [vĩ độ, kinh độ].');
  return err;
}

/* ======================================================================
   9. DOM tiện ích
   ====================================================================== */
const $ = (s, r) => (r || root.document).querySelector(s);
const $$ = (s, r) => [...(r || root.document).querySelectorAll(s)];
/** Gán nội dung HTML đã qua làm sạch. Dùng thay innerHTML khi chuỗi chứa dữ liệu biên tập. */
function setSafeHTML(el, html) { el.innerHTML = sanitizeHTML(html); return el; }

return {
  VERSION, esc, norm, clip,
  url: {safe: safeUrl, attr: attrUrl, href: hrefAttrs, isExternal},
  safeUrl, attrUrl, hrefAttrs, sanitizeHTML, setSafeHTML,
  createStore,
  files: {readText, parseCSV, csvCell, toCSV, download},
  geo: {coordinate, valid, groups, haversine, fmtDist, target, canonical, digest, snapshot, samePoint, validLocation},
  symbols: {SHAPES, create: createSymbols},
  config: {check: checkConfig},
  dom: {$, $$}
};
});
