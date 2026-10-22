import { useState, type ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { cloudConfigured, friendlyError, supabase } from '../lib/cloud';
import { useCloud } from '../store/CloudSync';
import { PandaMascot } from './panda/PandaMascot';

/**
 * Cổng lớp học: khi website có đăng nhập (Supabase), chỉ người đã đăng nhập và đang ở trong một lớp
 * (hoặc là giáo viên) mới vào học được. Tắt bằng biến VITE_REQUIRE_CLASS=0.
 */
export const classGateOn = cloudConfigured && import.meta.env.VITE_REQUIRE_CLASS !== '0';

export function ClassGate({ children }: { children: ReactNode }) {
  const cloud = useCloud();
  const loc = useLocation();
  if (!classGateOn || loc.pathname.endsWith('/tai-khoan')) return <>{children}</>;
  if (!cloud.authReady || (cloud.session && cloud.access === 'checking')) {
    return (
      <div className="flex flex-col items-center gap-2 py-20" role="status">
        <PandaMascot mood="think" size={110} />
        <p className="font-semibold text-muted">Pàngdá đang kiểm tra lớp học của bạn…</p>
      </div>
    );
  }
  if (cloud.session && cloud.access === 'granted') return <>{children}</>;
  return <GatePage />;
}

function GatePage() {
  const cloud = useCloud();
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const join = async () => {
    if (!supabase) return;
    setBusy(true); setMsg(null);
    const { error } = await supabase.rpc('join_class', { p_code: code.trim().toUpperCase() });
    setBusy(false);
    if (error) { setMsg(friendlyError(error)); return; }
    await cloud.refreshAccess();
  };
  const signedIn = !!cloud.session;
  return (
    <div className="mx-auto max-w-lg py-6">
      <section className="card space-y-4 text-center">
        <PandaMascot mood="sign" size={130} signText="Mã lớp?" />
        <h1 className="font-display text-2xl font-extrabold">Website dành cho học sinh của lớp</h1>
        {!signedIn ? (
          <>
            <p className="text-muted">Để vào học, hãy đăng nhập rồi nhập <b>mã lớp</b> giáo viên đưa cho bạn.</p>
            <Link to="/tai-khoan" className="btn-primary inline-block">Đăng nhập</Link>
          </>
        ) : (
          <>
            <p className="text-muted">
              Bạn đã đăng nhập{cloud.profile?.email ? <> bằng <b>{cloud.profile.email}</b></> : null} nhưng chưa ở trong lớp nào.
              Nhập mã lớp (6 ký tự) giáo viên đưa cho bạn:
            </p>
            <form className="flex flex-wrap justify-center gap-2" onSubmit={(e) => { e.preventDefault(); void join(); }}>
              <label className="sr-only" htmlFor="gate-code">Mã lớp</label>
              <input id="gate-code" value={code} onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))} maxLength={6} autoComplete="off" placeholder="Mã lớp"
                className="w-44 rounded-xl border-2 border-line bg-card px-3 py-2 text-center font-mono text-lg font-bold tracking-widest focus:border-primary focus:outline-none" />
              <button className="btn-primary" disabled={busy || code.length !== 6}>{busy ? 'Đang kiểm tra…' : 'Vào lớp'}</button>
            </form>
            {msg && <p role="alert" className="font-semibold text-bad">{msg}</p>}
            <p className="text-sm text-muted">Đăng nhập nhầm tài khoản? <button className="font-semibold text-accent underline" onClick={() => void cloud.signOut()}>Đăng xuất</button></p>
          </>
        )}
      </section>
    </div>
  );
}
