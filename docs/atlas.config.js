/* Sinh tự động từ atlas.config.json — không sửa tay. */
(function(o){function f(x){if(x&&typeof x==="object"){Object.values(x).forEach(f);Object.freeze(x);}return x;}window.ATLAS_CONFIG=f(o);})({
 "id": "champa",
 "title": "Bản đồ Di sản Sa Huỳnh–Champa · Óc Eo–Phù Nam · Cát Tiên",
 "tagline": "CỔNG TRA CỨU HỌC THUẬT",
 "lang": "vi",
 "description": "Cổng tra cứu học thuật về di sản Sa Huỳnh và Champa. Tra di tích, hiện vật, văn khắc và tài liệu cùng hồ sơ nguồn và mức kiểm chứng.",
 "editor": "Lê Trí Công",
 "credit": "Lê Trí Công - ChatGPT - Claude",
 "site_url": "https://ban-do-di-san-champa.arch-letricong.chatgpt.site",
 "logo": "assets/branding/identity-v1/logos/mark-do-gach.svg",
 "storage_namespace": "bds",
 "storage_legacy_keys": {
  "imported-coords": "bds-imported-coords-v11",
  "mode": "bds-mode",
  "row-layer": "bds-row-layer"
 },
 "interoperability": {
  "schema_version": "1.0.0",
  "data_version": "2026.11.10",
  "released_at": "2026-11-10",
  "open_data_path": "open-data",
  "schema_path": "schemas/heritage-exchange.schema.json",
  "license": {
   "metadata": "CC BY 4.0",
   "media": "Theo quyền ghi tại từng tài nguyên"
  },
  "geometry_policy": "Chỉ Polygon/MultiPolygon có nguồn và trạng thái kiểm chứng mới được coi là đường bao; Point chỉ là điểm đại diện hoặc mốc đối chiếu.",
  "conservation_policy": "Không suy diễn tình trạng hay rủi ro từ văn bản tự do; chưa có đánh giá cấu trúc được ghi là not_assessed/unknown."
 },
 "map": {
  "center": [
   15.2,
   108.6
  ],
  "zoom": 7,
  "cluster_radius_px": 46,
  "tiles": [
   {
    "name": "Ảnh vệ tinh (Esri World Imagery)",
    "url": "https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    "max_zoom": 19,
    "attribution": "Ảnh: © <a href=\"https://www.arcgis.com/home/item.html?id=10df2279f9684e4a9f6a7f08febac2a9\">Esri World Imagery</a> · Esri, Vantor, Earthstar Geographics, GIS User Community"
   }
  ]
 },
 "symbols": {
  "default": "di_tich",
  "types": {
   "di_tich": {
    "view_box": "-1.875 -1.875 43.75 43.75",
    "label": "Di tích / đền tháp",
    "shape": "circle",
    "svg": "<path transform=\"scale(1.25)\" fill-rule=\"evenodd\" d=\"M12 8Q12 5 16 2Q20 5 20 8Z M9 10H11V11H21V10H23V13H9Z M6 15H8V16H24V15H26V18H6Z M8 20H24V27H27V30H5V27H8Z M13.5 27V24Q13.5 22 16 21Q18.5 22 18.5 24V27Z\"/>"
   },
   "thanh": {
    "view_box": "1.82 2.32 36.36 36.36",
    "label": "Thành cổ",
    "shape": "citadel",
    "svg": "<path fill-rule=\"evenodd\" d=\"M4 7H36V34H25V30H32V11H8V30H15V34H4Z\"/>"
   },
   "bao_tang": {
    "view_box": "0 0 40 40",
    "label": "Bảo tàng",
    "shape": "rounded_square"
   },
   "phe_tich": {
    "view_box": "0 -.5 40 40",
    "label": "Phế tích",
    "shape": "triangle_down",
    "svg": "<path d=\"M4 34V17H9V8H15V14H22V5H31V17H36V34Z\"/>"
   },
   "nui_thieng": {
    "view_box": "0 -.5 40 40",
    "label": "Núi / đỉnh núi",
    "shape": "mountain",
    "svg": "<path d=\"M20 4L36 35H4Z\"/>"
   },
   "song_thieng": {
    "view_box": "-2.5 -1.5 45 45",
    "label": "Đầm · hồ · sông",
    "shape": "ellipse",
    "svg": "<path d=\"M2 9Q7 2 12 9T22 9T32 9T38 9V13Q33 6 28 13T18 13T8 13T2 13ZM2 29Q7 22 12 29T22 29T32 29T38 29V33Q33 26 28 33T18 33T8 33T2 33Z\"/>"
   },
   "mixed": {
    "view_box": "0 0 40 40",
    "label": "Nhiều loại địa điểm",
    "shape": "circle"
   },
   "sa_huynh": {
    "view_box": "-3.75 -3.8 47.5 47.5",
    "label": "Sa Huỳnh",
    "shape": "circle",
    "svg": "<path d=\"M20 1L23.2 7.2A16 16 0 0 1 35.2 28.8L39 35L32.2 34.5A16 16 0 0 1 22 38.9L21 30.94A9 9 0 1 0 19 30.94L18 38.9A16 16 0 0 1 7.8 34.5L1 35L4.8 28.8A16 16 0 0 1 16.8 7.2Z\"/>"
   },
   "canh_quan": {
    "view_box": "-1.25 -1.25 42.5 42.5",
    "label": "Đảo và cảnh quan",
    "shape": "diamond"
   },
   "gieng": {
    "view_box": "-2.5 -2.5 45 45",
    "label": "Giếng Chăm",
    "shape": "ellipse"
   },
   "bia_ky": {
    "view_box": ".625 -.875 38.75 38.75",
    "label": "Bi ký trên đá tự nhiên",
    "svg": "<path d=\"M8 34V15a12 12 0 0 1 24 0v19z\"/>"
   }
  },
  "sacred_ids": [
   "my-son",
   "po-nagar"
  ],
  "emphasis_ids": [
   "dong-duong"
  ]
 }
});
