'use strict';
(() => {
const data = window.CHAMPA_BIBLIOGRAPHY || {books: [], topics: [], stats: {}};
const entities = new Map((window.CHAMPA_KNOWLEDGE?.data.entities || []).map(entry => [entry.id, entry]));
const books = new Map(data.books.map(book => [book.bib_id, book]));
const topics = new Map((data.topics || []).map(topic => [topic.topic_id, topic]));
const byId = id => document.getElementById(id);
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[c]));
const norm = value => String(value ?? '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd');
const textStatus = {
  EXACT_CITATION_PRESENT: 'Có nguồn thư mục tương ứng',
  RELATED_EDITION_ONLY: 'Có ấn bản liên quan',
  UNMATCHED_REFERENCE: 'Chưa xác nhận mục tương ứng',
  CROSSCHECK_PENDING: 'Biểu ghi thư mục',
};
const reviews = {
  text: 'Có văn bản đối chiếu',
  excerpt: 'Đã đọc trích đoạn',
  abstract: 'Đã rà tóm tắt',
  publisher: 'Đã rà trang công bố hoặc biểu ghi',
  contents: 'Đã rà mục lục',
  secondary: 'Đầu mối qua thư mục dẫn lại',
  conference: 'Tóm tắt hội nghị',
  legacy: 'Đầu mối từ đợt 1',
  metadata_only_not_claim_evidence: 'Biểu ghi từ đợt 1',
};
const labels = {vi: 'Tiếng Việt', en: 'Tiếng Anh', fr: 'Tiếng Pháp', zh: 'Tiếng Trung', ja: 'Tiếng Nhật', km: 'Tiếng Khmer', sa: 'Sanskrit', okm: 'Khmer cổ', pra: 'Prakrit'};
const link = (href, label) => '<a href="' + esc(href) + '">' + esc(label) + '</a>';
const bookPath = id => 'bibliography.html?id=' + encodeURIComponent(id);
const topicPath = id => 'bibliography.html?topic=' + encodeURIComponent(id);
const collectionPath = id => 'bibliography.html?collection=' + encodeURIComponent(id);
const topicCollection = topic => topic.collection || 'oe-fc';
const evidenceLabels = {
  SUPPORTED_WITHIN_SCOPE: 'Có căn cứ trong phạm vi nêu',
  PARTIALLY_SUPPORTED: 'Có căn cứ một phần',
  UNRESOLVED: 'Vấn đề còn mở',
};
const readingLevel = book => book.access_status || reviews[book.review_status] || '';

const findTopicSources = topic => [...topic.core_source_ids, ...topic.comparative_source_ids];
const relatedTopics = id => [...topics.values()].filter(topic => findTopicSources(topic).includes(id));
const safeUrl = value => {
  try {
    const parsed = new URL(String(value || ''));
    return ['http:', 'https:'].includes(parsed.protocol) ? parsed.href : '';
  } catch {
    return '';
  }
};
const entityLinks = ids => ids.filter(id => entities.has(id)).map(id => link('record.html?id=' + encodeURIComponent(id), entities.get(id).title)).join('');
const nav = href => '<nav class="backlinks">' + link(href, '← Về thư mục') + '</nav>';
const bookCard = book => '<a class="result" href="' + bookPath(book.bib_id) + '"><span class="badge">' + esc(book.bib_id) + '</span><h3>' + esc(book.title) + '</h3><p>' + esc([book.author, book.year || 'Chưa rõ năm', book.domain].filter(Boolean).join(' · ')) + '</p><small>' + esc(readingLevel(book) || textStatus[book.catalogue_status]) + '</small></a>';
const topicCard = topic => '<a class="result" href="' + topicPath(topic.topic_id) + '"><span class="badge">Hướng dẫn nguồn · ' + esc(topic.topic_id) + '</span><h3>' + esc(topic.title) + '</h3><p>' + esc(topic.locator_guidance) + '</p></a>';

function bookDetail(book) {
  document.title = book.title + ' · Thư mục Bách khoa';
  const ref = entityLinks(book.reference_entity_ids);
  const cited = entityLinks(book.cited_by_entity_ids);
  const proposed = entityLinks(book.proposed_profile_ids.filter(id => !book.cited_by_entity_ids.includes(id)));
  const url = safeUrl(book.public_lookup_url);
  const supplemental = (book.supplemental_urls || []).map(safeUrl).filter(Boolean);
  const related = relatedTopics(book.bib_id);
  const language = book.language?.split('/').map(code => labels[code.toLowerCase()] || code).join(' / ');
  const priority = book.priority === 'A' ? 'Nguồn ưu tiên' : book.priority === 'B' ? 'Nguồn bổ trợ' : '';
  const metadata = [book.author || 'Chưa ghi tác giả', book.year || 'Chưa rõ năm', book.domain, language, book.kind].filter(Boolean).join(' · ');
  const edition = book.edition || book.publication;
  const annotation = book.annotation || book.editorial_note;
  const parent = books.get(book.parent_bib_id || book.related_bib_id);
  const chapters = data.books.filter(item => item.parent_bib_id === book.bib_id);
  const lookup = book.review_status === 'secondary' ? 'Mở thư mục dẫn lại ↗'
    : book.review_status === 'contents' ? 'Mở mục lục ↗' : 'Mở nguồn công khai ↗';
  return nav(book.collection ? collectionPath(book.collection) : 'bibliography.html') +
    '<p class="eyebrow">' + esc(book.bib_id) + '</p><h2>' + esc(book.title) + '</h2><p>' + esc(metadata) + '</p>' +
    '<p class="badge">' + esc([readingLevel(book), textStatus[book.catalogue_status], priority].filter(Boolean).join(' · ')) + '</p><section class="panel">' +
    (edition ? '<h3>Ấn bản và định vị</h3><p>' + esc(edition) + '</p>' : '') +
    (annotation ? '<h3>Chú giải sử dụng</h3><p>' + esc(annotation) + '</p>' : '') +
    (ref ? '<h3>Nguồn tương ứng trong Bách khoa</h3><div class="links">' + ref + '</div>' :
      book.collection === 'oe-fc' ? '' : '<p>Chưa xác nhận mục tham khảo tương ứng trong Bách khoa.</p>') +
    (cited ? '<h3>Hồ sơ có dẫn nguồn tương ứng</h3><div class="links">' + cited + '</div>' : '') +
    (proposed ? '<h3>Gợi ý đối chiếu theo hồ sơ</h3><div class="links">' + proposed + '</div>' : '') +
    (url ? '<p><a href="' + esc(url) + '" target="_blank" rel="noopener noreferrer">' + lookup + '</a></p>' : '') +
    (supplemental.length ? '<ul>' + supplemental.map((href, index) => '<li><a href="' + esc(href) +
      '" target="_blank" rel="noopener noreferrer">Tài liệu đối chiếu ' + (index + 1) + ' ↗</a></li>').join('') + '</ul>' : '') +
    '<p class="source-note">Kiểm ấn bản và định vị trang, hình hoặc dòng trước khi dùng cho một mệnh đề.</p></section>' +
    (parent ? '<p>Ấn phẩm liên quan ' + link(bookPath(parent.bib_id), parent.title) + '</p>' : '') +
    (chapters.length ? '<details class="panel"><summary>Các chương và biểu ghi liên quan (' + chapters.length +
      ')</summary><div class="links">' + chapters.map(item => link(bookPath(item.bib_id), item.title)).join('') + '</div></details>' : '') +
    (related.length ? '<section class="panel"><h3>Hướng dẫn nguồn theo mục từ</h3><div class="links">' +
      related.map(topic => link(topicPath(topic.topic_id), topic.title)).join('') + '</div></section>' : '');
}

function topicDetail(topic) {
  document.title = topic.title + ' · Hướng dẫn nguồn Bách khoa';
  const sources = (ids, title) => '<section><h3>' + title + '</h3><ol>' + ids.filter(id => books.has(id)).map(id =>
    '<li>' + link(bookPath(id), books.get(id).title) + ' <small>' + esc(id) + '</small></li>').join('') + '</ol></section>';
  const profiles = entityLinks(topic.profile_ids || []);
  const evidence = (topic.evidence || []).map(item =>
    '<article class="panel"><p class="badge">' + esc(item.evidence_id + ' · ' + evidenceLabels[item.support_status]) +
    '</p><p>' + esc(item.text) + '</p><p class="source-note">' + esc(item.locator) +
    '</p><p>' + esc(item.note) + '</p><div class="links">' +
    item.source_ids.filter(id => books.has(id)).map(id => link(bookPath(id), id)).join('') + '</div></article>').join('');
  return nav(collectionPath(topicCollection(topic))) + '<p class="eyebrow">Hướng dẫn nguồn · ' + esc(topic.topic_id) + '</p><h2>' + esc(topic.title) + '</h2>' +
    '<div class="panel"><h3>Dữ liệu cần trích</h3><p>' + esc(topic.locator_guidance) + '</p><h3>Giới hạn diễn giải</h3><p>' + esc(topic.interpretive_limit) + '</p></div>' +
    (profiles ? '<section><h3>Hồ sơ Bách khoa liên quan</h3><div class="links">' + profiles + '</div></section>' : '') +
    (evidence ? '<section><h3>Mệnh đề và chứng cứ</h3>' + evidence + '</section>' : '') +
    sources(topic.core_source_ids, 'Nguồn chính') + sources(topic.comparative_source_ids, 'Nguồn đối chiếu');
}

const params = new URLSearchParams(location.search);
const id = params.get('id'), topicId = params.get('topic');
if (id || topicId) {
  for (const name of ['bib-stats', 'bib-notice', 'bib-search', 'bib-count', 'bib-results', 'bib-topics']) byId(name).hidden = true;
  const record = id ? books.get(id) : topics.get(topicId);
  byId('bib-detail').innerHTML = record ? (id ? bookDetail(record) : topicDetail(record)) :
    nav('bibliography.html') + '<h2>Không tìm thấy mã thư mục</h2>';
  return;
}

const stats = [
  [data.stats.champa_total || 0, 'đầu mục Champa'],
  [data.stats.by_scope?.SH || 0, 'đầu mục Sa Huỳnh'],
  [data.stats.by_scope?.BR || 0, 'chuyển tiếp / đối sánh'],
  [data.stats.oe_fc_total || 0, 'đầu mục Óc Eo – Phù Nam – Chân Lạp'],
  [data.stats.gieng_cham_total || 0, 'đầu mục Giếng Chăm'],
  [topics.size, 'hướng dẫn nguồn theo mục từ']
];
byId('bib-stats').innerHTML = stats.map(([number, label]) => '<div class="stat"><b>' + number + '</b><small>' + esc(label) + '</small></div>').join('');
const q = byId('bib-q'), collection = byId('bib-collection'), domain = byId('bib-domain'), status = byId('bib-status'), review = byId('bib-review');
for (const [value, label] of Object.entries(reviews)) review.add(new Option(label, value));
const inCollection = book => !collection.value || collection.value === (book.collection || 'champa');
function updateOptions() {
  const old = domain.value;
  domain.length = 1;
  [...new Set(data.books.filter(inCollection).map(book => book.domain).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b, 'vi')).forEach(group => domain.add(new Option(group, group)));
  domain.value = [...domain.options].some(option => option.value === old) ? old : '';
}
function render() {
  const term = norm(q.value.trim());
  const terms = term.split(/\s+/).filter(Boolean);
  const includes = value => terms.every(token => norm(value).includes(token));

  const list = data.books.filter(book => inCollection(book) &&
    (!domain.value || domain.value === book.domain) &&
    (!status.value || [book.catalogue_status, book.access_status].includes(status.value)) &&
    (!review.value || book.review_status === review.value) &&
    includes([book.bib_id, book.title, book.author, book.domain, book.year, book.edition, book.publication,
      ...[...book.proposed_profile_ids, ...book.cited_by_entity_ids].map(id => entities.get(id)?.title)].join(' ')));
  const foundTopics = !domain.value && !status.value && !review.value
    ? [...topics.values()].filter(topic => (!collection.value || topicCollection(topic) === collection.value) &&
      (!term || includes([topic.topic_id, topic.title, topic.title_en, topic.locator_guidance].join(' '))))
    : [];
  byId('bib-topics').hidden = !foundTopics.length;
  byId('bib-topic-results').innerHTML = foundTopics.map(topicCard).join('');
  byId('bib-count').textContent = list.length + ' biểu ghi phù hợp';
  byId('bib-results').innerHTML = list.map(bookCard).join('') || '<p class="empty">Không tìm thấy biểu ghi phù hợp.</p>';
}
if ([...collection.options].some(option => option.value === params.get('collection'))) {
  collection.value = params.get('collection');
}
q.value = params.get('q') || '';
collection.addEventListener('change', () => {
  status.value = '';
  review.value = '';
  updateOptions();
  render();
});
for (const input of [q, domain, status, review]) input.addEventListener(input === q ? 'input' : 'change', render);
updateOptions();
render();
})();
