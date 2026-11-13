(() => {
  'use strict';
  const main = document.querySelector('main');
  const aside = document.querySelector('aside');
  const search = document.querySelector('#search');
  const portalNav = document.querySelector('#portalNav');
  const workspaceNav = document.querySelector('#workspaceNav');
  const headRight = document.querySelector('.head-right');
  const settings = document.createElement('div');
  settings.className = 'mobile-atlas-settings';
  const modes = [...headRight.querySelectorAll('.mode')];
  const phone = matchMedia('(max-width:600px), (max-width:1000px) and (max-height:500px)');
  const toolbar = document.createElement('div');
  toolbar.className = 'trial-toolbar';
  const toggle = document.createElement('button');
  toggle.type = 'button'; toggle.className = 'trial-toggle';
  toggle.setAttribute('aria-label', 'Trình đơn bản đồ');
  aside.id = 'trialSidebar'; toggle.setAttribute('aria-controls', aside.id);
  toggle.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="3"/><path d="M9 3v18m4-12h4m-4 6h4"/></svg>';
  const field = document.createElement('div');
  field.className = 'trial-search-row';
  field.setAttribute('role', 'search');
  field.append(search, toggle);
  toolbar.append(field, portalNav);
  const picker = document.createElement('details');
  picker.className = 'workspace-picker';
  const pickerButton = document.createElement('summary');
  const pickerLabel = document.createElement('span');
  pickerLabel.className = 'workspace-picker-label';
  pickerButton.append(pickerLabel);
  picker.append(pickerButton, workspaceNav);
  field.prepend(picker);
  function syncPickerLabel() {
    const label = workspaceNav.querySelector('[aria-current="page"]')?.textContent.trim();
    const english = document.documentElement.lang === 'en';
    const prompt = english ? 'Choose map' : 'Chọn bản đồ';
    pickerLabel.textContent = label || prompt;
    pickerButton.setAttribute('aria-label', label ? prompt + ' · ' + label : prompt);
  }
  syncPickerLabel();
  new MutationObserver(syncPickerLabel).observe(workspaceNav, {subtree: true, childList: true, attributes: true, attributeFilter: ['aria-current']});
  main.append(toolbar);
  // Map focus is local to this visit; a visible button always restores the tools.
  const mapFocus = document.createElement('button');
  mapFocus.type = 'button';
  mapFocus.className = 'phone-map-focus-toggle';
  mapFocus.setAttribute('aria-controls', 'maparea');
  mapFocus.dataset.original = 'true';
  let focusedMap = false;
  function updateMapFocus() {
    focusedMap = phone.matches && focusedMap;
    document.body.classList.toggle('phone-map-focus', focusedMap);
    mapFocus.hidden = !phone.matches;
    mapFocus.setAttribute('aria-pressed', String(focusedMap));
    const english = document.documentElement.lang === 'en';
    mapFocus.textContent = focusedMap ? (english ? 'Show tools' : 'Hiện công cụ') : (english ? 'Full screen' : 'Toàn màn hình');
    mapFocus.setAttribute('aria-label', focusedMap ? (english ? 'Restore map tools' : 'Hiện lại công cụ bản đồ') : (english ? 'Full screen map' : 'Toàn màn hình bản đồ'));
  }
  mapFocus.addEventListener('click', () => {
    focusedMap = !focusedMap;
    if (focusedMap) { shown = false; picker.open = false; render(); search.blur(); }
    updateMapFocus();
  });
  main.append(mapFocus);
  updateMapFocus();
  new MutationObserver(updateMapFocus).observe(document.documentElement, {attributes:true, attributeFilter:['lang']});
  let shown = (!phone.matches && window.innerWidth > 900) || document.body.classList.contains('workspace-empty');
  const render = () => {document.body.classList.toggle('trial-list-hidden', !shown);toggle.setAttribute('aria-expanded', String(shown));};
  const options = document.createElement('details');
  options.className = 'mobile-atlas-options';
  const optionSummary = document.createElement('summary');
  optionSummary.textContent = 'Tùy chọn';
  const optionBody = document.createElement('div');optionBody.className='mobile-options-body';
  options.append(optionSummary,optionBody);
  const tabs = document.querySelector('#tabs');
  const optionNodes = [...aside.children].slice(0,[...aside.children].indexOf(tabs));
  new MutationObserver(()=>{const en=document.documentElement.lang==='en';optionSummary.textContent=en?'Options':'Tùy chọn';}).observe(document.documentElement,{attributes:true,attributeFilter:['lang']});
  function arrangeControls() {
    picker.open = false;
    if (phone.matches) {
      settings.append(...modes, portalNav);
      optionBody.append(settings,...optionNodes);
      aside.prepend(options);
    } else {
      headRight.append(...modes);
      toolbar.append(portalNav);
      optionNodes.forEach(node=>aside.insertBefore(node,tabs));
      settings.remove();options.remove();
    }
  }
  arrangeControls();
  phone.addEventListener('change', () => {
    arrangeControls();
    updateMapFocus();
    shown = (!phone.matches && window.innerWidth > 900) || document.body.classList.contains('workspace-empty');
    render();
  });
  if (phone.matches && location.hash === '#relations') shown = true;
  render();
  toggle.addEventListener('click', () => {shown = !shown;render();});
  workspaceNav.addEventListener('click', event => {
    if (event.target.closest('a[data-workspace]')) picker.open = false;
  });
  const dismissPickerOutside = event => {
    if (picker.open && !picker.contains(event.target)) picker.open = false;
  };
  document.addEventListener('pointerdown', dismissPickerOutside);
  document.addEventListener('focusin', dismissPickerOutside);
  // Both switching maps and changing the visible layers rebuild the layer controls.
  new MutationObserver(() => { picker.open = false; })
    .observe(document.querySelector('#mapLayerControls'), {childList: true});
  document.querySelector('.skip').addEventListener('click', event => {
    event.preventDefault();
    shown = true;
    render();
    aside.querySelector('#workspaceTitle').focus();
  });
  search.addEventListener('input', () => {if(search.value.trim()){shown = true;render();}});
  if (document.body.dataset.activeWorkspace !== 'tong-hop') document.querySelectorAll('.map-layers').forEach(el => {el.open = false;});
  // Show the map alongside a selected mobile record; the close button stays reachable.
  aside.addEventListener('click', event => {
    if((phone.matches || window.innerWidth <= 900) && event.target.closest('.card')){shown = false;render();}
  });
  window.addEventListener('hashchange', () => {
    if (phone.matches && location.hash === '#relations') { shown = true; render(); }
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && focusedMap && !document.body.classList.contains('panel-open')) {
      focusedMap = false; updateMapFocus(); mapFocus.focus(); return;
    }
    if (event.key === 'Escape' && picker.open) {
      picker.open = false;
      pickerButton.focus();
      return;
    }
    if((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k'){
      event.preventDefault(); document.querySelector('#openContentSearch').click();
    }
  });
})();
