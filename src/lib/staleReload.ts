/**
 * Sau khi đưa bản mới lên GitHub Pages, các file của bản cũ bị xoá. Học sinh đang mở trang (bản cũ) khi chuyển trang
 * sẽ không tải được file → tự tải lại trang MỘT lần để nhận bản mới (chặn lặp: tối đa 1 lần mỗi phút).
 * Tiến độ, bài làm dở đã được lưu trên máy nên không mất.
 */
export function reloadOnce(): boolean {
  try {
    const last = Number(sessionStorage.getItem('pangda.staleReload') || 0);
    if (Date.now() - last < 60_000) return false;
    sessionStorage.setItem('pangda.staleReload', String(Date.now()));
  } catch { /* */ }
  hardReload();
  return true;
}

/** Tải lại kèm tham số để bỏ qua trang cũ trong bộ nhớ đệm trình duyệt (GitHub Pages cho giữ tới 10 phút) */
export function hardReload() {
  const u = new URL(window.location.href);
  u.searchParams.set('v', String(Date.now()));
  window.location.replace(u.toString());
}

/** Bỏ tham số ?v=… khỏi thanh địa chỉ sau khi đã tải xong */
export function cleanReloadParam() {
  const u = new URL(window.location.href);
  if (u.searchParams.has('v')) { u.searchParams.delete('v'); window.history.replaceState(window.history.state, '', u.toString()); }
}
