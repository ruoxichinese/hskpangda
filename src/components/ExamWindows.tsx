import { useCallback, useEffect, useMemo, useState } from 'react';
import { friendlyError, randomClassCode, supabase } from '../lib/cloud';
import { getExam, getExams, levels } from '../lib/data';
import { grade } from '../lib/examGrade';
import { cls } from '../lib/util';

/**
 * Đợt thi có mã: giáo viên tạo mã cho một đề, trong một khung giờ; học sinh của lớp nhập mã mới vào thi được.
 * Điểm được chấm lại tại đây từ câu trả lời học sinh nộp (học sinh không sửa điểm được).
 */

interface Win { id: string; level: string; exam_id: string; code: string; opens_at: string; closes_at: string; max_attempts: number; show_answers: boolean }
interface Att { id: string; window_id: string; student_id: string; started_at: string; submitted_at: string | null; answers: Record<string, string> | null }
interface Student { id: string; name: string; email: string }

const toLocalInput = (d: Date) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
const fmtTime = (iso: string | null) => (iso ? new Date(iso).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' }) : '—');

function status(w: Win, now: number) {
  if (now < new Date(w.opens_at).getTime()) return { label: 'Chưa mở', cls: 'bg-line/60' };
  if (now > new Date(w.closes_at).getTime()) return { label: 'Đã đóng', cls: 'bg-bad/20 text-bad' };
  return { label: 'Đang mở', cls: 'bg-good/20 text-good' };
}

export function ExamWindows({ classId, students }: { classId: string; students: Student[] }) {
  const exams = useMemo(() => levels.filter((l) => l.available).flatMap((l) => getExams(l.id).map((e) => ({ lv: l, e }))), []);
  const [wins, setWins] = useState<Win[]>([]);
  const [atts, setAtts] = useState<Att[]>([]);
  const [open, setOpen] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [form, setForm] = useState(() => ({
    exam: exams[0] ? `${exams[0].lv.id}/${exams[0].e.id}` : '',
    opens: toLocalInput(new Date()),
    closes: toLocalInput(new Date(Date.now() + 2 * 3600000)),
    attempts: 1,
    showAnswers: true,
  }));
  const [confirmDel, setConfirmDel] = useState<string | null>(null);
  const now = Date.now();

  const load = useCallback(async () => {
    if (!supabase) return;
    const { data: w } = await supabase.from('exam_windows').select('id, level, exam_id, code, opens_at, closes_at, max_attempts, show_answers').eq('class_id', classId).order('created_at', { ascending: false });
    const ws = (w as Win[]) ?? [];
    setWins(ws);
    if (ws.length) {
      const { data: a } = await supabase.from('exam_attempts').select('id, window_id, student_id, started_at, submitted_at, answers').in('window_id', ws.map((x) => x.id));
      setAtts((a as Att[]) ?? []);
    } else setAtts([]);
  }, [classId]);
  useEffect(() => { load(); setOpen(null); }, [load]);

  if (!exams.length) return null;

  const create = async () => {
    if (!supabase) return;
    setMsg(null);
    const [level, exam_id] = form.exam.split('/');
    const opens = new Date(form.opens), closes = new Date(form.closes);
    if (!(closes > opens)) { setMsg('Giờ đóng phải sau giờ mở.'); return; }
    for (let i = 0; i < 3; i++) {
      const { error } = await supabase.from('exam_windows').insert({ class_id: classId, level, exam_id, code: randomClassCode(), opens_at: opens.toISOString(), closes_at: closes.toISOString(), max_attempts: form.attempts, show_answers: form.showAnswers });
      if (!error) { await load(); return; }
      if (!String(error.message).includes('duplicate')) { setMsg(friendlyError(error)); return; }
    }
  };
  const closeNow = async (id: string) => {
    if (!supabase) return;
    const w = wins.find((x) => x.id === id)!;
    const closes = new Date(Math.max(Date.now(), new Date(w.opens_at).getTime() + 1000)).toISOString();
    await supabase.from('exam_windows').update({ closes_at: closes }).eq('id', id);
    load();
  };
  const toggleAnswers = async (w: Win) => {
    if (!supabase) return;
    await supabase.from('exam_windows').update({ show_answers: !w.show_answers }).eq('id', w.id);
    load();
  };
  const remove = async (id: string) => {
    if (!supabase) return;
    if (confirmDel !== id) { setConfirmDel(id); return; }
    await supabase.from('exam_windows').delete().eq('id', id);
    setConfirmDel(null); setOpen(null); load();
  };
  const allowRetake = async (attId: string) => {
    if (!supabase) return;
    await supabase.from('exam_attempts').delete().eq('id', attId);
    load();
  };

  const rowsFor = (w: Win) => {
    const exam = getExam(w.level, w.exam_id);
    return students.map((s) => {
      const mine = atts.filter((a) => a.window_id === w.id && a.student_id === s.id).sort((a, b) => b.started_at.localeCompare(a.started_at));
      const last = mine[0];
      const r = exam && last?.submitted_at && last.answers ? grade(exam, last.answers) : null;
      return { s, last, r, tries: mine.length };
    });
  };
  const exportCsv = (w: Win) => {
    const exam = getExam(w.level, w.exam_id);
    const secs = exam?.sections ?? [];
    const head = ['Học sinh', 'Email', 'Bắt đầu', 'Nộp lúc', ...secs.map((s) => s.title_vi), 'Tổng', 'Kết quả'];
    const rows = rowsFor(w).map(({ s, last, r }) => [s.name, s.email, last ? fmtTime(last.started_at) : 'Chưa vào thi', last?.submitted_at ? fmtTime(last.submitted_at) : '', ...secs.map((x) => r?.sections[x.id]?.score ?? ''), r?.total ?? '', r ? (r.passed ? 'Đạt' : 'Chưa đạt') : '']);
    const csv = '\ufeff' + [head, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    a.download = `thi-${w.code}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <section className="card space-y-4" aria-label="Đợt thi có mã">
      <div>
        <h2 className="font-display text-xl font-bold">🔑 Đợt thi có mã</h2>
        <p className="text-sm text-muted">Tạo mã cho một đề thi trong một khung giờ. Chỉ học sinh của lớp này, nhập đúng mã, trong đúng giờ mới vào thi được.</p>
      </div>

      <form className="grid gap-3 rounded-2xl border-2 border-line p-3 sm:grid-cols-2" onSubmit={(e) => { e.preventDefault(); void create(); }}>
        <label className="text-sm font-semibold sm:col-span-2">Đề thi
          <select className="mt-1 w-full rounded-xl border-2 border-line bg-card p-2" value={form.exam} onChange={(e) => setForm({ ...form, exam: e.target.value })}>
            {exams.map(({ lv, e }) => <option key={`${lv.id}/${e.id}`} value={`${lv.id}/${e.id}`}>{lv.name.split(' – ')[0]} · {e.title}</option>)}
          </select>
        </label>
        <label className="text-sm font-semibold">Mở lúc
          <input type="datetime-local" className="mt-1 w-full rounded-xl border-2 border-line bg-card p-2" value={form.opens} onChange={(e) => setForm({ ...form, opens: e.target.value })} />
        </label>
        <label className="text-sm font-semibold">Đóng lúc
          <input type="datetime-local" className="mt-1 w-full rounded-xl border-2 border-line bg-card p-2" value={form.closes} onChange={(e) => setForm({ ...form, closes: e.target.value })} />
        </label>
        <label className="text-sm font-semibold">Số lượt thi mỗi học sinh
          <input type="number" min={1} max={20} className="mt-1 w-full rounded-xl border-2 border-line bg-card p-2" value={form.attempts} onChange={(e) => setForm({ ...form, attempts: Math.min(20, Math.max(1, Number(e.target.value) || 1)) })} />
        </label>
        <label className="flex items-center gap-2 self-end text-sm font-semibold">
          <input type="checkbox" className="h-5 w-5" checked={form.showAnswers} onChange={(e) => setForm({ ...form, showAnswers: e.target.checked })} />
          Cho học sinh xem đáp án sau khi nộp
        </label>
        <div className="sm:col-span-2">
          <button className="btn-primary">Tạo mã thi</button>
          {msg && <span role="alert" className="ml-3 font-semibold text-bad">{msg}</span>}
        </div>
        <p className="text-xs text-muted sm:col-span-2">Bài thi kéo dài khoảng 1 giờ (Nghe 18 phút + 3 phút kiểm tra, Đọc 25 phút, Viết 10 phút). Nên để khung giờ dư ít nhất 70 phút. Học sinh được nộp muộn tối đa 15 phút sau giờ đóng.</p>
      </form>

      {wins.length === 0 ? <p className="text-center text-muted">Chưa có đợt thi nào cho lớp này.</p> : (
        <ul className="space-y-3">
          {wins.map((w) => {
            const st = status(w, now);
            const exam = getExam(w.level, w.exam_id);
            const rows = rowsFor(w);
            const submitted = rows.filter((r) => r.r).length;
            const doing = rows.filter((r) => r.last && !r.last.submitted_at).length;
            return (
              <li key={w.id} className="rounded-2xl border-2 border-outline p-3">
                <div className="flex flex-wrap items-center gap-3">
                  <button className="tianzi rounded-xl px-3 py-1 font-mono text-2xl font-black tracking-[0.25em]" title="Bấm để sao chép mã" onClick={() => navigator.clipboard?.writeText(w.code)}>{w.code}</button>
                  <div className="min-w-0 flex-1">
                    <p className="font-bold">{exam?.title ?? w.exam_id}</p>
                    <p className="text-sm text-muted">{fmtTime(w.opens_at)} → {fmtTime(w.closes_at)} · {w.max_attempts} lượt · {w.show_answers ? 'xem được đáp án' : 'ẩn đáp án'}</p>
                  </div>
                  <span className={cls('rounded-full px-3 py-1 text-sm font-bold', st.cls)}>{st.label}</span>
                  <span className="text-sm"><b>{submitted}</b>/{students.length} đã nộp{doing ? ` · ${doing} đang làm` : ''}</span>
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  <button className="chip" onClick={() => setOpen(open === w.id ? null : w.id)} aria-expanded={open === w.id}>{open === w.id ? 'Ẩn kết quả' : 'Xem kết quả'}</button>
                  <button className="chip" onClick={() => load()}>🔄 Tải lại</button>
                  <button className="chip" onClick={() => exportCsv(w)}>⬇️ CSV</button>
                  <button className="chip" onClick={() => toggleAnswers(w)}>{w.show_answers ? 'Ẩn đáp án với học sinh' : 'Mở đáp án cho học sinh'}</button>
                  {st.label !== 'Đã đóng' && <button className="chip" onClick={() => closeNow(w.id)}>⏹ Đóng ngay</button>}
                  <button className="chip text-bad" onClick={() => remove(w.id)}>{confirmDel === w.id ? 'Bấm lần nữa để xoá' : '🗑️ Xoá'}</button>
                </div>
                {open === w.id && (
                  <div className="mt-3 overflow-x-auto">
                    <table className="w-full min-w-[560px] text-left text-sm">
                      <thead><tr className="text-muted"><th className="py-1">Học sinh</th><th>Trạng thái</th>{exam?.sections.map((s) => <th key={s.id} className="text-center">{s.title_vi}</th>)}<th className="text-center">Tổng</th><th /></tr></thead>
                      <tbody>
                        {rows.map(({ s, last, r, tries }) => (
                          <tr key={s.id} className="border-t border-line">
                            <td className="py-1.5 font-semibold">{s.name}</td>
                            <td>{!last ? <span className="text-muted">Chưa vào thi</span> : last.submitted_at ? `Nộp ${fmtTime(last.submitted_at)}` : <span className="font-semibold text-accent">Đang làm (từ {fmtTime(last.started_at)})</span>}{tries > 1 ? ` · lượt ${tries}` : ''}</td>
                            {exam?.sections.map((x) => <td key={x.id} className="text-center">{r ? r.sections[x.id].score : '–'}</td>)}
                            <td className="text-center"><span className={cls('rounded-lg px-2 py-0.5 font-bold', r ? (r.passed ? 'bg-good/20 text-good' : 'bg-bad/15 text-bad') : '')}>{r ? r.total : '–'}</span></td>
                            <td className="text-right">{last && <button className="chip" onClick={() => allowRetake(last.id)} title="Xoá lượt này để học sinh thi lại">Cho thi lại</button>}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
