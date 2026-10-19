import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * Kết nối Supabase (tuỳ chọn). Không khai báo biến môi trường → website chạy chế độ chỉ lưu trên máy.
 *   VITE_SUPABASE_URL=https://xxxx.supabase.co
 *   VITE_SUPABASE_ANON_KEY=eyJ...   (khoá "anon public" – an toàn để đưa lên web, dữ liệu được bảo vệ bằng RLS)
 */
const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const cloudConfigured = !!(url && key);

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
  if (msg.includes('class_not_found')) return 'Không tìm thấy lớp với mã này. Kiểm tra lại mã giáo viên đưa.';
  if (msg.includes('row-level security')) return 'Bạn không có quyền làm việc này.';
  if (msg.includes('Failed to fetch') || msg.includes('NetworkError')) return 'Không kết nối được máy chủ. Kiểm tra mạng rồi thử lại.';
  if (msg.includes('Token has expired') || msg.includes('invalid')) return 'Mã không đúng hoặc đã hết hạn. Hãy gửi lại mã mới.';
  if (msg.includes('rate limit')) return 'Bạn gửi quá nhiều lần. Đợi vài phút rồi thử lại.';
  return msg;
}
