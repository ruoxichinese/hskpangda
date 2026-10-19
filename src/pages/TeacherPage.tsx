import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { PandaMascot } from '../components/panda/PandaMascot';
import { Stars } from '../components/ui';
import { friendlyError, randomClassCode, supabase } from '../lib/cloud';
import { getHomework, getLessons, isReady, levels } from '../lib/data';
import type { Summary } from '../lib/sync';
import { cls } from '../lib/util';
import { useCloud } from '../store/CloudSync';

interface ClassRow { id: string; name: string; code: string; created_at: string }
interface StudentRow { id: string; name: string; email: string; joined: string; summary: Summary | null; updated: string | null }

function ago(iso: string | null) {
  if (!iso) return '—';
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  return d <= 0 ? 'hôm nay' : d === 1 ? 'hôm qua' : `${d} ngày trước`;
}

function scoreClass(score: number | undefined, pass: number) {
  if (score === undefined) return 'bg-line/40 text-muted';
  return score >= pass ? 'bg-good/20 text-good font-bold' : 'bg-amber-500/20 text-amber-800 dark:text-amber-200 font-bold';
}

export default function TeacherPage() {
  const cloud = useCloud();
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [active, setActive] = useState<string | null>(null);
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [levelId, setLevelId] = useState(levels.find((l) => l.available)!.id);
  const [newName, setNewName] = useState('');
  const [open, setOpen] = useState<StudentRow | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [confirmDel, setConfirmDel] = useState(false);

  const loadClasses = useCallback(async () => {
    if (!supabase || !cloud.session) return;
    const { data } = await supabase.from('classes').select('id, name, code, created_at').eq('teacher_id', cloud.session.user.id).order('created_at');
    const rows = (data as ClassRow[]) ?? [];
    setClasses(rows);
    setActive((a) => a ?? rows[0]?.id ?? null);
  }, [cloud.session]);

  const loadStudents = useCallback(async () => {
    if (!supabase || !active) { setStudents([]); return; }
    const { data: mem } = await supabase.from('class_members').select('student_id, joined_at').eq('class_id', active);
    const ids = (mem ?? []).map((m) => m.student_id as string);
    if (!ids.length) { setStudents([]); return; }
    const [{ data: profs }, { data: prog }] = await Promise.all([
      supabase.from('profiles').select('id, display_name, email').in('id', ids),
      supabase.from('progress').select('user_id, summary, updated_at').in('user_id', ids),
    ]);
    setStudents(ids.map((id) => {
      const p = profs?.find((x) => x.id === id);
      const g = prog?.find((x) => x.user_id === id);
      return { id, name: p?.display_name || p?.email || 'Học sinh', email: p?.email ?? '', joined: mem!.find((m) => m.student_id === id)!.joined_at, summary: (g?.summary as Summary) ?? null, updated: g?.updated_at ?? null };
    }).sort((a, b) => a.name.localeCompare(b.name, 'vi')));
  }, [active]);

  useEffect(() => { loadClasses(); }, [loadClasses]);
  useEffect(() => { loadStudents(); setOpen(null); setConfirmDel(false); }, [loadStudents]);

  const lv = levels.find((l) => l.id === levelId)!;
  const lessons = getLessons(levelId);
  const hwLessons = lessons.filter((l) => isReady(getHomework(levelId, l.id)));
  const activeClass = classes.find((c) => c.id === active);

  const stats = useMemo(() => {
    const done = students.map((s) => s.summary?.levels?.[levelId]?.completed.length ?? 0);
    return { avgDone: done.length ? (done.reduce((a, b) => a + b, 0) / done.length).toFixed(1) : '0', active7: students.filter((s) => s.summary?.lastActive && Date.now() - new Date(s.summary.lastActive).getTime() < 7 * 86400000).length };
  }, [students, levelId]);

  if (!cloud.configured || !cloud.session) {
    return <div className="card mx-auto max-w-xl text-center"><PandaMascot mood="think" size={100} /><p className="mt-2">Hãy <Link to="/tai-khoan" className="font-semibold text-accent underline">đăng nhập</Link> bằng tài khoản giáo viên.</p></div>;
  }
  if (!cloud.isTeacher) {
    return (
      <div className="card mx-auto max-w-xl space-y-2 text-center">
        <PandaMascot mood="sign" signText="Giáo viên" size={100} />
        <p>Tài khoản <b>{cloud.session.user.email}</b> chưa được cấp quyền giáo viên.</p>
        <p className="text-sm text-muted">Người quản trị chạy lệnh <code>select public.make_teacher('{cloud.session.user.email}');</code> trong Supabase → SQL Editor, rồi tải lại trang này.</p>
      </div>
    );
  }

  const createClass = async () => {
    if (!supabase || !newName.trim()) return;
    for (let i = 0; i < 3; i++) {
      const { error } = await supabase.from('classes').insert({ name: newName.trim(), code: randomClassCode() });
      if (!error) { setNewName(''); setMsg(null); setActive(null); await loadClasses(); return; }
      if (!String(error.message).includes('duplicate')) { setMsg(friendlyError(error)); return; }
    }
  };
  const deleteClass = async () => {
    if (!supabase || !active) return;
    await supabase.from('classes').delete().eq('id', active);
    setActive(null); setConfirmDel(false); loadClasses();
  };
  const removeStudent = async (sid: string) => {
    if (!supabase || !active) return;
    await supabase.from('class_members').delete().eq('class_id', active).eq('student_id', sid);
    setOpen(null); loadStudents();
  };
  const exportCsv = () => {
    const head = ['Học sinh', 'Email', 'Hoạt động gần nhất', 'XP', 'Chuỗi ngày', `Bài đã học (${lv.name})`, ...hwLessons.map((l) => `BTVN bài ${l.id} (%)`)];
    const rows = students.map((s) => {
      const L = s.summary?.levels?.[levelId];
      return [s.name, s.email, s.summary?.lastActive ?? '', s.summary?.xp ?? 0, s.summary?.streak ?? 0, L?.completed.length ?? 0, ...hwLessons.map((l) => L?.homework?.[l.id]?.best ?? '')];
    });
    const csv = '\ufeff' + [head, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    a.download = `${activeClass?.name ?? 'lop'}-${levelId}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <div className="space-y-5">
      <h1 className="text-3xl font-extrabold">👩‍🏫 Trang giáo viên</h1>

      <section className="card space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          {classes.map((c) => (
            <button key={c.id} className={cls('chip', c.id === active && 'chip-on')} onClick={() => setActive(c.id)}>{c.name}</button>
          ))}
          {classes.length === 0 && <p className="text-muted">Chưa có lớp nào. Tạo lớp đầu tiên bên dưới.</p>}
        </div>
        <form className="flex flex-wrap gap-2" onSubmit={(e) => { e.preventDefault(); createClass(); }}>
          <label className="sr-only" htmlFor="new-class">Tên lớp mới</label>
          <input id="new-class" value={newName} onChange={(e) => setNewName(e.target.value)} maxLength={80} placeholder="Tên lớp mới, vd. HSK1 – tối thứ 3"
            className="min-w-0 flex-1 rounded-xl border-2 border-line bg-bg px-3 py-2 focus:border-primary focus:outline-none" />
          <button className="btn-ghost" disabled={!newName.trim()}>＋ Tạo lớp</button>
        </form>
        {msg && <p role="alert" className="text-bad">{msg}</p>}
      </section>

      {activeClass && (
        <>
          <section className="card flex flex-wrap items-center gap-4">
            <div className="flex-1">
              <h2 className="text-xl font-extrabold">{activeClass.name}</h2>
              <p className="text-muted">Mã lớp để học sinh tham gia (vào ☁️ Tài khoản → Vào lớp):</p>
            </div>
            <button className="tianzi rounded-2xl px-5 py-3 font-mono text-3xl font-black tracking-[0.3em]" onClick={() => navigator.clipboard?.writeText(activeClass.code)} title="Bấm để sao chép mã">{activeClass.code}</button>
            <div className="flex flex-col gap-1 text-sm">
              <span><b>{students.length}</b> học sinh</span>
              <span><b>{stats.active7}</b> học trong 7 ngày qua</span>
              <span>TB <b>{stats.avgDone}</b> bài đã học</span>
            </div>
          </section>

          <section className="card space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <label className="text-sm font-semibold">Cấp
                <select className="ml-2 rounded-xl border-2 border-line bg-bg p-2" value={levelId} onChange={(e) => setLevelId(e.target.value)}>
                  {levels.filter((l) => l.available).map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
                </select>
              </label>
              <button className="chip" onClick={loadStudents}>🔄 Tải lại</button>
              <button className="chip" onClick={exportCsv} disabled={!students.length}>⬇️ Xuất CSV</button>
              <span className="ml-auto text-sm text-muted">Điểm bài tập về nhà cao nhất; đạt từ {lv.difficulty.homeworkPassScore}%</span>
            </div>
            {students.length === 0 ? <p className="py-4 text-center text-muted">Chưa có học sinh. Đưa mã <b>{activeClass.code}</b> cho học sinh để các em tham gia.</p> : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] text-left text-sm">
                  <thead>
                    <tr className="text-muted">
                      <th className="py-2">Học sinh</th><th>Gần nhất</th><th>XP</th><th>🔥</th><th>Bài học</th>
                      {hwLessons.map((l) => <th key={l.id} className="text-center" title={l.title.zh}>BT{l.id}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {students.map((s) => {
                      const L = s.summary?.levels?.[levelId];
                      return (
                        <tr key={s.id} className="cursor-pointer border-t border-line hover:bg-primary/5" onClick={() => setOpen(s)}>
                          <td className="py-2 font-semibold"><button className="text-left underline-offset-2 hover:underline">{s.name}</button></td>
                          <td>{ago(s.summary?.lastActive ?? s.updated)}</td>
                          <td>{s.summary?.xp ?? 0}</td>
                          <td>{s.summary?.streak ?? 0}</td>
                          <td>{L?.completed.length ?? 0}/{lv.lessonCount}</td>
                          {hwLessons.map((l) => {
                            const h = L?.homework?.[l.id];
                            return <td key={l.id} className="px-1 text-center"><span className={cls('inline-block min-w-[2.6rem] rounded-lg px-1 py-0.5', scoreClass(h?.best, lv.difficulty.homeworkPassScore))}>{h ? h.best : '–'}</span></td>;
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {open && (
            <section className="card space-y-3" aria-label={`Chi tiết ${open.name}`}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-lg font-extrabold">{open.name} <span className="text-sm font-normal text-muted">{open.email} · vào lớp {new Date(open.joined).toLocaleDateString('vi-VN')}</span></h3>
                <button className="chip" onClick={() => setOpen(null)}>✕ Đóng</button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead><tr className="text-muted"><th className="py-1">Bài</th><th>Đã học</th><th>Sao</th><th>BTVN cao nhất</th><th>Số lần làm</th></tr></thead>
                  <tbody>
                    {lessons.filter(isReady).map((l) => {
                      const L = open.summary?.levels?.[levelId];
                      const h = L?.homework?.[l.id];
                      return (
                        <tr key={l.id} className="border-t border-line">
                          <td className="py-1.5"><span className="font-han">{l.id}. {l.title.zh}</span></td>
                          <td>{L?.completed.includes(l.id) ? '✅' : '—'}</td>
                          <td><Stars n={L?.stars?.[l.id] ?? 0} size="text-sm" /></td>
                          <td><span className={cls('rounded-lg px-1.5 py-0.5', scoreClass(h?.best, lv.difficulty.homeworkPassScore))}>{h ? `${h.best}%` : 'chưa làm'}</span></td>
                          <td>{h?.attempts ?? 0}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {(open.summary?.levels?.[levelId]?.wrongTop?.length ?? 0) > 0 && (
                <div>
                  <p className="font-bold">Từ hay sai</p>
                  <div className="mt-1 flex flex-wrap gap-2">
                    {open.summary!.levels[levelId].wrongTop.map(([w, n]) => <span key={w} className="chip !cursor-default"><span className="font-han text-lg">{w}</span> <span className="text-bad">×{n}</span></span>)}
                  </div>
                </div>
              )}
              <button className="btn-ghost border-bad/60 text-bad" onClick={() => removeStudent(open.id)}>Xoá khỏi lớp</button>
            </section>
          )}

          <div className="text-right">
            <button className="btn-ghost border-bad/60 text-bad" onClick={() => (confirmDel ? deleteClass() : setConfirmDel(true))}>
              {confirmDel ? '⚠️ Bấm lần nữa để xoá lớp (không xoá tiến độ của học sinh)' : '🗑️ Xoá lớp này'}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
