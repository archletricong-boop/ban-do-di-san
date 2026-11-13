(() => {
  'use strict';

  const MAX_SCALE = 4;
  const MAX_EDGE = 8192;
  const MAX_PIXELS = 40_000_000;
  const ESRI_MAX_ZOOM = 23;

  function snapshot(container, original) {
    const frame = container.getBoundingClientRect();
    const bounds = element => {
      const rect = element.getBoundingClientRect();
      return {x: rect.left - frame.left, y: rect.top - frame.top, w: rect.width, h: rect.height};
    };
    const visible = ({x, y, w, h}) => w > 0 && h > 0 && x < frame.width && y < frame.height && x + w > 0 && y + h > 0;
    const tiles = [...container.querySelectorAll('.leaflet-tile-pane img.leaflet-tile')]
      .map(image => ({image, url: image.src, rect: bounds(image), level: Number(image.parentElement.style.zIndex)}))
      .filter(tile => visible(tile.rect)).sort((a, b) => a.level - b.level);
    const markers = [...container.querySelectorAll('.leaflet-marker-icon')]
      .filter(node => !original.has(node))
      .map(node => ({node, rect: bounds(node), order: Number(node.style.zIndex)}))
      .filter(marker => visible(marker.rect)).sort((a, b) => a.order - b.order);
    return {frame, bounds, visible, tiles, markers};
  }

  function vectorImage(svg, scale) {
    const clone = svg.cloneNode(true);
    const originals = [svg, ...svg.querySelectorAll('*')];
    [clone, ...clone.querySelectorAll('*')].forEach((element, i) => {
      const style = getComputedStyle(originals[i]);
      for (const key of ['fill', 'stroke', 'stroke-width', 'stroke-linejoin', 'display', 'opacity']) {
        element.setAttribute(key, style.getPropertyValue(key));
      }
    });
    const box = svg.getBoundingClientRect();
    clone.setAttribute('width', Math.ceil(box.width * scale));
    clone.setAttribute('height', Math.ceil(box.height * scale));
    const image = new Image();
    image.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(new XMLSerializer().serializeToString(clone));
    return image;
  }

  function textStyle(node, rect, outline = false) {
    const style = getComputedStyle(node);
    return {rect, outline, text: node.textContent.trim(), color: style.color,
      font: `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`};
  }

  function paintText(ctx, {rect, text, color, font, outline}) {
    const x = rect.x + rect.w / 2, y = rect.y + rect.h / 2;
    ctx.font = font;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    if (outline) {
      ctx.lineWidth = 3;
      ctx.lineJoin = 'round';
      ctx.strokeStyle = '#102b40';
      ctx.strokeText(text, x, y);
    }
    ctx.fillStyle = color;
    ctx.fillText(text, x, y);
  }

  function markerStyle({node, rect}, bounds, scale) {
    const svg = node.querySelector('svg');
    const style = getComputedStyle(node);
    const labels = [...node.querySelectorAll('.marker-number, .geographic-label > div')];
    return {rect, name: node.dataset.atlasName || '', opacity: Number(style.opacity),
      icon: svg ? {image: vectorImage(svg, scale), rect: bounds(svg)} : null,
      labels: labels.map(label => textStyle(label, bounds(label), node.classList.contains('geographic-label')))};
  }

  // Reserve non-overlapping slots. Keep true positions where there is room.
  function layoutPlaces(places, width, height) {
    let spacing = Math.min(42, width, height);
    while (Math.floor(width / spacing) * Math.floor(height / spacing) < places.length) spacing *= 0.9;
    const columns = Math.floor(width / spacing), rows = Math.floor(height / spacing);
    const slots = Array.from({length: columns * rows}, (_, i) => ({
      x: ((i % columns) + 0.5) * width / columns,
      y: (Math.floor(i / columns) + 0.5) * height / rows
    }));
    const scale = spacing / 42;
    for (const marker of places) {
      const {x, y, w, h} = marker.rect;
      const anchor = {x: x + w / 2, y: y + h / 2};
      let nearest = 0, distance = Infinity;
      for (let i = 0; i < slots.length; i++) {
        const candidate = (slots[i].x - anchor.x) ** 2 + (slots[i].y - anchor.y) ** 2;
        if (candidate < distance) {
          nearest = i;
          distance = candidate;
        }
      }
      marker.placement = {anchor, position: slots.splice(nearest, 1)[0], scale};
    }
    const margin = spacing / 2;
    for (const {placement} of places) {
      const {anchor} = placement;
      if (anchor.x < margin || anchor.y < margin || anchor.x > width - margin || anchor.y > height - margin) continue;
      const occupied = places.some(({placement: other}) => other !== placement &&
        Math.abs(other.position.x - anchor.x) < spacing && Math.abs(other.position.y - anchor.y) < spacing);
      if (!occupied) placement.position = anchor;
    }
  }

  function paintLeaders(ctx, places) {
    ctx.save();
    ctx.beginPath();
    for (const {placement: {anchor, position}} of places) {
      if (anchor === position) continue;
      ctx.moveTo(anchor.x, anchor.y);
      ctx.lineTo(position.x, position.y);
    }
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.strokeStyle = '#243646';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = '#243646';
    for (const {placement: {anchor, position}} of places) {
      if (anchor === position) continue;
      ctx.beginPath();
      ctx.arc(anchor.x, anchor.y, 2, 0, 2 * Math.PI);
      ctx.fill();
    }
    ctx.restore();
  }

  function paintMarker(ctx, marker) {
    ctx.save();
    ctx.globalAlpha = marker.opacity;
    if (marker.placement) {
      const {anchor, position, scale} = marker.placement;
      ctx.translate(position.x, position.y);
      ctx.scale(scale, scale);
      ctx.translate(-anchor.x, -anchor.y);
    }
    if (marker.icon) {
      const {x, y, w, h} = marker.icon.rect;
      ctx.drawImage(marker.icon.image, x, y, w, h);
    }
    marker.labels.forEach(label => paintText(ctx, label));
    ctx.restore();
  }

  function footer(ctx, width, height, credit, scale) {
    ctx.font = '12px system-ui, sans-serif';
    const pad = 8;
    const creditWidth = Math.min(width - 2 * pad, Math.ceil(ctx.measureText(credit).width) + 12);
    ctx.fillStyle = '#fffffff0';
    ctx.fillRect(width - creditWidth - pad, height - 25, creditWidth, 20);
    ctx.fillStyle = '#18232b';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillText(credit, width - 2 * pad, height - 15, creditWidth - 12);
    if (scale) {
      const scaleWidth = scale.w;
      ctx.fillStyle = '#fffffff0';
      ctx.fillRect(pad, height - 27, scaleWidth + 10, 22);
      ctx.strokeStyle = '#18232b';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(pad + 5, height - 13);
      ctx.lineTo(pad + 5, height - 8);
      ctx.lineTo(pad + 5 + scaleWidth, height - 8);
      ctx.lineTo(pad + 5 + scaleWidth, height - 13);
      ctx.stroke();
      paintText(ctx, {rect: {x: pad + 5, y: height - 25, w: scaleWidth, h: 14},
        text: scale.text, font: '11px system-ui, sans-serif', color: '#18232b'});
    }
  }

  function detailTiles(tiles, visible, step) {
    const split = 2 ** step;
    return tiles.flatMap(({url, rect}) => {
      const match = url.match(/^(https:\/\/services\.arcgisonline\.com\/ArcGIS\/rest\/services\/World_Imagery\/MapServer\/tile\/)\d+\/\d+\/\d+$/i);
      if (!match) return [];
      const [zoom, row, col] = url.slice(match[1].length).split('/').map(Number);
      if (zoom + step > ESRI_MAX_ZOOM) return [];
      const w = rect.w / split, h = rect.h / split;
      const children = [];
      for (let y = 0; y < split; y++) {
        for (let x = 0; x < split; x++) {
          const box = {x: rect.x + x * w, y: rect.y + y * h, w, h};
          if (visible(box)) children.push({rect: box,
            url: `${match[1]}${zoom + step}/${row * split + y}/${col * split + x}?blankTile=false`});
        }
      }
      return children;
    });
  }

  function loadDetailTile(url, deadline) {
    return new Promise(resolve => {
      const image = new Image();
      const finish = result => {
        clearTimeout(timer);
        image.onload = image.onerror = null;
        if (!result) image.removeAttribute('src');
        resolve(result);
      };
      const timer = setTimeout(() => finish(null), Math.max(0, deadline - Date.now()));
      image.crossOrigin = 'anonymous';
      image.onload = () => finish(image);
      image.onerror = () => finish(null);
      image.src = url;
    });
  }

  async function paintDetail(ctx, tiles, deadline) {
    let index = 0, painted = 0;
    async function work() {
      while (index < tiles.length && Date.now() < deadline) {
        const {url, rect: {x, y, w, h}} = tiles[index++];
        const image = await loadDetailTile(url, deadline);
        if (image) {
          ctx.drawImage(image, x, y, w, h);
          painted++;
        }
      }
    }
    await Promise.all(Array.from({length: Math.min(8, tiles.length)}, work));
    return painted;
  }

  function paintPlaceNames(ctx, places, width, height) {
    ctx.save();
    ctx.font = '600 12px Arial, sans-serif';
    ctx.textBaseline = 'middle';
    const taken = places.map(({placement: {position, scale}}) =>
      ({x: position.x - 22 * scale, y: position.y - 22 * scale, w: 44 * scale, h: 44 * scale}));
    const hit = (a, b) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
    for (const marker of places) {
      if (!marker.name) continue;
      const {position, scale} = marker.placement;
      const w = ctx.measureText(marker.name).width + 16;
      const gap = 24 * scale;
      const candidates = [
        {x: position.x + gap, y: position.y - 11, w, h: 22},
        {x: position.x - gap - w, y: position.y - 11, w, h: 22}
      ];
      const box = candidates.find(b => b.x >= 0 && b.y >= 0 && b.x + b.w <= width && b.y + b.h <= height - 30 && !taken.some(t => hit(t, b)));
      if (!box) continue;
      taken.push(box);
      ctx.fillStyle = '#102126e6';
      ctx.fillRect(box.x, box.y, box.w, box.h);
      ctx.fillStyle = '#fff';
      ctx.textAlign = 'left';
      ctx.fillText(marker.name, box.x + 8, box.y + 11);
    }
    ctx.restore();
  }

  async function exportImage(container, fileName, capturePlaces) {
    // Read the temporary marker geometry and styles synchronously before removing the layer.
    const scene = capturePlaces((original, individual) => {
      const {frame, bounds, visible, tiles, markers} = snapshot(container, original);
      if (!frame.width || !frame.height) return null;
      const density = Math.min(MAX_SCALE, MAX_EDGE / Math.max(frame.width, frame.height),
        Math.sqrt(MAX_PIXELS / (frame.width * frame.height)));
      const places = [];
      const decorations = markers.map(marker => {
        const style = markerStyle(marker, bounds, density);
        if (individual.has(marker.node)) places.push(style);
        return style;
      });
      const attribution = container.querySelector('.leaflet-control-attribution')?.textContent.trim();
      const scaleNode = container.querySelector('.leaflet-control-scale-line');
      const scale = scaleNode ? {text: scaleNode.textContent, w: bounds(scaleNode).w} : null;
      return {frame, visible, tiles, density, decorations, places, attribution, scale};
    });
    if (!scene) return null;
    const {frame, visible, tiles, density, decorations, places, attribution, scale} = scene;
    layoutPlaces(places, frame.width, frame.height);

    // Preserve the current visible map. Don't wait indefinitely for the tile service.
    let timeout;
    try {
      await Promise.race([
        Promise.allSettled(tiles.map(({image}) => image.decode())),
        new Promise(resolve => { timeout = setTimeout(resolve, 3000); })
      ]);
    } finally {
      clearTimeout(timeout);
    }
    const available = tiles.filter(({image}) => image.complete && image.naturalWidth);
    if (!available.length) return null;
    const canvas = document.createElement('canvas');
    canvas.width = Math.floor(frame.width * density);
    canvas.height = Math.floor(frame.height * density);
    const ctx = canvas.getContext('2d');
    ctx.scale(canvas.width / frame.width, canvas.height / frame.height);
    ctx.fillStyle = '#dde0e6';
    ctx.fillRect(0, 0, frame.width, frame.height);
    for (const {image, rect: {x, y, w, h}} of available) ctx.drawImage(image, x, y, w, h);
    // Use the active zoom level. Older tiles kept during a zoom still provide a fallback.
    const activeLevel = Math.max(...tiles.map(tile => tile.level));
    const activeTiles = tiles.filter(tile => tile.level === activeLevel);
    const lastStep = Math.max(0, Math.ceil(Math.log2(density)));
    const deadline = Date.now() + 15000;
    let detailLimited = false;
    for (let step = 1; step <= lastStep; step++) {
      const finer = detailTiles(activeTiles, visible, step);
      const painted = await paintDetail(ctx, finer, deadline);
      if (step === lastStep) detailLimited = finer.length === 0 || painted !== finer.length;
    }
    await Promise.all(decorations.filter(marker => marker.icon).map(marker => marker.icon.image.decode()));
    paintLeaders(ctx, places);
    for (const marker of decorations) paintMarker(ctx, marker);
    paintPlaceNames(ctx, places, frame.width, frame.height);
    footer(ctx, frame.width, frame.height,
      [available.length !== tiles.length && 'Ảnh nền tải chưa đủ', attribution].filter(Boolean).join(' · '), scale);

    const png = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
    if (!png) throw new Error('PNG unavailable');
    const url = URL.createObjectURL(png);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 30000);
    const note = available.length !== tiles.length ? ' Một phần ảnh nền chưa tải xong.' :
      detailLimited ? ' Một số vùng chỉ có ảnh nền ở mức chi tiết thấp hơn.' : '';
    return `Đã tải PNG ${canvas.width} × ${canvas.height} px.${note}`;
  }

  window.addAtlasMapImageControl = (map, fileName, capturePlaces) => {
    const control = L.control({position: 'topright'});
    control.onAdd = () => {
      const panel = L.DomUtil.create('div', 'map-image-control');
      const button = L.DomUtil.create('button', 'btn', panel);
      const status = L.DomUtil.create('div', 'map-image-status', panel);
      button.type = 'button';
      button.setAttribute('aria-label', 'Xuất ảnh');
      button.innerHTML = '<span class="map-image-label">Xuất ảnh</span><svg class="map-image-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3v12m-4-4 4 4 4-4M4 16v4h16v-4"/></svg>';
      button.title = 'Tải PNG độ nét cao với từng ghim trong vùng đang xem';
      status.setAttribute('role', 'status');
      L.DomEvent.disableClickPropagation(panel);
      L.DomEvent.disableScrollPropagation(panel);
      button.addEventListener('click', async () => {
        button.disabled = true;
        status.textContent = 'Đang tải ảnh nền chi tiết và xuất PNG…';
        try {
          const result = await exportImage(map.getContainer(), fileName(), capturePlaces);
          status.textContent = result || 'Chưa tải được ảnh nền. Hãy thử lại khi bản đồ đã tải xong.';
          if (result) {
            await new Promise(resolve => setTimeout(resolve, 1200));
            panel.classList.add('is-closing');
            await new Promise(resolve => setTimeout(resolve, 850));
            status.textContent = '';
            panel.classList.remove('is-closing');
          }
        } catch {
          status.textContent = 'Chưa xuất được ảnh. Hãy thử lại sau khi bản đồ tải xong.';
        } finally {
          button.disabled = false;
        }
      });
      return panel;
    };
    control.addTo(map);
  };
})();
