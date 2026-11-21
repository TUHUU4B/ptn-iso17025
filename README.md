# Ứng dụng quản lý phòng thí nghiệm theo TCVN ISO/IEC 17025:2017

Ứng dụng web nội bộ cho phòng thí nghiệm chuyên ngành xây dựng. Mọi thông tin riêng (công ty, phòng thí nghiệm,
nhân sự, thiết bị, chỉ tiêu, mã biểu mẫu) nằm trong trang **Cấu hình**, không viết cứng trong mã.

- Giao diện: Next.js, chạy trên Netlify (gói Free).
- Dữ liệu, đăng nhập: Supabase (PostgreSQL), quyền kiểm soát bằng Row Level Security.
- Mọi thay đổi được ghi vào **Nhật ký sửa đổi**; không xóa dữ liệu, chỉ ngừng dùng.

## Cài đặt lần đầu

### 1. Supabase – cơ sở dữ liệu

1. Vào [supabase.com](https://supabase.com) → **New project**. Chọn vùng **Southeast Asia (Singapore)**, đặt mật khẩu cơ sở dữ liệu và cất kỹ.
2. Mở **SQL Editor** → **New query**, dán toàn bộ nội dung file `supabase/migrations/0001_khung.sql` → **Run**.
3. Tạo query mới, dán toàn bộ `supabase/seed.sql` → **Run**. Bước này nạp dữ liệu ban đầu từ bộ tài liệu đã ban hành
   (công ty, phòng thí nghiệm, 7 nhân sự, 130 chỉ tiêu, 102 thiết bị, 22 thủ tục, 58 mã biểu mẫu).
4. **Authentication → Sign In / Providers**: tắt **Allow new users to sign up** (chỉ quản trị tạo tài khoản).
5. **Authentication → Users → Add user → Create new user**: nhập email và mật khẩu của người làm Quản trị hệ thống, chọn **Auto Confirm User**.
6. Quay lại **SQL Editor**, chạy (thay email và họ tên thật):
   ```sql
   select public.bootstrap_admin('email-cua-quan-tri@...', 'Họ và tên');
   ```
   Nếu họ tên trùng một nhân sự đã nạp sẵn, tài khoản được gắn vào nhân sự đó và thêm vai trò Quản trị hệ thống.
7. **Project Settings → API Keys**: chép **Project URL** và **Publishable key** để dùng ở bước 2.

### 2. Netlify – chạy giao diện web

1. Vào [netlify.com](https://netlify.com), đăng nhập bằng GitHub → **Add new project → Import an existing project → GitHub** → chọn kho `ptn-iso17025`.
2. Ở phần **Environment variables**, thêm:
   - `NEXT_PUBLIC_SUPABASE_URL` = Project URL
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` = Publishable key
3. Bấm **Deploy**. Xong, Netlify cho một địa chỉ dạng `https://ten-du-an.netlify.app`.
4. Quay lại Supabase → **Authentication → URL Configuration** → **Site URL** = địa chỉ Netlify ở trên.

### 3. Thêm người dùng

1. Trong ứng dụng: **Cấu hình → Nhân sự** → mở nhân sự (hoặc **Thêm mới**) → nhập **Email đăng nhập**, chọn vai trò → **Lưu**.
2. Trong Supabase: **Authentication → Users → Add user** với đúng email đó. Tài khoản tự gắn vào nhân sự.
3. Người nghỉ việc: bỏ chọn **Đang làm việc** (không xóa) – tài khoản mất quyền truy cập ngay, hồ sơ cũ vẫn giữ.

## Phân quyền

| Vai trò | Quyền trong bước 1 |
| --- | --- |
| Quản trị hệ thống | Sửa mọi danh mục cấu hình, gán vai trò, xem nhật ký |
| Giám đốc, Phụ trách chất lượng | Xem cấu hình, xem nhật ký |
| Các vai trò khác | Xem cấu hình |

Quyền được kiểm soát ngay trong cơ sở dữ liệu, nên dù gọi thẳng API cũng không vượt được.

## Phát triển

```bash
cp .env.example .env.local   # điền URL và key của Supabase
npm install
npm run dev                  # http://localhost:3000
npm run seed                 # sinh lại supabase/seed.sql khi sửa thư mục data/
```

- `data/` – dữ liệu nạp ban đầu, xuất từ bộ tài liệu hệ thống quản lý (một nguồn duy nhất).
- `supabase/migrations/` – cấu trúc cơ sở dữ liệu, chạy theo thứ tự số.
- `src/lib/registry.ts` – khai báo các danh mục cấu hình; thêm danh mục mới chỉ cần thêm một mục ở đây.

## Lộ trình chặng 1

1. ✅ Khung ứng dụng: đăng nhập, vai trò, Cấu hình, nhật ký, dữ liệu ban đầu
2. Thiết bị và hiệu chuẩn (QT-6.4)
3. Nhân sự và trao quyền (QT-6.2)
4. Tiếp nhận và kết quả (QT-7.1, 7.3, 7.4, 7.8, 7.11)
5. Cải tiến chất lượng (QT-7.9, 7.10, 8.5, 8.8, 8.9)
6. Xác nhận phần mềm (ISO/IEC 17025 điều 7.11.2), sao lưu hằng đêm sang OneDrive công ty
