# Bách khoa Champa — dữ liệu 1.1.0

Ngày 04/11/2026. Atlas Core 1.0.0; schema bách khoa 1.0.2; sổ nghiên cứu 1.0.0.

## Cách dùng

Mở index.html để tìm tên có dấu/không dấu, mã CHP, mã C. hoặc BDS; lọc loại mục, tỉnh theo nguồn và mức rà soát. Mỗi mục mở thành hồ sơ riêng, có đường trở lại bản đồ, các nguồn, mệnh đề và liên kết ngược. Hai lớp mục từ và dòng nguồn được giữ riêng.

148 dòng không đồng nghĩa 148 di tích độc lập, 148 công trình tham khảo hoặc 148 địa điểm đã kiểm chứng. 37 dòng Bắc Champa: 34 ứng viên nối bảng luận án, 3 chưa nối được trong bảng đã đọc. 111 dòng còn lại mới được tổ chức sổ tra cứu, chưa thẩm định học thuật mới. Không có tọa độ nào được nâng mức kiểm chứng trong đợt này.

## Các tệp

- encyclopedia.json, schema, registry, CSV: nền mục từ và mã ổn định; bảo toàn mã cũ.
- source_dossiers.json / CSV: đủ 148 dòng, giữ nguyên trường gốc, kết quả đối chiếu và việc còn mở.
- research_register.json: đánh giá phạm vi đọc từng tài liệu, quan hệ phụ thuộc giữa nguồn, ghi chú 13 hồ sơ.
- coverage_report.json: thống kê độ phủ; chất lượng cấu trúc không đồng nghĩa chất lượng học thuật đã hoàn tất.
- quality_report.json: phép kiểm kỹ thuật và các giới hạn còn giữ.

## Quy tắc học thuật

Mỗi quan sát phải có tài liệu và trang/dòng/hình. Phân biệt nguồn gốc, bản dẫn lại, bản dịch và nhận định biên soạn. Không đếm BAVH dẫn Parmentier rồi Parmentier bàn lại BAVH thành các xác nhận độc lập. BAVH khác BEFEO. Luận văn 2010 khác luận án 2018; không lấy năm tạo PDF hoặc năm đăng tóm tắt làm năm luận án.

Niên đại văn khắc, niên đại hiện vật, pha xây dựng và trùng tu là các trường nghiên cứu khác nhau. Hiện trạng theo luận án phản ánh thời điểm khảo sát của nguồn, không phải hiện trạng năm 2026. Tên trùng không cho phép gộp địa điểm. Địa chỉ nguồn không tự thay thành địa chỉ hành chính mới.

ECLEVI hiện là đầu mối chỉ mục ảnh: chưa kiểm metadata item, ngày chụp, tác giả và quyền sử dụng. Không tải lại hoặc đưa ảnh vào gói khi chưa ghi nhận căn cứ quyền. Các đầu mối Parmentier OCR chưa kiểm ảnh trang vẫn giữ nhãn đầu mối.

Đan–Mạng là khung đặt câu hỏi và kiểm giả thuyết; dùng chung nguồn không chứng minh quan hệ lịch sử. Lớp Quan hệ và biến đổi giữ riêng sự kiện di dời có nguồn với nơi lưu giữ đang ghi nhận.

## Dựng lại và biên tập

Trong dự án: sửa maps/champa/data/ban-do-data.js cho hồ sơ atlas, source/bach-khoa-research.json cho kết quả nghiên cứu, scripts/encyclopedia-ui/ cho giao diện. Chạy python3 scripts/build-encyclopedia.py, rồi python3 atlas.py build champa. Không sửa dist hoặc các JSON xuất.

Trong gói độc lập: chạy python3 scripts/build-encyclopedia.py. Bộ dựng dùng source/atlas_public_source.json khi không có dữ liệu maps/champa. Chỉ cần Python chuẩn; kết quả đọc được khi mở file HTML cục bộ. Gói không chứa toàn văn luận án/sách từ kho riêng.

Ảnh có SHA-256 và trạng thái quyền riêng. Không suy quyền công bố từ tên tác giả hoặc cơ quan. Biểu tượng bản đồ lấy từ maps/champa/atlas.config.json và theme.css, không lấy metadata màu lịch sử cũ làm cấu hình hiện hành.
