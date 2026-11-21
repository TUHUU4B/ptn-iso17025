// Mô tả các danh mục cấu hình. Mọi trang danh sách, biểu mẫu sửa và hàm lưu đều đọc từ đây
// (một nguồn duy nhất), nên thêm một danh mục mới chỉ cần khai báo thêm một mục.

export type Field = {
  name: string;
  label: string;
  type: 'text' | 'textarea' | 'int' | 'date' | 'bool' | 'select' | 'ref' | 'list';
  required?: boolean;
  options?: { value: string; label: string }[]; // cho 'select'
  ref?: { table: string; value: string; label: string; order: string }; // cho 'ref'
  readonly?: boolean; // cột tự tính, chỉ hiển thị
  keyOnCreate?: boolean; // khóa chính dạng chữ: chỉ nhập khi tạo mới
  hint?: string;
};

export type Entity = {
  slug: string;
  title: string;
  description: string;
  table: string;
  key: string;
  keyType: 'uuid' | 'int' | 'text';
  order: { column: string; ascending?: boolean }[];
  fields: Field[];
  listColumns: string[];
  singleton?: boolean; // bảng chỉ có 1 dòng (id = 1)
  withRoles?: boolean; // nhân sự: kèm chọn vai trò
};

export const ASSURANCE = [
  { value: 'HC', label: 'Hiệu chuẩn bên ngoài' },
  { value: 'KT', label: 'Kiểm tra nội bộ (HD-xx/QT-6.4)' },
  { value: 'KHONG', label: 'Không yêu cầu' },
];

export const EQUIPMENT_STATUS = [
  { value: 'dang_su_dung', label: 'Đang sử dụng' },
  { value: 'hong_cho_sua', label: 'Hỏng, chờ sửa' },
  { value: 'ngung_su_dung', label: 'Ngừng sử dụng' },
  { value: 'thanh_ly', label: 'Thanh lý' },
];

const active: Field = { name: 'active', label: 'Đang dùng', type: 'bool' };

export const ENTITIES: Entity[] = [
  {
    slug: 'cong-ty',
    title: 'Công ty',
    description: 'Thông tin in ở đầu trang mọi biểu mẫu.',
    table: 'company',
    key: 'id',
    keyType: 'int',
    singleton: true,
    order: [{ column: 'id' }],
    listColumns: [],
    fields: [
      { name: 'name', label: 'Tên công ty', type: 'text', required: true },
      { name: 'tax_code', label: 'Mã số thuế', type: 'text' },
      { name: 'address', label: 'Địa chỉ trụ sở', type: 'text' },
      { name: 'phone', label: 'Điện thoại', type: 'text' },
      { name: 'email', label: 'Email', type: 'text' },
      { name: 'website', label: 'Website', type: 'text' },
      { name: 'logo_url', label: 'Đường dẫn logo', type: 'text', hint: 'Để trống nếu chưa có' },
    ],
  },
  {
    slug: 'phong-thi-nghiem',
    title: 'Phòng thí nghiệm',
    description: 'Tên, mã LAS-XD, địa chỉ phòng thí nghiệm và giấy chứng nhận.',
    table: 'lab',
    key: 'id',
    keyType: 'int',
    singleton: true,
    order: [{ column: 'id' }],
    listColumns: [],
    fields: [
      { name: 'name', label: 'Tên phòng thí nghiệm', type: 'text', required: true },
      { name: 'las_code', label: 'Mã LAS-XD', type: 'text' },
      { name: 'vilas_code', label: 'Số hiệu VILAS', type: 'text' },
      { name: 'standard', label: 'Tiêu chuẩn áp dụng', type: 'text', required: true },
      { name: 'address', label: 'Địa chỉ phòng thí nghiệm', type: 'text' },
      { name: 'phone', label: 'Điện thoại', type: 'text' },
      { name: 'email', label: 'Email', type: 'text' },
      { name: 'certificate_no', label: 'Số giấy chứng nhận đủ điều kiện', type: 'text' },
      { name: 'certificate_date', label: 'Ngày cấp giấy chứng nhận', type: 'date' },
    ],
  },
  {
    slug: 'nhan-su',
    title: 'Nhân sự',
    description: 'Nhân sự, chức danh, vai trò và email đăng nhập. Người nghỉ việc: bỏ chọn "Đang làm việc", không xóa.',
    table: 'staff',
    key: 'id',
    keyType: 'uuid',
    withRoles: true,
    order: [{ column: 'active', ascending: false }, { column: 'full_name' }],
    listColumns: ['full_name', 'title', 'email', 'active'],
    fields: [
      { name: 'full_name', label: 'Họ và tên', type: 'text', required: true },
      { name: 'title', label: 'Chức danh', type: 'text' },
      {
        name: 'email',
        label: 'Email đăng nhập',
        type: 'text',
        hint: 'Tạo tài khoản cùng email này trong Supabase, ứng dụng sẽ tự liên kết',
      },
      { name: 'active', label: 'Đang làm việc', type: 'bool' },
    ],
  },
  {
    slug: 'thiet-bi',
    title: 'Thiết bị',
    description: 'Danh mục thiết bị (BM-02/QT-6.4). Hạn kế tiếp tự tính từ ngày hiệu chuẩn hoặc kiểm tra gần nhất và chu kỳ.',
    table: 'equipment',
    key: 'id',
    keyType: 'int',
    order: [{ column: 'code' }],
    listColumns: ['code', 'name', 'assurance', 'last_check_date', 'next_due_date', 'status'],
    fields: [
      { name: 'code', label: 'Mã thiết bị', type: 'text', required: true },
      { name: 'name', label: 'Tên thiết bị', type: 'text', required: true },
      {
        name: 'group_id',
        label: 'Nhóm',
        type: 'ref',
        required: true,
        ref: { table: 'equipment_groups', value: 'id', label: 'name', order: 'sort' },
      },
      { name: 'requirement', label: 'Yêu cầu kỹ thuật', type: 'textarea' },
      { name: 'test_refs', label: 'Chỉ tiêu sử dụng (STT)', type: 'text' },
      { name: 'assurance', label: 'Đảm bảo đo lường', type: 'select', required: true, options: ASSURANCE },
      { name: 'part', label: 'Bộ phận được hiệu chuẩn, kiểm tra', type: 'text' },
      { name: 'guide_refs', label: 'Hướng dẫn áp dụng', type: 'list', hint: 'Cách nhau bằng dấu phẩy, ví dụ: HD-01, HD-04' },
      { name: 'cycle_months', label: 'Chu kỳ (tháng)', type: 'int' },
      { name: 'last_check_date', label: 'Ngày hiệu chuẩn / kiểm tra gần nhất', type: 'date' },
      { name: 'next_due_date', label: 'Hạn kế tiếp', type: 'date', readonly: true },
      { name: 'certificate', label: 'Số giấy chứng nhận gần nhất', type: 'text' },
      { name: 'status', label: 'Trạng thái', type: 'select', required: true, options: EQUIPMENT_STATUS },
      { name: 'note', label: 'Ghi chú', type: 'textarea' },
      active,
    ],
  },
  {
    slug: 'nhom-thiet-bi',
    title: 'Nhóm thiết bị',
    description: 'Các nhóm A, B, C… dùng để sắp xếp danh mục thiết bị.',
    table: 'equipment_groups',
    key: 'id',
    keyType: 'int',
    order: [{ column: 'sort' }],
    listColumns: ['sort', 'name'],
    fields: [
      { name: 'name', label: 'Tên nhóm', type: 'text', required: true },
      { name: 'sort', label: 'Thứ tự', type: 'int', required: true },
    ],
  },
  {
    slug: 'chi-tieu',
    title: 'Chỉ tiêu thí nghiệm',
    description: 'Danh mục năng lực đã công bố. Chỉ tiêu bỏ khỏi năng lực: bỏ chọn "Đang dùng", không xóa.',
    table: 'tests',
    key: 'id',
    keyType: 'int',
    order: [{ column: 'stt' }],
    listColumns: ['stt', 'name', 'standards', 'active'],
    fields: [
      { name: 'stt', label: 'STT trong danh mục', type: 'int', required: true },
      {
        name: 'group_id',
        label: 'Nhóm vật liệu',
        type: 'ref',
        required: true,
        ref: { table: 'material_groups', value: 'id', label: 'name', order: 'sort' },
      },
      { name: 'name', label: 'Tên chỉ tiêu', type: 'textarea', required: true },
      { name: 'standards', label: 'Tiêu chuẩn', type: 'list', hint: 'Cách nhau bằng dấu phẩy' },
      { name: 'excel_file', label: 'File Excel tính kết quả', type: 'text' },
      { name: 'retention_days', label: 'Hạn lưu mẫu (ngày)', type: 'int', hint: 'Để trống: theo thông số chung' },
      active,
    ],
  },
  {
    slug: 'nhom-vat-lieu',
    title: 'Nhóm vật liệu',
    description: 'Các nhóm trong danh mục năng lực (xi măng, cốt liệu, bê tông…).',
    table: 'material_groups',
    key: 'id',
    keyType: 'int',
    order: [{ column: 'sort' }],
    listColumns: ['sort', 'name'],
    fields: [
      { name: 'name', label: 'Tên nhóm', type: 'text', required: true },
      { name: 'sort', label: 'Thứ tự', type: 'int', required: true },
    ],
  },
  {
    slug: 'thu-tuc',
    title: 'Thủ tục',
    description: 'Danh sách thủ tục của hệ thống quản lý.',
    table: 'procedures',
    key: 'code',
    keyType: 'text',
    order: [{ column: 'code' }],
    listColumns: ['code', 'name', 'clauses', 'active'],
    fields: [
      { name: 'code', label: 'Mã thủ tục', type: 'text', required: true, keyOnCreate: true },
      { name: 'name', label: 'Tên thủ tục', type: 'text', required: true },
      { name: 'clauses', label: 'Điều khoản ISO', type: 'text' },
      active,
    ],
  },
  {
    slug: 'bieu-mau',
    title: 'Mã biểu mẫu',
    description: 'Mã, tên và lần ban hành của biểu mẫu (BM-02/QT-8.3). Bản in lấy mã và lần ban hành từ đây.',
    table: 'form_codes',
    key: 'code',
    keyType: 'text',
    order: [{ column: 'code' }],
    listColumns: ['code', 'name', 'revision', 'active'],
    fields: [
      { name: 'code', label: 'Mã biểu mẫu', type: 'text', required: true, keyOnCreate: true },
      { name: 'name', label: 'Tên biểu mẫu', type: 'text', required: true },
      {
        name: 'procedure_code',
        label: 'Thuộc thủ tục',
        type: 'ref',
        ref: { table: 'procedures', value: 'code', label: 'code', order: 'code' },
      },
      { name: 'revision', label: 'Lần ban hành', type: 'text', required: true },
      active,
    ],
  },
  {
    slug: 'danh-so',
    title: 'Quy tắc đánh số',
    description: 'Mẫu số hiệu: {yymmdd} ngày, {yyyy} năm, {seq:3} số thứ tự 3 chữ số.',
    table: 'numbering_rules',
    key: 'key',
    keyType: 'text',
    order: [{ column: 'key' }],
    listColumns: ['key', 'description', 'pattern'],
    fields: [
      { name: 'key', label: 'Mã quy tắc', type: 'text', required: true, keyOnCreate: true },
      { name: 'description', label: 'Áp dụng cho', type: 'text', required: true },
      { name: 'pattern', label: 'Mẫu số hiệu', type: 'text', required: true },
    ],
  },
  {
    slug: 'thong-so',
    title: 'Thông số quản lý',
    description: 'Số ngày nhắc trước hạn, hạn lưu mẫu, mức cảnh báo dung lượng…',
    table: 'settings',
    key: 'key',
    keyType: 'text',
    order: [{ column: 'key' }],
    listColumns: ['description', 'value'],
    fields: [
      { name: 'key', label: 'Mã thông số', type: 'text', required: true, keyOnCreate: true },
      { name: 'description', label: 'Ý nghĩa', type: 'text', required: true },
      { name: 'value', label: 'Giá trị', type: 'text', required: true },
    ],
  },
  {
    slug: 'vai-tro',
    title: 'Vai trò',
    description: 'Vai trò quyết định ai được vào màn hình nào. Mã vai trò dùng trong phân quyền, không đổi sau khi tạo.',
    table: 'roles',
    key: 'code',
    keyType: 'text',
    order: [{ column: 'sort' }],
    listColumns: ['name', 'description'],
    fields: [
      { name: 'code', label: 'Mã vai trò', type: 'text', required: true, keyOnCreate: true },
      { name: 'name', label: 'Tên vai trò', type: 'text', required: true },
      { name: 'description', label: 'Được làm', type: 'textarea' },
      { name: 'sort', label: 'Thứ tự', type: 'int', required: true },
    ],
  },
];

export const entityBySlug = (slug: string) => ENTITIES.find((e) => e.slug === slug);
export const fieldLabel = (e: Entity, name: string) => e.fields.find((f) => f.name === name)?.label ?? name;
export const optionLabel = (opts: { value: string; label: string }[] | undefined, v: unknown) =>
  opts?.find((o) => o.value === v)?.label ?? String(v ?? '');
