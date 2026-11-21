# Quy ước dự án

- Giao diện, thông báo, chú thích viết bằng tiếng Việt có dấu.
- Không viết cứng thông tin công ty, phòng thí nghiệm, nhân sự, thiết bị, mã biểu mẫu: đọc từ bảng cấu hình.
- Không xóa dữ liệu nghiệp vụ: dùng cột `active` / trạng thái. Không thêm policy DELETE trừ bảng liên kết.
- Mọi bảng mới: bật RLS, gắn trigger `audit_row`, thêm vào `src/lib/registry.ts` nếu là danh mục cấu hình.
- Thay đổi cấu trúc dữ liệu: thêm file migration mới `supabase/migrations/NNNN_ten.sql`, không sửa file đã chạy.
- Dữ liệu nạp ban đầu sửa trong `data/` rồi chạy `npm run seed`.
- Next.js 16: dùng `src/proxy.ts` (không dùng `middleware.ts`); đọc tài liệu trong `node_modules/next/dist/docs/` khi không chắc.
- Kiểm tra trước khi đẩy mã: `npm run lint` và `npm run build`.

- Đặc tả đầy đủ để xây các bước tiếp theo: `docs/HUONG-DAN-XAY-DUNG.md`.
