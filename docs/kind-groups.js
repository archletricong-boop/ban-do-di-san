/* Atlas v232 · Nhóm cha cho bộ lọc "Loại di tích".
   Dữ liệu gốc (p.kind) KHÔNG bị sửa. Tệp này chỉ xếp mỗi giá trị chi tiết vào một nhóm cha
   và tách dấu hiệu "cần kiểm / theo tin báo" thành một trục riêng.
   Quy tắc xét theo thứ tự từ trên xuống; giá trị không khớp rơi vào nhóm "Loại khác".
   Người biên tập chỉnh bảng RULES hoặc ghi đè từng giá trị trong OVERRIDES. */
(() => {
'use strict';
const flat = s => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase().replace(/\s+/g, ' ').trim();

const GROUPS = [
  ['den-thap',   'Đền tháp',              'Temples and towers'],
  ['phe-tich',   'Phế tích và dấu tích kiến trúc', 'Ruins and architectural remains'],
  ['thanh-luy',  'Thành lũy',                      'Citadels and ramparts'],
  ['van-khac',   'Địa điểm văn khắc',               'Inscription locations'],
  ['nuoc-duong', 'Công trình nước và đường',       'Waterworks and roads'],
  ['cu-tru',     'Cư trú và sản xuất',             'Settlement and production sites'],
  ['khao-co',    'Địa điểm khảo cổ',               'Archaeological sites'],
  ['hien-vat',   'Nơi phát hiện, lưu giữ hiện vật', 'Find-spots and holding places'],
  ['tho-tu',     'Địa điểm thờ tự',                'Places of worship'],
  ['khac',       'Loại khác và hồ sơ nhóm',        'Other and composite dossiers']
];

/* [nhóm, biểu thức trên chuỗi đã bỏ dấu] */
const RULES = [
  ['van-khac',   /\b(bi ky|bia ky|minh van|van khac)\b/],
  ['thanh-luy',  /\b(thanh co|phe tich thanh|luy co|thanh luy|phong thu)\b/],
  ['khac',       /\bthanh phan\b/],
  ['nuoc-duong', /^(cong trinh (nuoc|duong)|gieng)\b/],
  ['den-thap',   /^(quan the den thap|nhom (ba )?thap|thap don|di tich \/ den thap)\b/],
  ['phe-tich',   /\b(phe tich|dau tich|cum go)\b/],
  ['cu-tru',     /\b(cu tru|san xuat)\b/],
  ['hien-vat',   /\b(tuong|di vat|hien vat|bao tang|luu giu)\b/],
  ['tho-tu',     /\btho tu\b/],
  ['khao-co',    /\bkhao co\b/]
];
/* Ghi đè thủ công: 'Giá trị kind nguyên văn': 'mã nhóm' */
const OVERRIDES = {};

/* Dấu hiệu trong tên loại hình cho biết định danh/quy thuộc chưa chắc. */
const UNSETTLED = /\b(can kiem|can dinh danh|bao co|duoc bao|theo nguon cu|theo bang sach|da mat)\b/;

const cache = new Map();
function group(kind) {
  if (cache.has(kind)) return cache.get(kind);
  const text = flat(kind);
  const id = Object.hasOwn(OVERRIDES, kind) ? OVERRIDES[kind] : (RULES.find(([, re]) => re.test(text))?.[0] || 'khac');
  cache.set(kind, id);
  return id;
}
const unsettled = kind => UNSETTLED.test(flat(kind));
const label = (id, lang = 'vi') => { const g = GROUPS.find(x => x[0] === id); return g ? g[lang === 'en' ? 2 : 1] : id; };

/* Giá trị select: '' | 'g:<mã nhóm>' | '<kind nguyên văn>' */
function matches(kind, selected) {
  if (!selected) return true;
  return selected.startsWith('g:') ? group(kind) === selected.slice(2) : kind === selected;
}
/* Dựng lại <select>: nhóm cha kèm số lượng; withDetails=true thêm giá trị chi tiết thụt dưới nhóm. */
function fill(select, kinds, withDetails) {
  const keep = select.value;
  select.length = 1;
  const counts = new Map();
  kinds.filter(Boolean).forEach(k => counts.set(k, (counts.get(k) || 0) + 1));
  GROUPS.forEach(([id, vi]) => {
    const members = [...counts.keys()].filter(k => group(k) === id).sort((a, b) => a.localeCompare(b, 'vi'));
    if (!members.length) return;
    const total = members.reduce((n, k) => n + counts.get(k), 0);
    const head = document.createElement('option');
    head.value = 'g:' + id; head.textContent = vi + ' · ' + total; select.append(head);
    if (!withDetails) return;
    members.forEach(k => { const o = document.createElement('option'); o.value = k; o.textContent = '   ' + k; select.append(o); });
  });
  if ([...select.options].some(o => o.value === keep)) select.value = keep;
  else if (keep && !keep.startsWith('g:') && counts.has(keep)) select.value = 'g:' + group(keep);
  else select.value = '';
}
window.ATLAS_KIND_GROUPS = Object.freeze({ GROUPS, group, unsettled, label, matches, fill });
})();
