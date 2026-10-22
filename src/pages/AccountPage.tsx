import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { PandaMascot } from '../components/panda/PandaMascot';
import { friendlyError, supabase } from '../lib/cloud';
import { cls } from '../lib/util';
import { useCloud } from '../store/CloudSync';

export function SyncBadge({ withText = true }: { withText?: boolean }) {
  const { status, lastSynced, error } = useCloud();
  const map = {
    off: ['💾', 'Chỉ lưu trên máy này'],
    'signed-out': ['☁️', 'Chưa đăng nhập'],
    syncing: ['⏳', 'Đang đồng bộ…'],
    synced: ['✅', lastSynced ? `Đã đồng bộ lúc ${lastSynced.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}` : 'Đã đồng bộ'],
    error: ['⚠️', error ?? 'Lỗi đồng bộ'],
  } as const;
  const [icon, text] = map[status];
  return <span title={text}><span aria-hidden>{icon}</span>{withText && <span className="ml-1">{text}</span>}<span className="sr-only">{text}</span></span>;
}

function SignInPanel() {
  const { signInGoogle, sendEmailCode, verifyEmailCode, googleEnabled } = useCloud();
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const run = async (fn: () => Promise<void>, ok?: string) => {
    setBusy(true); setMsg(null);
    try { await fn(); if (ok) setMsg(ok); } catch (e) { setMsg(friendlyError(e)); } finally { setBusy(false); }
  };
  return (
    <div className="card space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <PandaMascot mood="wave" size={80} />
        <p className="max-w-prose flex-1">Đăng nhập để tiến độ tự đồng bộ giữa điện thoại, máy tính bảng và máy tính, và để giáo viên theo dõi được kết quả của bạn. Tiến độ đang có trên máy này sẽ được giữ nguyên và gộp lên tài khoản.</p>
      </div>
      {googleEnabled && (
        <button className="btn-primary w-full sm:w-auto" disabled={busy} onClick={() => run(signInGoogle)}>
          <span aria-hidden>🇬</span> Đăng nhập bằng Google
        </button>
      )}
      <div className={googleEnabled ? 'border-t border-line pt-4' : ''}>
        <p className="mb-2 font-bold">{googleEnabled ? 'Hoặc đăng nhập bằng email' : 'Đăng nhập bằng email'}</p>
        {!sent ? (
          <form className="flex flex-wrap gap-2" onSubmit={(e) => { e.preventDefault(); run(async () => { await sendEmailCode(email); setSent(true); }); }}>
            <label className="sr-only" htmlFor="login-email">Email</label>
            <input id="login-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="ban@example.com" autoComplete="email"
              className="min-w-0 flex-1 rounded-xl border-2 border-line bg-bg px-3 py-2 focus:border-primary focus:outline-none" />
            <button className="btn-ghost" disabled={busy || !email}>Gửi mã đăng nhập</button>
          </form>
        ) : (
          <form className="space-y-2" onSubmit={(e) => { e.preventDefault(); run(() => verifyEmailCode(email, code)); }}>
            <p className="text-sm">Đã gửi email đến <b>{email}</b>. Nhập mã 6 số trong email, hoặc bấm vào đường link trong email (mở bằng chính trình duyệt này).</p>
            <div className="flex flex-wrap gap-2">
              <label className="sr-only" htmlFor="login-code">Mã đăng nhập</label>
              <input id="login-code" inputMode="numeric" autoComplete="one-time-code" maxLength={10} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                placeholder="123456" className="w-40 rounded-xl border-2 border-line bg-bg px-3 py-2 text-xl tracking-[0.3em] focus:border-primary focus:outline-none" />
              <button className="btn-primary" disabled={busy || code.length < 6}>Xác nhận</button>
              <button type="button" className="chip" onClick={() => { setSent(false); setCode(''); }}>Đổi email</button>
            </div>
          </form>
        )}
      </div>
      {msg && <p role="alert" className="font-semibold text-bad">{msg}</p>}
    </div>
  );
}

interface MyClass { class_id: string; classes: { name: string; code: string } | null }

function MyClasses() {
  const cloud = useCloud();
  const { session } = cloud;
  const [list, setList] = useState<MyClass[]>([]);
  const [code, setCode] = useState('');
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const load = useCallback(async () => {
    if (!supabase || !session) return;
    const { data } = await supabase.from('class_members').select('class_id, classes(name, code)').eq('student_id', session.user.id);
    setList((data as unknown as MyClass[]) ?? []);
  }, [session]);
  useEffect(() => { load(); }, [load]);
  const join = async () => {
    if (!supabase) return;
    const { data, error } = await supabase.rpc('join_class', { p_code: code });
    if (error) setMsg({ ok: false, text: friendlyError(error) });
    else { setMsg({ ok: true, text: `Đã vào lớp “${data}”. Giáo viên giờ xem được tiến độ của bạn.` }); setCode(''); load(); void cloud.refreshAccess(); }
  };
  const leave = async (id: string) => {
    if (!supabase || !session) return;
    await supabase.from('class_members').delete().eq('class_id', id).eq('student_id', session.user.id);
    load();
    void cloud.refreshAccess();
  };
  return (
    <section className="card space-y-3">
      <h2 className="text-lg font-extrabold">🏫 Lớp học của tôi</h2>
      {list.length === 0 ? <p className="text-muted">Bạn chưa ở lớp nào. Nhập mã lớp giáo viên đưa để giáo viên theo dõi được kết quả học.</p> : (
        <ul className="space-y-2">
          {list.map((c) => (
            <li key={c.class_id} className="flex items-center justify-between gap-2 rounded-xl bg-bg px-3 py-2">
              <span><b>{c.classes?.name}</b> <span className="text-sm text-muted">· mã {c.classes?.code}</span></span>
              <button className="chip" onClick={() => leave(c.class_id)}>Rời lớp</button>
            </li>
          ))}
        </ul>
      )}
      <form className="flex flex-wrap gap-2" onSubmit={(e) => { e.preventDefault(); join(); }}>
        <label className="sr-only" htmlFor="class-code">Mã lớp</label>
        <input id="class-code" value={code} onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))} maxLength={6} placeholder="Mã lớp (6 ký tự)"
          className="w-48 rounded-xl border-2 border-line bg-bg px-3 py-2 font-bold tracking-widest focus:border-primary focus:outline-none" />
        <button className="btn-ghost" disabled={code.length !== 6}>Vào lớp</button>
      </form>
      {msg && <p role="status" className={cls('font-semibold', msg.ok ? 'text-good' : 'text-bad')}>{msg.text}</p>}
    </section>
  );
}

export default function AccountPage() {
  const cloud = useCloud();
  const [name, setName] = useState('');
  const [saved, setSaved] = useState(false);
  useEffect(() => setName(cloud.profile?.display_name ?? ''), [cloud.profile?.display_name]);

  if (!cloud.configured) {
    return (
      <div className="card mx-auto max-w-2xl space-y-3">
        <h1 className="text-2xl font-extrabold">☁️ Tài khoản & đồng bộ</h1>
        <p>Website đang chạy ở chế độ <b>chỉ lưu trên máy này</b>: tiến độ nằm trong trình duyệt của bạn. Bạn vẫn có thể chuyển tiến độ sang máy khác bằng file sao lưu trong <Link to="/cai-dat" className="font-semibold text-accent underline">Cài đặt</Link>.</p>
        <p className="text-sm text-muted">Người quản trị website muốn bật đăng nhập và đồng bộ: làm theo mục “Đồng bộ đám mây với Supabase” trong README.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <h1 className="text-3xl font-extrabold">☁️ Tài khoản & đồng bộ</h1>
      {!cloud.session ? <SignInPanel /> : (
        <>
          <section className="card space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-sm text-muted">Đăng nhập bằng</p>
                <p className="font-bold">{cloud.session.user.email}</p>
              </div>
              {cloud.isTeacher && <Link to="/giao-vien" className="btn-primary">👩‍🏫 Trang giáo viên</Link>}
            </div>
            <form className="flex flex-wrap items-end gap-2" onSubmit={async (e) => { e.preventDefault(); await cloud.updateName(name); setSaved(true); setTimeout(() => setSaved(false), 2000); }}>
              <label className="min-w-0 flex-1 text-sm font-semibold">Tên hiển thị (giáo viên sẽ thấy tên này)
                <input value={name} onChange={(e) => setName(e.target.value)} maxLength={60} className="mt-1 w-full rounded-xl border-2 border-line bg-bg px-3 py-2 font-normal focus:border-primary focus:outline-none" />
              </label>
              <button className="btn-ghost" disabled={!name.trim()}>{saved ? '✓ Đã lưu' : 'Lưu tên'}</button>
            </form>
          </section>
          <section className="card space-y-3">
            <h2 className="text-lg font-extrabold">Đồng bộ</h2>
            <p aria-live="polite"><SyncBadge /></p>
            <p className="text-sm text-muted">Tiến độ tự đồng bộ vài giây sau mỗi lần thay đổi, và khi bạn quay lại tab này. Khi gộp giữa hai máy, website luôn giữ kết quả tốt nhất: không bài nào, điểm nào bị mất.</p>
            <div className="flex flex-wrap gap-2">
              <button className="btn-ghost" onClick={() => cloud.syncNow()}>🔄 Đồng bộ ngay</button>
              <button className="btn-ghost" onClick={() => cloud.signOut()}>Đăng xuất</button>
            </div>
          </section>
          <MyClasses />
        </>
      )}
    </div>
  );
}
