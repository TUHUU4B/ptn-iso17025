# Hướng dẫn xây dựng ứng dụng quản lý PTN theo TCVN ISO/IEC 17025:2017

> Tài liệu này dành cho trợ lý lập trình AI (GitHub Copilot, Claude Code… trong VS Code) và người lập trình.
> Đọc **toàn bộ** tài liệu này và file `CLAUDE.md` trước khi viết mã. Làm **đúng một bước** mỗi lần, theo thứ tự ở mục 13.
> Khi tài liệu không nói rõ một điều, **dừng lại và hỏi người dùng**, không tự suy diễn (xem mục 14).

---

## 1. Bối cảnh

- **Người dùng:** một phòng thí nghiệm chuyên ngành xây dựng (mã LAS-XD), khoảng 7–10 người, dùng trên **máy tính**.
- **Mục đích:** thay sổ sách giấy và file Word rời bằng một ứng dụng web nội bộ, bám sát hệ thống tài liệu ISO/IEC 17025
  gồm Sổ tay chất lượng và 22 thủ tục (QT-4.1 … QT-8.9) đã ban hành.
- **Không cá nhân hóa:** mọi thông tin riêng (công ty, phòng thí nghiệm, nhân sự, thiết bị, chỉ tiêu, mã biểu mẫu, quy tắc
  đánh số, thông số) là **dữ liệu sửa được trong trang Cấu hình**, không viết cứng trong mã.
- **Chỉ dùng nội bộ**, không bán, không nhiều khách thuê (single-tenant).
- **Excel giữ vai trò tính toán:** thí nghiệm viên vẫn nhập số liệu và in phiếu kết quả từ 71 file Excel `.xlsm` đã có.
  Ứng dụng **không** tính lại kết quả; ứng dụng nhận bản PDF phiếu đã ký và file Excel đã dùng, gắn vào đúng mẫu.
- **Ký tay trên bản giấy:** duyệt trên ứng dụng chỉ ghi lại việc duyệt; phiếu kết quả bản giấy vẫn ký tay (QT-7.8).
- **Nhắc việc chỉ hiện trên trang chủ**, không gửi email.
- **Không làm danh bạ khách hàng riêng:** tên, địa chỉ khách hàng và công trình đã nhập được **gợi ý lại** khi lập phiếu mới.

## 2. Nguyên tắc bắt buộc

1. **Tiếng Việt có dấu** cho mọi giao diện, thông báo lỗi, chú thích mã, tên tệp tài liệu. Ngày hiển thị `dd/mm/yyyy`,
   giờ theo `Asia/Ho_Chi_Minh` (UTC+7). Hàm định dạng dùng chung ở `src/lib/format.ts`.
2. **Không viết cứng** thông tin công ty, phòng thí nghiệm, nhân sự, thiết bị, mã biểu mẫu, lần ban hành: luôn đọc từ bảng
   `company`, `lab`, `staff`, `equipment`, `form_codes`, `settings`, `numbering_rules`.
3. **Không xóa dữ liệu nghiệp vụ.** Dùng cột `active` hoặc trạng thái. Không tạo policy `DELETE`, trừ bảng liên kết thuần
   (ví dụ `staff_roles`).
4. **Mọi bảng mới:** bật RLS, gắn trigger `audit_row` (ghi nhật ký), có policy đọc/ghi rõ ràng theo vai trò.
5. **Quy tắc nghiệp vụ quan trọng phải được chặn trong cơ sở dữ liệu** (CHECK, trigger, hàm `security definer`), không chỉ
   trên giao diện. Giao diện chỉ hiển thị lỗi thân thiện.
6. **Mỗi thay đổi cấu trúc dữ liệu là một file migration mới** `supabase/migrations/NNNN_ten.sql`, số tăng dần.
   Không sửa migration đã chạy.
7. **Một nguồn sự thật (DRY):** thông tin nhập một lần, dùng lại mọi nơi. Ví dụ hạn hiệu chuẩn nhập ở phân hệ Thiết bị,
   phân hệ Tiếp nhận tự biết thiết bị nào không được chọn.
8. **YAGNI, KISS:** chỉ làm phạm vi của bước đang làm. Không thêm thư viện khi chưa cần. Vấn đề giống nhau → cách giải
   giống nhau; thành phần giao diện giống nhau → dùng chung component.
9. **Bám đúng mã và tên biểu mẫu đã ban hành** (mục 12). Bản in có chân trang `<mã biểu mẫu> | Lần ban hành: <lần>` lấy từ
   `form_codes`.
10. **Kiểm tra trước khi đẩy mã:** `npm run lint`, `npm run build`, và chạy file kiểm thử SQL của bước (mục 11).

## 3. Kiến trúc và hạ tầng

| Thành phần | Công nghệ | Gói | Ghi chú |
| --- | --- | --- | --- |
| Giao diện web | Next.js 16 (App Router, TypeScript, Server Components, Server Actions), Tailwind CSS 4 | – | Next.js 16 dùng `src/proxy.ts`, **không** dùng `middleware.ts` |
| Chạy giao diện | Netlify | Free | Cho phép dùng cho công ty. **Không dùng Vercel Hobby** (chỉ cho cá nhân, phi thương mại) |
| Cơ sở dữ liệu, đăng nhập, lưu file | Supabase (PostgreSQL, Auth, Storage) | Free | 500 MB dữ liệu, 1 GB file, không tự sao lưu |
| Sao lưu | GitHub Actions + rclone → OneDrive tài khoản công ty `ctytuhuu4b@hotmail.com` | Free | Mỗi đêm; xem bước 6 |
| Mã nguồn | GitHub `TUHUU4B/ptn-iso17025` | Free | Nhánh `main` tự triển khai lên Netlify |

**Biến môi trường** (`.env.local` khi chạy máy, Environment variables trên Netlify):

```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...
```

Không dùng service role key trong ứng dụng web. Mọi truy vấn chạy bằng quyền người đang đăng nhập (RLS quyết định).

### 3.1. Cấu trúc thư mục hiện có

```
data/                      Dữ liệu nạp ban đầu (JSON) xuất từ bộ tài liệu
scripts/gen-seed.mjs       Sinh supabase/seed.sql từ data/  (npm run seed)
supabase/migrations/       0001_khung.sql …
supabase/seed.sql          Tự sinh, không sửa tay
supabase/tests/            File kiểm thử SQL của từng bước (tạo mới từ bước 2)
src/proxy.ts               Làm mới phiên, chặn người chưa đăng nhập
src/lib/supabase/          server.ts (client cho server), proxy.ts (updateSession)
src/lib/session.ts         getMe(), requireMe(), isAdmin() – người dùng và vai trò
src/lib/registry.ts        Khai báo các danh mục cấu hình (một nguồn cho danh sách, form, hàm lưu)
src/lib/format.ts          fmtDate, fmtDateTime, display, todayVN
src/lib/entity-data.ts     loadRefs – nhãn cho trường tham chiếu
src/components/            list-table.tsx (bảng có lọc nhanh), entity-form.tsx (form chung)
src/app/dang-nhap/         Đăng nhập, đăng xuất
src/app/(app)/             Các trang sau đăng nhập: trang chủ, cau-hinh/[bang], cau-hinh/[bang]/[id], cau-hinh/nhat-ky
```

### 3.2. Mẫu lập trình đã dùng (tiếp tục dùng y hệt)

- **Danh mục đơn giản** (một bảng, thêm/sửa/ngừng dùng): khai báo một `Entity` trong `src/lib/registry.ts`
  → tự có trang danh sách, form sửa, hàm lưu `saveEntity`. Không viết trang riêng.
- **Nghiệp vụ có luồng** (phiếu yêu cầu, mẫu, phiếu kết quả…): trang riêng trong `src/app/(app)/<phan-he>/`,
  Server Action trong `actions.ts` cùng thư mục, gọi hàm SQL (`rpc`) khi thao tác cần nhiều bước hoặc cần khóa số.
- **Lỗi từ cơ sở dữ liệu** chuyển sang câu tiếng Việt bằng hàm `friendly()` (đưa về `src/lib/errors.ts` khi dùng ở nơi thứ hai).
  Hàm SQL tự báo lỗi bằng `raise exception 'câu tiếng Việt'` để giao diện hiển thị nguyên văn.
- **Update bị RLS chặn không báo lỗi** mà trả về 0 dòng: luôn `.select()` sau `update` và kiểm tra số dòng.
- **Kiểu cột:** khóa chính `uuid` (bảng nghiệp vụ) hoặc `serial` (danh mục); ngày `date`; thời điểm `timestamptz`;
  danh sách ngắn `text[]`; dữ liệu riêng theo loại `jsonb` có kiểm tra khóa bằng CHECK hoặc trigger.

## 4. Hiện trạng – Bước 1 đã xong

**Bảng:** `company`, `lab` (1 dòng), `roles`, `staff`, `staff_roles`, `material_groups`, `tests`, `equipment_groups`,
`equipment` (có cột tự tính `next_due_date`), `procedures`, `form_codes`, `numbering_rules`, `settings`, `audit_log`.

**Hàm:** `is_active_staff()`, `has_role(text)`, `audit_row()` (trigger), `touch_updated_at()`, `link_staff_account()`
(trigger trên `auth.users`: tự gắn tài khoản vào nhân sự cùng email), `bootstrap_admin(email, họ tên)` (chỉ chạy trong SQL Editor).

**RLS hiện tại:** đọc = nhân sự đang làm việc; ghi = `admin`; nhật ký đọc = `admin`, `giam_doc`, `phu_trach_cl`; nhật ký không
ai sửa/xóa được.

**Trang:** đăng nhập; trang chủ (nhắc thiết bị đến hạn trong N ngày, N = `settings.nhac_truoc_han_ngay`); Cấu hình với 12 danh
mục; Nhật ký sửa đổi.

## 5. Vai trò và phân quyền

| Mã vai trò | Tên | Quyền chính (tích lũy theo các bước) |
| --- | --- | --- |
| `admin` | Quản trị hệ thống | Cấu hình, gán vai trò. **Không** sửa hồ sơ chuyên môn |
| `giam_doc` | Giám đốc | Xem toàn bộ; duyệt giấy ủy quyền ký; xem xét của lãnh đạo |
| `truong_ptn` | Trưởng PTN | Phân công; duyệt, phát hành phiếu kết quả; trao quyền nhân sự; quyết định xử lý không phù hợp; phê duyệt kế hoạch hiệu chuẩn |
| `uy_quyen_ky` | Người được ủy quyền ký | Như Trưởng PTN khi duyệt/phát hành, **chỉ trong phạm vi và thời hạn** giấy ủy quyền còn hiệu lực |
| `phu_trach_cl` | Phụ trách chất lượng | Thiết bị (lý lịch, kế hoạch, kết quả hiệu chuẩn); rủi ro; đánh giá nội bộ; khiếu nại; theo dõi hành động khắc phục; xác nhận file Excel |
| `nhan_mau` | Cán bộ nhận mẫu | Phiếu yêu cầu, biên bản lấy mẫu, nhận mẫu, cấp mã mẫu, giao phiếu kết quả, lưu/hủy mẫu |
| `tnv` | Thí nghiệm viên | Xem việc được giao; ghi thiết bị đã dùng; tải PDF, Excel; mở phiếu không phù hợp |

**Quy tắc chung:**

- Một người có thể giữ nhiều vai trò. Phân quyền theo **vai trò** (màn hình nào) và theo **trao quyền chỉ tiêu** (bước 3:
  ai được thử, ai được duyệt chỉ tiêu nào).
- **Người duyệt phiếu kết quả phải khác người thử** (Phụ lục III VBHN 54/VBHN-BXD: phiếu phải có chữ ký người thí nghiệm
  và người quản lý).
- Mỗi bảng mới khai báo policy theo mẫu: `using (public.has_role('...') or public.has_role('...'))`.

## 6. Bước 2 – Thiết bị và hiệu chuẩn (QT-6.4)

**Mục tiêu:** lý lịch từng thiết bị; kế hoạch hiệu chuẩn/kiểm tra năm; xác nhận kết quả hiệu chuẩn; tự cập nhật hạn; chặn dùng
thiết bị không đạt yêu cầu.

**Biểu mẫu liên quan:** BM-01/QT-6.4 Lý lịch thiết bị · BM-02 Danh mục thiết bị · BM-03 Kế hoạch hiệu chuẩn, kiểm tra năm ·
BM-04 Phiếu xác nhận kết quả hiệu chuẩn · BM-05 Tem trạng thái thiết bị · BM-06 Biên bản kiểm tra nội bộ thiết bị ·
HD-01 … HD-06/QT-6.4. QT-5.4 BM-01: Phiếu kiểm tra thiết bị mang ra hiện trường.

### 6.1. Dữ liệu (migration `0002_thiet_bi.sql`)

- `equipment` – bổ sung cột: `manufacturer`, `model`, `serial_no`, `received_date date`, `location text`,
  `range_spec text` (phạm vi đo, độ chính xác). Giữ nguyên `last_check_date`, `next_due_date`.
- `equipment_events` – sự kiện trong đời thiết bị (lý lịch BM-01):
  - `id uuid`, `equipment_id int not null`, `kind text check in ('hieu_chuan','kiem_tra_noi_bo','kiem_tra_giua_ky','bao_tri','sua_chua','hu_hong','mang_ra_hien_truong','tra_ve')`,
  - `event_date date not null`, `performed_by text` (đơn vị hiệu chuẩn hoặc người kiểm tra), `certificate_no text`,
  - `result text check in ('dat','khong_dat') null`, `conclusion text`, `file_path text` (giấy chứng nhận trong Storage),
  - `confirmed_by uuid references staff`, `confirmed_at timestamptz` (BM-04: xác nhận kết quả so với yêu cầu),
  - `created_by uuid default` người đang đăng nhập, `created_at`.
- `calibration_plans` – kế hoạch năm (BM-03): `year int`, `equipment_id`, `planned_month int 1..12`, `kind`, `note`;
  `unique(year, equipment_id, kind)`. Phê duyệt: `plan_approvals(year pk, approved_by, approved_at)`.
- Storage bucket `thiet-bi` (riêng tư), đường dẫn `equipment/<code>/<yyyy-mm-dd>-<loai>.pdf`.

### 6.2. Quy tắc (chặn trong cơ sở dữ liệu)

1. Khi một sự kiện `hieu_chuan` hoặc `kiem_tra_noi_bo` được **xác nhận** (`confirmed_at` có giá trị) với `result = 'dat'`:
   trigger cập nhật `equipment.last_check_date = event_date`, `certificate = certificate_no`.
2. Xác nhận với `result = 'khong_dat'`, hoặc sự kiện `hu_hong`: `equipment.status = 'hong_cho_sua'`.
3. Sự kiện chưa xác nhận **không** làm đổi hạn (giấy chứng nhận phải được đối chiếu yêu cầu trước – BM-04).
4. Thiết bị được coi là **dùng được** khi: `active`, `status = 'dang_su_dung'`, và (`assurance = 'KHONG'` hoặc
   `next_due_date >= hôm nay`). Viết thành hàm SQL `equipment_usable(id int) returns boolean` – bước 4 dùng lại.
5. Khi thiết bị chuyển sang không đạt: hàm `reports_using_equipment(equipment_id, since date)` liệt kê phiếu kết quả đã dùng
   thiết bị từ lần đạt gần nhất (bước 4 mới có dữ liệu; bước 2 tạo hàm trả về rỗng hoặc tạo sau ở bước 4 – ghi chú rõ).

### 6.3. Quyền

Đọc: nhân sự đang làm. Ghi sự kiện, kế hoạch: `phu_trach_cl`, `admin`. Xác nhận kết quả (BM-04): `phu_trach_cl`,
`truong_ptn`. Phê duyệt kế hoạch năm: `truong_ptn`.

### 6.4. Màn hình

- `/thiet-bi` – danh sách: lọc theo nhóm, trạng thái, "quá hạn / sắp đến hạn / chưa có ngày"; màu: đỏ quá hạn, vàng sắp đến hạn.
- `/thiet-bi/[id]` – lý lịch: thông tin chung + dòng thời gian sự kiện + nút "Ghi sự kiện" + tải giấy chứng nhận.
- `/thiet-bi/ke-hoach/[nam]` – kế hoạch năm dạng bảng thiết bị × 12 tháng; nút "Tạo từ hạn hiện có" (đặt tháng = tháng của
  `next_due_date` trong năm đó); phê duyệt.
- In: BM-01 (lý lịch), BM-03 (kế hoạch), BM-05 (tem: mã, tên, ngày, hạn, trạng thái – nhiều tem trên một trang A4).
- Danh mục "Thiết bị" trong Cấu hình giữ để sửa thông tin gốc; trang chủ giữ phần nhắc việc.

### 6.5. Hoàn thành khi

- Ghi một sự kiện hiệu chuẩn, xác nhận "đạt" → hạn kế tiếp đổi đúng; xác nhận "không đạt" → trạng thái đổi; sự kiện chưa
  xác nhận không đổi hạn.
- Thí nghiệm viên không ghi được sự kiện; nhật ký có đủ thay đổi.
- `supabase/tests/0002_thiet_bi.sql` chạy qua (mục 11).

## 7. Bước 3 – Nhân sự và trao quyền (QT-6.2)

**Biểu mẫu:** BM-01/QT-6.2 Mô tả công việc và yêu cầu năng lực · BM-02 Hồ sơ năng lực cá nhân · BM-03 Kế hoạch đào tạo năm ·
BM-04 Biên bản đánh giá tay nghề · BM-05 Quyết định trao quyền · BM-06 Ma trận năng lực.

### 7.1. Dữ liệu (migration `0003_nhan_su.sql`)

- `staff` – bổ sung: `birth_year int`, `phone text`, `joined_date date`.
- `job_descriptions` – theo chức danh (BM-01): `title`, `duties text`, `requirements text`, `reports_to text`, `active`.
- `qualifications` – bằng cấp, chứng chỉ (BM-02): `staff_id`, `kind check in ('bang_cap','chung_chi','kinh_nghiem')`,
  `name`, `issuer`, `issued_on text` (ghi như trên giấy, có thể chỉ tháng/năm), `cert_no`, `expires_on date null`,
  `file_path`.
- `training_plans` (BM-03): `year`, `topic`, `participants text`, `planned_time text`, `provider`, `status`, `result`.
- `competency_assessments` (BM-04): `staff_id`, `test_id`, `assessed_on date`, `method text`, `result check in ('dat','khong_dat')`,
  `assessor_id uuid references staff`, `note`, `file_path`.
- `authorizations` (BM-05, nguồn cho BM-06): `staff_id`, `test_id`, `level check in ('dao_tao','thuc_hien','soat_xet')`,
  `assessment_id uuid not null references competency_assessments`, `granted_by uuid references staff`, `valid_from date`,
  `revoked_on date null`, `revoked_reason`. Không xóa – thu hồi bằng `revoked_on`.
- `signing_delegations` – giấy ủy quyền ký (QT-7.8): `delegate_id uuid references staff`, `scope text`, `valid_from date`,
  `valid_to date`, `document_no`, `approved_by uuid` (Giám đốc), `file_path`.

### 7.2. Quy tắc

1. Chỉ trao quyền khi `competency_assessments.result = 'dat'` và cùng `staff_id`, `test_id` (trigger kiểm tra).
2. `granted_by` phải có vai trò `truong_ptn` (kiểm tra trong trigger bằng `has_role` của người đang đăng nhập).
3. Hàm `can_perform(staff_id, test_id)` và `can_review(staff_id, test_id)`: có trao quyền hiệu lực (chưa thu hồi,
   `valid_from <= hôm nay`) ở mức tương ứng. Bước 4 dùng hai hàm này.
4. Hàm `can_sign_as_head(staff_id, on_date)`: có vai trò `truong_ptn`, hoặc có `signing_delegations` hiệu lực vào ngày đó.
5. Nhắc trên trang chủ: chứng chỉ hết hạn trong 60 ngày (số ngày thêm vào `settings`); chỉ tiêu chỉ còn ≤ 1 người được thực hiện.
6. Nhân sự nghỉ việc (`active = false`): mọi `authorizations` còn hiệu lực tự thu hồi (trigger), lý do "Nghỉ việc".

### 7.3. Màn hình

- `/nhan-su` – danh sách; `/nhan-su/[id]` – hồ sơ năng lực (bằng cấp, chứng chỉ, đánh giá tay nghề, quyền hiện có).
- `/nhan-su/ma-tran` – ma trận nhân sự × chỉ tiêu (ô: Đ đào tạo / T thực hiện / S soát xét), lọc theo nhóm vật liệu; in BM-06.
- `/nhan-su/dao-tao/[nam]` – kế hoạch đào tạo; `/nhan-su/uy-quyen` – giấy ủy quyền ký.
- In: BM-02, BM-04, BM-05, BM-06.

### 7.4. Hoàn thành khi

- Không trao quyền được nếu chưa có đánh giá tay nghề đạt; khóa nhân sự → quyền tự thu hồi.
- `can_perform`, `can_review`, `can_sign_as_head` trả đúng trong các trường hợp ở `supabase/tests/0003_nhan_su.sql`.

## 8. Bước 4 – Tiếp nhận và kết quả (QT-7.1, 7.3, 7.4, 7.8, 7.11)

**Biểu mẫu:** BM-01/QT-7.1 Phiếu yêu cầu thí nghiệm · BM-02/QT-7.1 Phiếu trao đổi với khách hàng ·
BM-01/QT-7.3 Biên bản lấy mẫu bê tông, vữa · BM-02/QT-7.3 Biên bản lấy mẫu nhựa đường, bê tông nhựa ·
BM-03/QT-7.3 Biên bản lấy mẫu vật liệu · BM-04/QT-7.3 Biên bản khoan lấy mẫu bê tông từ kết cấu ·
BM-01/QT-7.4 Sổ theo dõi nhận, lưu và hủy mẫu · BM-02/QT-7.4 Nhãn mẫu · BM-02/QT-7.8 Phiếu sửa đổi, thu hồi phiếu kết quả ·
BM-01/QT-7.11 Danh mục file Excel tính kết quả · BM-02/QT-7.11 Biên bản xác nhận file Excel.
Phiếu kết quả (`BM-03.NN/QT-7.8`) và phiếu ghi chép số liệu (`BM-04.NN/QT-7.8`) **in từ Excel**, không in từ ứng dụng.

### 8.1. Luồng

```
Phiếu yêu cầu ──► Nguồn mẫu? ──(PTN lấy mẫu)──► Biên bản lấy mẫu (BM-01…04/QT-7.3) ──┐
                       └──────(Khách hàng giao)──────────────────────────────────────┴─► Nhận mẫu, cấp mã mẫu
Nhận mẫu ──► Phân công (TNV được trao quyền) ──► Thử, ghi thiết bị (còn dùng được) ──► Tải PDF + Excel
        ──► Duyệt (người khác người thử, có quyền ký) ──► Phát hành PKQ (khóa) ──► Giao ──► Lưu mẫu ──► Hủy mẫu
```

### 8.2. Dữ liệu (migration `0004_tiep_nhan.sql`)

- `excel_files` (BM-01/QT-7.11): `nn int unique` (số thứ tự 01…71), `file_name`, `content text`,
  `report_form_code` (vd `BM-03.51/QT-7.8`), `datasheet_form_code` (vd `BM-04.51/QT-7.8`, có thể trống), `revision text`,
  `validated_on date`, `validated_by uuid`, `status check in ('dang_dung','tam_ngung','ngung')`.
  Nạp ban đầu từ danh mục BM-01/QT-7.11 (người dùng cung cấp file; thêm vào `data/excel-files.json`).
  Liên kết `tests.excel_file_id` (thay cho cột chữ `excel_file` hiện có – migration chuyển dữ liệu).
- `requests` (BM-01/QT-7.1): `id uuid`, `number text unique` (theo `numbering_rules.phieu_yeu_cau`), `created_on date`,
  `customer_name`, `customer_address`, `project_name`, `package_name`, `work_item`, `site_address`, `customer_rep`,
  `supervisor_org`, `supervisor_rep`, `sample_source check in ('khach_giao','ptn_lay')`,
  thỏa thuận mục III: `method_note`, `decision_rule_note`, `subcontract check in ('khong','dong_y')`, `subcontract_note`,
  `return_remaining_sample bool`, `due_date date`; mục IV: `evaluation_basis text`;
  `status check in ('nhap','da_chap_nhan','dang_thu','hoan_thanh','huy')`, `received_by uuid`, `created_by`.
- `sampling_records` (BM-01…04/QT-7.3): `id uuid`, `number text unique`, `request_id uuid not null`,
  `kind check in ('be_tong_vua','nhua_btn','vat_lieu','khoan_loi')` – mỗi `kind` ứng với một mã biểu mẫu,
  `sampled_at timestamptz`, `location`, `origin`, `standard`, `equipment_note`, `weather`, `witness`,
  `details jsonb not null` (phần B riêng của từng loại – khóa hợp lệ khai báo trong `src/lib/sampling-kinds.ts` và kiểm
  tra bằng trigger), `deviation text`, `sampler_id uuid`.
  - Khóa `details` theo đúng biểu mẫu đã ban hành:
    - `be_tong_vua`: `loai_hon_hop`, `cap_mac`, `phu_gia`, `nguon` (`tron_tai_cong_trinh` | `thuong_pham`), `tram_tron`, `so_phieu_giao`, `do_sut_yeu_cau`, `do_sut_do`, `nhiet_do_hon_hop`, `gio_tron`, `gio_duc`, `noi_bao_duong`, `ngay_chuyen_ve`.
    - `nhua_btn`: `loai_vat_lieu` (`nhua_duong` | `hon_hop_btn` | `loi_khoan`), `cap_nhua_loai_btn`, `nha_cung_cap`, `so_lo`, `noi_lay`, `nhiet_do_lay_mau`, `dung_cu_chua`.
    - `vat_lieu`: `nguon_goc`, `nhan_hieu_so_lo`, `lo_dai_dien`, `ngay_san_xuat`, `cach_lay_chia`, `bao_goi`, `niem_phong`.
    - `khoan_loi`: `cap_mac`, `ngay_do`, `tuoi_khi_khoan`, `do_cot_thep`, `thiet_bi_do`, `ly_do_vi_tri`, `may_khoan`, `duong_kinh_mui`, `lam_mat`, `xu_ly_lo_khoan`, `nguoi_xu_ly`.
- `samples`: `id uuid`, `code text unique` (mã mẫu, theo `numbering_rules.ma_mau`), `request_id`, `sampling_record_id null`,
  `name`, `spec` (quy cách, chủng loại), `quantity text`, `sampled_or_cast_on date` (ngày lấy/đúc), `condition_on_receipt`,
  `nonconforming bool`, `received_at timestamptz`, `received_by`, `retention_until date`, `disposed_on date`, `disposed_by`,
  `disposal_note`. Hàng con trong biên bản lấy mẫu (tổ mẫu, lõi…) lưu `sample_items(sample_id, label, data jsonb)` nếu cần.
- `customer_contacts` – **không tạo** (không làm danh bạ). Gợi ý khách hàng = `select distinct customer_name, customer_address from requests`.
- `sample_tests`: `sample_id`, `test_id`, `method_note`, `assigned_to uuid`, `assigned_by`, `status check in ('cho_phan_cong','dang_thu','cho_duyet','da_phat_hanh')`.
- `test_equipment_used`: `sample_test_id`, `equipment_id`, `used_on date` – trigger chặn nếu `equipment_usable()` = false.
- `reports` (phiếu kết quả): `id uuid`, `number text unique` (PKQ), `request_id`, `excel_file_id`, `excel_revision text`,
  `pdf_path`, `excel_path`, `pdf_sha256`, `excel_sha256`, `tested_by uuid`, `reviewed_by uuid`, `reviewed_at`,
  `issued_at`, `delivered_at`, `delivered_to text`, `status check in ('nhap','cho_duyet','da_phat_hanh','da_thu_hoi','bi_thay_the')`,
  `replaces_report_id uuid null`. Liên kết `report_tests(report_id, sample_test_id)`.
- `report_amendments` (BM-02/QT-7.8): `report_id`, `kind check in ('sua_doi','thu_hoi')`, `reason`, `new_report_id null`,
  `requested_by`, `approved_by`, `approved_at`, `customer_notified_on date`.
- `customer_communications` (BM-02/QT-7.1): `request_id`, `contact`, `content`, `customer_response`, `decision`, `by`, `on`.
- `numbering_counters(key text, period text, last int, primary key(key, period))` + hàm `next_number(key text, on_date date)`
  dùng `numbering_rules.pattern`, khóa dòng (`for update`) để không trùng, không nhảy số khi lưu lỗi trong cùng giao dịch.
- Storage bucket `ket-qua` (riêng tư): `reports/<yyyy>/<số PKQ>.pdf`, `reports/<yyyy>/<số PKQ>.xlsm`.

### 8.3. Quy tắc (chặn trong cơ sở dữ liệu)

| # | Quy tắc | Căn cứ |
| --- | --- | --- |
| 1 | Phiếu yêu cầu chưa `da_chap_nhan` thì chưa nhận mẫu vào thử | QT-7.1 |
| 2 | Chỉ chọn chỉ tiêu `tests.active`; ngoài danh mục phải có `subcontract = 'dong_y'` và ghi chú | QT-7.1 mục III.3 |
| 3 | `sample_source = 'ptn_lay'` → mẫu phải gắn `sampling_record_id` đúng loại vật liệu | QT-7.3 mục 6.3 |
| 4 | Mẫu `nonconforming = true` → bắt buộc `condition_on_receipt` và một `customer_communications` | QT-7.4, BM-02/QT-7.1 |
| 5 | `assigned_to` phải `can_perform(staff, test)` | QT-6.2, ISO 17025 điều 6.2.6 |
| 6 | Thiết bị ghi vào `test_equipment_used` phải `equipment_usable()` vào ngày dùng | QT-6.4, điều 6.4.9 |
| 7 | `reports.excel_file_id` phải `status = 'dang_dung'` và `excel_revision` = `excel_files.revision` | QT-7.11 |
| 8 | Số PKQ cấp bằng `next_number('phieu_ket_qua')` lúc **phát hành**, dạng `PKQ-yymmdd-xxx`, duy nhất, không dùng lại số đã phát hành hoặc đã hủy | QT-7.8 mục 6.3 |
| 9 | `reviewed_by <> tested_by` và `can_review(reviewed_by, test)` hoặc `can_sign_as_head(reviewed_by, ngày duyệt)` | QT-7.8, Phụ lục III VBHN 54 |
| 10 | Phiếu `da_phat_hanh` bị khóa (trigger chặn mọi update trừ `delivered_at`, `delivered_to`, chuyển sang `da_thu_hoi`/`bi_thay_the` qua `report_amendments`) | BM-02/QT-7.8 |
| 11 | `retention_until = issued_at + n ngày`; n = `tests.retention_days` nếu có, nếu không: `settings.luu_mau_xi_mang_nhua_ngay` cho nhóm xi măng, nhựa đường, còn lại `settings.luu_mau_ngay` | QT-7.4, BM-01/QT-7.1 mục III.4 |
| 12 | File tải lên lưu kèm SHA-256; trang chi tiết hiện cảnh báo nếu file trong Storage không khớp | ISO 17025 điều 7.5, 7.11 |

### 8.4. Quyền

`nhan_mau`: phiếu yêu cầu, biên bản lấy mẫu, mẫu, giao phiếu, lưu/hủy. `truong_ptn`: chấp nhận phiếu yêu cầu, phân công, duyệt,
phát hành, phê duyệt sửa đổi/thu hồi. `uy_quyen_ky`: duyệt, phát hành khi `can_sign_as_head`. `tnv`: chỉ thấy và cập nhật
`sample_tests` được giao cho mình (policy `assigned_to = current_staff_id()`), tải file, ghi thiết bị.
`phu_trach_cl`: `excel_files`. Mọi vai trò khác chỉ đọc.

### 8.5. Màn hình

- `/tiep-nhan` – danh sách phiếu yêu cầu (lọc trạng thái, khách hàng, công trình, khoảng ngày); `/tiep-nhan/moi`;
  `/tiep-nhan/[id]` gồm thẻ: Thông tin · Biên bản lấy mẫu · Mẫu · Trao đổi với khách hàng · Phiếu kết quả.
- Ô khách hàng, công trình: gợi ý từ dữ liệu đã nhập (datalist), không có danh bạ riêng.
- `/viec-cua-toi` – thí nghiệm viên: việc được giao, ghi thiết bị, tải PDF/Excel, gửi duyệt.
- `/cho-duyet` – Trưởng PTN / người được ủy quyền: hàng chờ duyệt, phát hành.
- `/mau-luu` – sổ nhận, lưu, hủy mẫu (BM-01/QT-7.4), danh sách đến hạn hủy, lập biên bản hủy.
- `/tra-cuu` – theo số phiếu, mã mẫu, khách hàng, công trình.
- In (HTML, khổ A4): BM-01/QT-7.1, BM-01…04/QT-7.3, BM-02/QT-7.4 (nhãn), BM-01/QT-7.4, BM-02/QT-7.8.

### 8.6. Hoàn thành khi

Mọi quy tắc 1–12 có ít nhất một ca đúng và một ca bị chặn trong `supabase/tests/0004_tiep_nhan.sql`; luồng đầy đủ một phiếu
(khách giao và PTN lấy mẫu) chạy được trên giao diện.

## 9. Bước 5 – Cải tiến chất lượng (QT-7.9, 7.10, 8.5, 8.8, 8.9, 4.1, 5.3)

**Biểu mẫu:** BM-01/QT-7.9 Phiếu tiếp nhận và giải quyết khiếu nại · BM-02/QT-7.9 Phiếu khảo sát ý kiến khách hàng ·
BM-01/QT-7.10 Phiếu công việc không phù hợp và hành động khắc phục · BM-02/QT-7.10 Sổ theo dõi ·
BM-01/QT-8.5 Sổ rủi ro và cơ hội · BM-02/QT-4.1 Sổ rủi ro khách quan · BM-01…03/QT-8.8 (chương trình, danh mục kiểm tra,
báo cáo đánh giá nội bộ) · BM-01/QT-8.9 Biên bản xem xét của lãnh đạo · BM-02/QT-5.3 Báo cáo hoạt động PTN hằng năm.

### 9.1. Dữ liệu (migration `0005_cai_tien.sql`)

Dùng chung một cơ chế "vấn đề có người chịu trách nhiệm, hạn, đánh giá hiệu lực":

- `complaints`: `number`, `received_on`, `complainant`, `contact`, `content`, `report_id null`,
  `acknowledged_on` (hạn: 02 ngày làm việc), `related_to_lab bool`, `handler_id` (phải **không** liên quan công việc bị
  khiếu nại – kiểm tra `handler_id` khác `tested_by`, `reviewed_by` của phiếu), `answer`, `answered_on` (hạn: 15 ngày làm việc),
  `closed_on`, `nonconformity_id null`. Số ngày hạn đưa vào `settings`.
- `nonconformities` (BM-01/QT-7.10): `number` (theo năm), `detected_on`, `source check in ('thi_nghiem','soat_xet','thiet_bi','kiem_soat_chat_luong','khieu_nai','danh_gia_noi_bo','kiem_tra_ben_ngoai','khac')`,
  `description`, `affects_issued_reports bool`, `decision_on_reports` (bắt buộc khi `affects_issued_reports`: thu hồi/sửa đổi/giữ nguyên + lý do),
  `root_cause`, `corrective_action`, `owner_id`, `due_on`, `done_on`, `effectiveness_check`, `effective bool`, `closed_on`.
  Không đóng được khi chưa có `effectiveness_check`.
- `risks` (BM-01/QT-8.5, BM-02/QT-4.1): `register check in ('rui_ro_co_hoi','khach_quan')`, `area`, `description`,
  `likelihood 1..3` (K), `impact 1..3` (M), `level` = K × M tự tính và phân loại Thấp (1–2) / Trung bình (3–4) / Cao (6–9) theo QT-4.1 mục 6.3, `action`, `owner`, `review_due`, `status`.
- `audit_programs` (BM-01/QT-8.8): `year`, `planned_month`, `scope`, `auditor_id`, `auditee`; `audit_checklist_items`
  (BM-02, theo điều khoản ISO): `program_id`, `clause`, `question`, `evidence`, `result check in ('phu_hop','khong_phu_hop','luu_y')`.
  Mỗi `khong_phu_hop` tự tạo một `nonconformities` (`source = 'danh_gia_noi_bo'`). Người đánh giá không đánh giá công việc của chính mình.
- `management_reviews` (BM-01/QT-8.9): `held_on`, `participants`, `inputs jsonb` (ảnh chụp số liệu tại thời điểm họp do hàm
  `management_review_inputs(from, to)` tổng hợp), `decisions text`, `actions` (liên kết `nonconformities` hoặc việc riêng).

### 9.2. Tự tổng hợp

`management_review_inputs(from_date, to_date)` trả JSON: số phiếu yêu cầu, số mẫu, số phiếu kết quả theo tháng; khiếu nại;
không phù hợp còn mở/đã đóng; thiết bị quá hạn; kết quả đánh giá nội bộ; rủi ro mức cao; đào tạo đã làm.
Cùng số liệu dùng cho BM-02/QT-5.3 (báo cáo năm gửi Sở Xây dựng **trước 15/12**) – trang chủ nhắc từ 01/12.

### 9.3. Màn hình

`/khieu-nai`, `/khong-phu-hop`, `/rui-ro`, `/danh-gia-noi-bo/[nam]`, `/xem-xet-lanh-dao`, `/bao-cao-nam/[nam]`.
Trang chủ: việc quá hạn của tôi (đỏ), việc sắp đến hạn (vàng).

## 10. Bước 6 – Sao lưu, dung lượng, xác nhận phần mềm

### 10.1. Sao lưu hằng đêm sang OneDrive công ty

- File `.github/workflows/sao-luu.yml`, chạy `cron: '0 18 * * *'` (01:00 giờ Việt Nam) và chạy tay được (`workflow_dispatch`).
- Bước: cài `postgresql-client` đúng phiên bản Supabase và `rclone` → `pg_dump --format=custom` qua chuỗi kết nối Supabase
  (secret `SUPABASE_DB_URL`) → nén → đặt tên `csdl-YYYY-MM-DD.dump` → `rclone copy` lên
  `onedrive:PTN-ISO17025/sao-luu/csdl/`, xóa bản cũ hơn 14 ngày.
- File Storage: `rclone copy` **chỉ file mới** từ Supabase Storage (S3-compatible, secrets `SUPABASE_S3_*`) sang
  `onedrive:PTN-ISO17025/sao-luu/files/` (không xóa ở đích).
- Cấu hình rclone OneDrive (loại *OneDrive Personal*) lưu ở secret `RCLONE_CONFIG`; hướng dẫn người dùng tạo token bằng
  `rclone config` trên máy của họ (ghi trong README).
- Kết quả mỗi lần chạy ghi vào bảng `backup_runs(run_at, ok, size_bytes, message)` qua RPC có khóa riêng
  (secret `BACKUP_REPORT_KEY`, hàm `security definer` kiểm tra khóa). Trang chủ của `admin` hiện **cảnh báo đỏ** khi lần chạy gần
  nhất lỗi hoặc đã quá 36 giờ.
- Hằng tháng: hướng dẫn khôi phục thử vào một dự án Supabase thử và ghi kết quả (QT-7.11 mục 6.4).

### 10.2. Dung lượng

Trang Cấu hình hiện dung lượng Storage và cơ sở dữ liệu đã dùng so với giới hạn gói Free; cảnh báo ở
`settings.canh_bao_dung_luong_phan_tram` (mặc định 80%).

### 10.3. Xác nhận phần mềm (ISO 17025 điều 7.11.2)

- `docs/xac-nhan-phan-mem.md`: bảng kịch bản kiểm thử, mỗi quy tắc ở các mục 6.2, 7.2, 8.3, 9.1 một dòng
  (mã, mô tả, dữ liệu vào, kết quả mong đợi, kết quả thực tế, đạt/không đạt, người thử, ngày).
- Người dùng chạy thử trên giao diện, ký biên bản xác nhận; chạy song song với sổ giấy 1 tháng trước khi bỏ sổ giấy.
- Mỗi lần nâng cấp đáng kể: chạy lại các kịch bản liên quan, cập nhật bảng.

## 11. Kiểm thử

- **Cơ sở dữ liệu:** mỗi bước có `supabase/tests/NNNN_ten.sql`, chạy trên PostgreSQL 16 cục bộ với lớp giả lập Supabase:
  ```sql
  create role anon nologin; create role authenticated nologin;
  create schema auth;
  create table auth.users (id uuid primary key default gen_random_uuid(), email text);
  create function auth.uid() returns uuid language sql stable as
    $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  grant usage on schema auth, public to anon, authenticated;
  alter default privileges in schema public grant all on tables to anon, authenticated;
  alter default privileges in schema public grant all on sequences to anon, authenticated;
  ```
  Chạy lần lượt mọi migration, `seed.sql`, rồi file kiểm thử. Giả lập người dùng bằng
  `set role authenticated; set request.jwt.claim.sub = '<uuid>';`. Mỗi quy tắc: một ca được phép và một ca bị chặn.
  (Đặt lớp giả lập vào `supabase/tests/_shim.sql` và lệnh chạy vào `scripts/test-db.sh`.)
- **Ứng dụng:** `npm run lint`, `npm run build` phải qua. Thử tay trên `npm run dev` với Supabase thật: đăng nhập bằng ít nhất
  hai vai trò khác nhau.

## 12. Bản in và biểu mẫu

- Trang in: `src/app/in/<ma-bieu-mau>/[id]/page.tsx`, CSS `@page { size: A4; margin: 15mm 15mm 18mm 20mm; }`, ẩn thanh điều
  hướng khi in, người dùng bấm "In" của trình duyệt (lưu PDF được).
- **Đầu trang:** logo + tên công ty + tên PTN + `LAS-XD … • TCVN ISO/IEC 17025:2017` + địa chỉ + điện thoại/email/website – tất cả
  từ `company`, `lab`. **Chân trang:** trái `<mã biểu mẫu> | Lần ban hành: <revision>` (từ `form_codes`), phải `Trang x / y`.
- Bố cục theo đúng biểu mẫu Word đã ban hành trong thư mục hệ thống tài liệu (người dùng cung cấp file khi cần đối chiếu):
  tiêu đề in hoa màu xanh đậm `#1f3864`, các phần A/B/C/D, bảng viền mảnh, khung ký 3 cột có viền.
- Component dùng chung: `PrintHeader`, `PrintFooter`, `SignBlock` (3 cột), `KvTable` (bảng nhãn–giá trị 4 cột).

## 13. Thứ tự thực hiện và định nghĩa hoàn thành

| Bước | Nội dung | Mục |
| --- | --- | --- |
| 1 | Khung ứng dụng | ✅ đã xong (mục 4) |
| 2 | Thiết bị và hiệu chuẩn | 6 |
| 3 | Nhân sự và trao quyền | 7 |
| 4 | Tiếp nhận và kết quả | 8 |
| 5 | Cải tiến chất lượng | 9 |
| 6 | Sao lưu, dung lượng, xác nhận phần mềm | 10 |

Thứ tự này có lý do: quy tắc của bước 4 cần dữ liệu và hàm của bước 2 (`equipment_usable`) và bước 3 (`can_perform`,
`can_review`, `can_sign_as_head`).

**Mỗi bước chỉ được coi là xong khi:**

1. Có migration mới, RLS và trigger nhật ký cho mọi bảng mới.
2. Mọi quy tắc của bước được chặn trong cơ sở dữ liệu và có ca kiểm thử trong `supabase/tests/`.
3. Màn hình và bản in của bước chạy được; lỗi hiện bằng tiếng Việt.
4. `npm run lint`, `npm run build` qua.
5. README cập nhật (lộ trình, hướng dẫn mới nếu có); `data/` và `seed.sql` cập nhật nếu có dữ liệu nạp mới.
6. Một commit cho mỗi phần có ý nghĩa, thông điệp tiếng Việt mô tả việc đã làm.

## 14. Câu hỏi phải hỏi người dùng trước khi làm (không tự quyết)

| Khi làm | Câu hỏi |
| --- | --- |
| Bước 4 | Số phiếu yêu cầu đang đánh theo dạng nào? (phiếu Word đang dùng ô trộn `{{Ma_PYC}}`). Mẫu số khai báo vào `numbering_rules.phieu_yeu_cau` |
| Bước 4 | Mã mẫu đang đánh theo dạng nào? (QT-7.4 định nghĩa mã mẫu duy nhất, cấp khi lập phiếu yêu cầu, chưa quy định dạng). Khai báo vào `numbering_rules.ma_mau` |
| Bước 5 | Số phiếu khiếu nại đánh theo dạng nào? (QT-7.10 đánh số không phù hợp theo năm; khiếu nại chưa quy định)
| Bước 4 | Số biên bản lấy mẫu (`Số: …/20…`) đánh chung một dãy cho cả 4 loại hay mỗi loại một dãy? |
| Bước 4 | Danh mục 71 file Excel (BM-01/QT-7.11): xin file danh mục để nạp `data/excel-files.json` |
| Bước 2 | Hãng, model, số seri, nơi đặt của từng thiết bị: có danh sách sẵn không, hay nhập dần? |
| Mọi bước | Mọi điều tài liệu này không nói rõ |
