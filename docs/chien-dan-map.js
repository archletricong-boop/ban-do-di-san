const sitePoint = [15.6158113, 108.4425979];
const siteMap = L.map('map', {scrollWheelZoom: false}).setView(sitePoint, 17);
L.tileLayer('https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
  maxZoom: 19,
  attribution: 'Ảnh vệ tinh: Esri World Imagery'
}).addTo(siteMap);
L.circleMarker(sitePoint, {radius: 9, color: '#fff9e9', fillColor: '#a34933', fillOpacity: 1})
  .addTo(siteMap).bindTooltip('Nhóm tháp Chiên Đàn', {permanent: true, direction: 'top', offset: [0, -9]});
L.control.scale({imperial: false}).addTo(siteMap);
