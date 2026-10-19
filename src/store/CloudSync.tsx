import type { Session } from '@supabase/supabase-js';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { cloudConfigured, friendlyError, redirectUrl, supabase } from '../lib/cloud';
import { buildSummary, mergeSnapshots, type Snapshot } from '../lib/sync';
import { lessonStars, useProgress } from './ProgressStore';

export type SyncStatus = 'off' | 'signed-out' | 'syncing' | 'synced' | 'error';

interface Profile { id: string; display_name: string | null; email: string | null }

interface CloudCtx {
  configured: boolean;
  session: Session | null;
  profile: Profile | null;
  isTeacher: boolean;
  status: SyncStatus;
  lastSynced: Date | null;
  error: string | null;
  signInGoogle(): Promise<void>;
  sendEmailCode(email: string): Promise<void>;
  verifyEmailCode(email: string, code: string): Promise<void>;
  signOut(): Promise<void>;
  syncNow(): Promise<void>;
  updateName(name: string): Promise<void>;
  wipeRemote(): Promise<void>;
}
const Ctx = createContext<CloudCtx | null>(null);

const PUSH_DELAY = 2500;
const PULL_THROTTLE = 30_000;

export function CloudProvider({ children }: { children: ReactNode }) {
  const { version, getSnapshot, applySnapshot } = useProgress();
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isTeacher, setIsTeacher] = useState(false);
  const [status, setStatus] = useState<SyncStatus>(cloudConfigured ? 'signed-out' : 'off');
  const [lastSynced, setLastSynced] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const ready = useRef(false); // đã gộp lần đầu chưa (tránh đẩy dữ liệu cũ đè lên mạng)
  const lastPull = useRef(0);
  const pushTimer = useRef<number | null>(null);
  const uid = session?.user.id;

  const push = useCallback(async (snap: Snapshot) => {
    if (!supabase || !uid) return;
    setStatus('syncing');
    const { error: e } = await supabase.from('progress').upsert({
      user_id: uid,
      data: snap,
      summary: buildSummary(snap, lessonStars),
      updated_at: new Date().toISOString(),
    });
    if (e) { setStatus('error'); setError(friendlyError(e)); return; }
    setStatus('synced'); setError(null); setLastSynced(new Date());
  }, [uid]);

  /** Kéo dữ liệu trên mạng về, gộp với máy này, rồi đẩy bản đã gộp lên */
  const pullAndMerge = useCallback(async () => {
    if (!supabase || !uid) return;
    setStatus('syncing');
    lastPull.current = Date.now();
    const { data, error: e } = await supabase.from('progress').select('data').eq('user_id', uid).maybeSingle();
    if (e) { setStatus('error'); setError(friendlyError(e)); return; }
    const merged = mergeSnapshots(getSnapshot(), (data?.data as Snapshot) ?? null);
    applySnapshot(merged);
    ready.current = true;
    await push(merged);
  }, [uid, getSnapshot, applySnapshot, push]);

  // phiên đăng nhập
  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_ev, s) => setSession(s));
    // dọn ?code=… trên thanh địa chỉ sau khi đăng nhập
    if (new URLSearchParams(window.location.search).has('code')) {
      setTimeout(() => window.history.replaceState(null, '', window.location.pathname + window.location.hash), 1500);
    }
    return () => sub.subscription.unsubscribe();
  }, []);

  // vừa đăng nhập: tải hồ sơ, vai trò, gộp tiến độ
  useEffect(() => {
    ready.current = false;
    if (!supabase || !uid) { setProfile(null); setIsTeacher(false); setStatus(cloudConfigured ? 'signed-out' : 'off'); return; }
    (async () => {
      const [{ data: p }, { data: t }] = await Promise.all([
        supabase!.from('profiles').select('id, display_name, email').eq('id', uid).maybeSingle(),
        supabase!.from('teachers').select('user_id').eq('user_id', uid).maybeSingle(),
      ]);
      setProfile(p as Profile | null);
      setIsTeacher(!!t);
      await pullAndMerge();
    })();
  }, [uid, pullAndMerge]);

  // tiến độ thay đổi → đẩy lên sau vài giây
  useEffect(() => {
    if (!uid || !ready.current) return;
    if (pushTimer.current) window.clearTimeout(pushTimer.current);
    pushTimer.current = window.setTimeout(() => push(getSnapshot()), PUSH_DELAY);
    return () => { if (pushTimer.current) window.clearTimeout(pushTimer.current); };
  }, [version, uid, push, getSnapshot]);

  // quay lại tab → kéo về (để thấy tiến độ vừa học trên máy khác); rời tab → đẩy ngay
  useEffect(() => {
    if (!uid) return;
    const onVis = () => {
      if (document.visibilityState === 'visible' && Date.now() - lastPull.current > PULL_THROTTLE) pullAndMerge();
      if (document.visibilityState === 'hidden' && ready.current) push(getSnapshot());
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [uid, pullAndMerge, push, getSnapshot]);

  const value = useMemo<CloudCtx>(() => ({
    configured: cloudConfigured,
    session, profile, isTeacher, status, lastSynced, error,
    async signInGoogle() {
      if (!supabase) return;
      const { error: e } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: redirectUrl() } });
      if (e) throw new Error(friendlyError(e));
    },
    async sendEmailCode(email) {
      if (!supabase) return;
      const { error: e } = await supabase.auth.signInWithOtp({ email: email.trim(), options: { emailRedirectTo: redirectUrl(), shouldCreateUser: true } });
      if (e) throw new Error(friendlyError(e));
    },
    async verifyEmailCode(email, code) {
      if (!supabase) return;
      const { error: e } = await supabase.auth.verifyOtp({ email: email.trim(), token: code.trim(), type: 'email' });
      if (e) throw new Error(friendlyError(e));
    },
    async signOut() {
      if (!supabase) return;
      if (ready.current) await push(getSnapshot());
      await supabase.auth.signOut();
    },
    syncNow: pullAndMerge,
    async updateName(name) {
      if (!supabase || !uid) return;
      const { data, error: e } = await supabase.from('profiles').update({ display_name: name.trim().slice(0, 60) }).eq('id', uid).select('id, display_name, email').maybeSingle();
      if (e) throw new Error(friendlyError(e));
      setProfile(data as Profile);
    },
    async wipeRemote() {
      if (!supabase || !uid) return;
      ready.current = false;
      await supabase.from('progress').update({ data: {}, summary: {}, updated_at: new Date().toISOString() }).eq('user_id', uid);
    },
  }), [session, profile, isTeacher, status, lastSynced, error, pullAndMerge, push, getSnapshot, uid]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCloud() {
  const c = useContext(Ctx);
  if (!c) throw new Error('useCloud phải nằm trong CloudProvider');
  return c;
}
