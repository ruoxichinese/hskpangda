import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * Kết nối Supabase (tuỳ chọn). Không khai báo biến môi trường → website chạy chế độ chỉ lưu trên máy.
 *   VITE_SUPABASE_URL=https://xxxx.supabase.co
 *   VITE_SUPABASE_ANON_KEY=eyJ...   (khoá "anon public" – an toàn để đưa lên web, dữ liệu được bảo vệ bằng RLS)
 */
const rawUrl = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim();
// Chỉ lấy phần gốc https://xxxx.supabase.co – phòng khi dán nhầm cả /rest/v1/ hoặc dấu / ở cuối
const url = (() => {
  if (!rawUrl) return undefined;
  try { return new URL(rawUrl).origin; } catch { return rawUrl.replace(/\/+$/, ''); }
})();
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const cloudConfigured = !!(url && key);

/** Hỏi Supabase những cách đăng nhập nào đang bật (để ẩn nút Google khi chưa cấu hình) */
export async function fetchAuthProviders(): Promise<{ google: boolean; email: boolean }> {
  if (!url || !key) return { google: false, email: false };
  try {
    const r = await fetch(`${url}/auth/v1/settings`, { headers: { apikey: key } });
    if (!r.ok) throw new Error(String(r.status));
    const s = await r.json();
    return { google: !!s?.external?.google, email: s?.external?.email !== false };
  } catch {
    // không hỏi được → vẫn hiện nút Google (chỉ ẩn khi Supabase trả lời rõ là chưa bật)
    return { google: true, email: true };
  }
}

export const supabase: SupabaseClient | null = cloudConfigured
  ? createClient(url!, key!, {
      auth: {
        flowType: 'pkce', // trả về ?code=… thay vì #token, không đụng HashRouter
        persistSession: true,
        detectSessionInUrl: true,
        storageKey: 'sb-pangda-auth', // không bắt đầu bằng "pangda." → không lẫn vào file sao lưu
      },
    })
  : null;

/** Địa chỉ quay về sau khi đăng nhập: trang hiện tại, bỏ hash & query */
export function redirectUrl() {
  return window.location.origin + window.location.pathname;
}

export function randomClassCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // bỏ 0/O, 1/I cho dễ đọc
  const arr = new Uint32Array(6);
  crypto.getRandomValues(arr);
  return Array.from(arr, (n) => chars[n % chars.length]).join('');
}

export function friendlyError(e: unknown): string {
  const msg = (e as { message?: string })?.message ?? String(e);
  if (msg.includes('exam_code_not_found')) return 'Mã thi không đúng. Kiểm tra lại mã giáo viên gửi.';
  if (msg.includes('not_in_class')) return 'Bạn chưa ở trong lớp có đợt thi này. Vào Tài khoản → nhập mã lớp trước.';
  if (msg.includes('exam_not_open')) return 'Đợt thi chưa tới giờ mở.';
  if (msg.includes('exam_closed')) return 'Đợt thi đã đóng.';
  if (msg.includes('no_attempts_left')) return 'Bạn đã dùng hết lượt thi với mã này. Liên hệ giáo viên nếu cần thi lại.';
  if (msg.includes('attempt_not_found')) return 'Không tìm thấy lượt thi. Hãy nhập lại mã thi.';
  if (msg.includes('class_not_found')) return 'Không tìm thấy lớp với mã này. Kiểm tra lại mã giáo viên đưa.';
  if (msg.includes('row-level security')) return 'Bạn không có quyền làm việc này.';
  if (msg.includes('Failed to fetch') || msg.includes('NetworkError')) return 'Không kết nối được máy chủ. Kiểm tra mạng rồi thử lại.';
  if (msg.includes('Token has expired') || msg.includes('invalid')) return 'Mã không đúng hoặc đã hết hạn. Hãy gửi lại mã mới.';
  if (msg.includes('rate limit')) return 'Bạn gửi quá nhiều lần. Đợi vài phút rồi thử lại.';
  return msg;
}
