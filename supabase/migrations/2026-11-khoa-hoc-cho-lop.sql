-- Cấp quyền học theo khoá cho từng lớp.
-- Chạy MỘT LẦN trong Supabase → SQL Editor → New query → dán toàn bộ → Run.
-- courses = danh sách mã khoá lớp được học, ví dụ {giaotiep} hoặc {hsk1,hsk2}.
-- Để trống (null) = được học tất cả các khoá → các lớp đang có không bị ảnh hưởng.
alter table public.classes add column if not exists courses text[];

-- Học sinh đọc được thông tin lớp của mình (đã có sẵn chính sách classes_select: thành viên lớp được xem lớp).
-- Chỉ giáo viên chủ lớp được sửa (đã có sẵn chính sách classes_update).
