/* Spatial analysis of documented provenance and repository associations. */
(() => {
  'use strict';

  function buildGraph(records) {
    const edges = new Map();
    const nodes = new Map();
    for (const record of records) {
      const from = record.from_place, to = record.to_place;
      if (!from || !to || from === to) continue;
      const key = JSON.stringify([from, to]);
      if (!edges.has(key)) edges.set(key, {from, to, records: new Map()});
      const edge = edges.get(key);
      const previous = edge.records.get(record.object_id);
      if (!previous || record.status === 'recorded_with_source') edge.records.set(record.object_id, record);
      for (const id of [from, to]) if (!nodes.has(id)) nodes.set(id, new Map());
    }
    const links = [...edges.values()].map(edge => ({...edge, records: [...edge.records.values()]}));
    for (const {from, to, records: objects} of links) {
      nodes.get(from).set(to, (nodes.get(from).get(to) || 0) + objects.length);
      nodes.get(to).set(from, (nodes.get(to).get(from) || 0) + objects.length);
    }
    return {nodes, links};
  }

  function metrics(nodes) {
    const ids = [...nodes.keys()];
    const size = ids.length;
    const degree = new Map(ids.map(id => [id, [...nodes.get(id).values()].reduce((sum, n) => sum + n, 0)]));
    const bridge = new Map(ids.map(id => [id, 0]));
    const component = new Map();
    let count = 0;
    for (const root of ids) {
      if (component.has(root)) continue;
      count++;
      const queue = [root];
      component.set(root, count);
      for (const id of queue) {
        for (const peer of nodes.get(id).keys()) {
          if (component.has(peer)) continue;
          component.set(peer, count);
          queue.push(peer);
        }
      }
    }

    // Brandes on the simple undirected graph. Multiplicity is used only for strength and PageRank.
    for (const root of ids) {
      const order = [root], distance = new Map([[root, 0]]), paths = new Map([[root, 1]]);
      const parents = new Map(), dependency = new Map(ids.map(id => [id, 0]));
      for (const id of order) {
        const nextDistance = distance.get(id) + 1;
        for (const peer of nodes.get(id).keys()) {
          if (!distance.has(peer)) {
            distance.set(peer, nextDistance);
            paths.set(peer, 0);
            parents.set(peer, []);
            order.push(peer);
          }
          if (distance.get(peer) !== nextDistance) continue;
          paths.set(peer, paths.get(peer) + paths.get(id));
          parents.get(peer).push(id);
        }
      }
      for (const id of order.reverse()) {
        for (const parent of parents.get(id) || []) {
          dependency.set(parent, dependency.get(parent) + paths.get(parent) / paths.get(id) * (1 + dependency.get(id)));
        }
        if (id !== root) bridge.set(id, bridge.get(id) + dependency.get(id));
      }
    }
    if (size > 2) for (const id of ids) bridge.set(id, bridge.get(id) / ((size - 1) * (size - 2)));

    let rank = new Map(ids.map(id => [id, 1 / size]));
    for (let iteration = 0; iteration < 150; iteration++) {
      const next = new Map(ids.map(id => [id, 0.15 / size]));
      for (const id of ids) {
        for (const [peer, weight] of nodes.get(id)) {
          next.set(peer, next.get(peer) + 0.85 * rank.get(id) * weight / degree.get(id));
        }
      }
      const delta = ids.reduce((sum, id) => sum + Math.abs(next.get(id) - rank.get(id)), 0);
      rank = next;
      if (delta < 1e-10) break;
    }
    return {degree, bridge, rank, component, count};
  }

  const mapHost = document.getElementById('network-map');
  if (!mapHost) return;
  const atlas = window.BDS.atlas;
  const data = window.CHAMPA_RELATIONS;
  const records = data.records.filter(record => record.type === 'provenance_storage');
  const places = new Map(atlas.places.map(place => [place.id, place]));
  const sources = new Map(atlas.sources.map(source => [source.id, source]));
  const byId = id => document.getElementById(id);
  const status = byId('network-status'), rankList = byId('network-ranks'), edgeList = byId('network-edges');
  const scope = byId('network-scope'), metric = byId('network-metric');
  const fromYear = byId('network-from'), toYear = byId('network-to'), unknown = byId('network-unknown');
  const esc = window.AtlasCore.esc;
  const safeHref = window.AtlasCore.attrUrl;
  const title = id => places.get(id)?.name || id;
  const loc = id => places.get(id)?.locations.find(point =>
    point.primary && point.map_visible !== false && Number.isFinite(point.lat) && Number.isFinite(point.lon));
  const map = window.L ? L.map(mapHost).setView([16, 109], 5) : null;
  const drawn = map ? L.layerGroup().addTo(map) : null;
  if (map) {
    const base = window.ATLAS_CONFIG.map.tiles[0];
    L.tileLayer(base.url, {attribution: window.AtlasCore.sanitizeHTML(base.attribution), maxZoom: base.max_zoom}).addTo(map);
    L.control.scale({imperial: false}).addTo(map);
  }
  const documented = record => record.status === 'recorded_with_source';
  const fmt = new Intl.NumberFormat('vi-VN', {maximumFractionDigits: 4});
  const nodeLink = id => places.has(id) ? '<a href="./#'+encodeURIComponent(id)+'">'+esc(title(id))+'</a>' : esc(id);
  function openEdge(i) {
    const card = edgeList.querySelector('[data-edge="'+i+'"]');
    if (!card) return;
    card.open = true;
    card.querySelector('summary').focus();
  }

  function render() {
    const min = Number(fromYear.value), max = Number(toYear.value);
    const valid = fromYear.validity.valid && toYear.validity.valid && (!min || !max || min <= max);
    const byYear = valid ? records.filter(r => r.source_year == null ? unknown.checked :
      (!min || r.source_year >= min) && (!max || r.source_year <= max)) : [];
    const available = byYear.filter(r => scope.value === 'extended' || documented(r));
    const {nodes, links} = buildGraph(available);
    const results = metrics(nodes);
    const scores = results[metric.value];
    drawn?.clearLayers();
    const pairs = links.filter(edge => loc(edge.from) && loc(edge.to));
    const candidates = links.reduce((n, edge) => n + edge.records.filter(r => !documented(r)).length, 0);
    const used = links.reduce((n, edge) => n + edge.records.length, 0);
    status.textContent = valid ?
      nodes.size+' nút · '+links.length+' cặp nơi phát hiện–lưu giữ · '+used+' lượt ghi hiện vật · '+results.count+' thành phần. '+pairs.length+' cặp có hai tọa độ để vẽ. '+candidates+' lượt ghi chờ đối chiếu nguồn. '+available.filter(r=>!r.from_place||!r.to_place).length+' bản ghi thiếu đầu mối.' :
      'Khoảng năm nguồn chưa hợp lệ.';
    rankList.innerHTML = [...scores].sort((a,b)=>b[1]-a[1]||title(a[0]).localeCompare(title(b[0]),'vi')).map(([id,score]) =>
      '<tr><td>'+nodeLink(id)+'</td><td>'+fmt.format(score)+'</td><td>'+results.component.get(id)+'</td></tr>').join('');
    edgeList.innerHTML = links.map(({from,to,records: objects}, i) => '<details data-edge="'+i+'"><summary>'+
      esc(title(from))+' → '+esc(title(to))+' · '+objects.length+' hiện vật</summary><ul>'+objects.map(record=>{
        const source = sources.get(record.source_id);
        const label = source?.short || source?.citation;
        return '<li><a href="./#entity:object:'+encodeURIComponent(record.object_id)+'">'+esc(record.title)+'</a> · '+
          esc(documented(record)?'Có nguồn trong hồ sơ':'Chờ đối chiếu nguồn')+
          (label?' · '+(source.url?'<a href="'+safeHref(source.url)+'">'+esc(label)+'</a>':esc(label)):'')+
          (record.source_year?' · '+esc(record.source_year):'')+'</li>';
      }).join('')+'</ul></details>').join('');
    if (!drawn) return;
    links.forEach((edge, i) => {
      const a=loc(edge.from), b=loc(edge.to);
      if (!a || !b) return;
      const provisional=edge.records.some(r=>!documented(r));
      L.polyline([[a.lat,a.lon],[b.lat,b.lon]], {color:provisional?'#90606f':'#00839e', dashArray:provisional?'4 6':null,
        weight:Math.min(9,2+Math.log2(edge.records.length)),opacity:0.84}).addTo(drawn)
        .bindTooltip(esc(title(edge.from)+' → '+title(edge.to)+' · '+edge.records.length))
        .on('click',()=>openEdge(i));
    });
    const points=[];
    const peak=Math.max(0,...scores.values());
    for (const [id,score] of scores) {
      const point=loc(id);
      if (!point) continue;
      points.push([point.lat,point.lon]);
      L.circleMarker([point.lat,point.lon], {radius:5+(peak?Math.sqrt(score/peak)*10:0), color:'#fff',weight:2,
        fillColor:'#dd8837',fillOpacity:0.95}).addTo(drawn)
        .bindTooltip(esc(title(id)+' · '+fmt.format(score)))
        .bindPopup(nodeLink(id));
    }
    if (points.length) map.fitBounds(points,{padding:[32,32],maxZoom:12,animate:false});
  }
  [scope,metric,fromYear,toYear,unknown].forEach(input=>input.addEventListener('change',render));
  render();
})();
