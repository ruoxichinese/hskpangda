import { useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ExerciseEngine } from '../components/ExerciseEngine';
import { PandaMascot } from '../components/panda/PandaMascot';
import { getLessons, getLevel } from '../lib/data';
import { cls, shuffle } from '../lib/util';
import { useProgress } from '../store/ProgressStore';
import type { ExerciseItem } from '../types';
import { NotFound } from './NotFound';

/** 学习小结: bảng tự đánh giá + bài ôn tập tự sinh từ ngữ pháp và từ vựng của các bài trong chặng */
export default function ReviewPage() {
  const { level: levelId = 'hsk1', id } = useParams();
  const upTo = Number(id);
  const lv = getLevel(levelId);
  const { level, updateLevel, toggleKnown, addXP } = useProgress();
  const lessons = getLessons(levelId).filter((l) => lv && l.id > upTo - lv.reviewEvery && l.id <= upTo);
  const prog = level(levelId);
  const rv = prog.review[upTo] ?? { checks: {}, note: '' };

  const quiz = useMemo<ExerciseItem[]>(() => {
    const grammarQs = lessons.flatMap((l) => l.texts.flatMap((t) => (t.grammar ?? []).flatMap((g) => (g.quiz ?? []).map((q, i) => ({ ...q, id: `${g.id}-${i}` })))));
    const vocab = lessons.flatMap((l) => l.texts.flatMap((t) => t.vocab)).filter((v) => !v.proper);
    const vocabQs = shuffle(vocab).slice(0, 6).map((v, i) => {
      const opts = shuffle([v, ...shuffle(vocab.filter((x) => x.zh !== v.zh)).slice(0, 2)]);
      return { id: `v${i}`, prompt_vi: `“${v.vi}” là từ nào?`, options: opts.map((o) => o.zh), answer: opts.indexOf(v), explain_vi: `${v.zh} (${v.pinyin}) = ${v.vi}` };
    });
    return shuffle([...shuffle(grammarQs).slice(0, 8), ...vocabQs]).map((q) => ({ kind: 'choice' as const, ...q }));
  }, [upTo, levelId]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!lv || !lessons.length) return <NotFound />;
  const rows = lessons.flatMap((l) => l.objectives.map((o) => ({ key: `${l.id}-${o.id}`, text: o.vi, lesson: l.id })));
  const vocab = lessons.flatMap((l) => l.texts.flatMap((t) => t.vocab));

  const setCheck = (key: string, col: 0 | 1, val: boolean) =>
    updateLevel(levelId, (p) => {
      const r = (p.review[upTo] ??= { checks: {}, note: '' });
      const cur = r.checks[key] ?? [false, false];
      cur[col] = val;
      r.checks[key] = cur;
    });

  return (
    <div className="space-y-5">
      <nav aria-label="Đường dẫn" className="text-sm text-muted"><Link to={`/hsk/${levelId}`} className="hover:underline">{lv.name}</Link> / Ôn tập</nav>
      <header className="card flex flex-col gap-3 sm:flex-row sm:items-center">
        <PandaMascot mood="explain" size={90} stage={lv.pandaStage} />
        <div>
          <h1 className="text-2xl font-extrabold"><span className="han">学习小结</span> – Ôn tập bài {lessons[0].id}–{upTo}</h1>
          <p className="text-muted">Tự đánh giá thật lòng nhé – không ai chấm điểm phần này ngoài bạn!</p>
        </div>
      </header>

      <section className="card">
        <h2 className="h-section mb-2">Từ vựng</h2>
        <p className="mb-3 text-sm text-muted">Chạm vào từ bạn đã nhớ và dùng được. Từ chưa chạm sẽ nằm ở nhóm “chưa nhớ”.</p>
        <div className="flex flex-wrap gap-2">
          {vocab.map((v) => {
            const k = prog.known.includes(v.zh);
            return (
              <button key={v.zh} onClick={() => toggleKnown(levelId, v.zh)} aria-pressed={k} className={cls('tile !text-lg', k && '!border-good bg-good/10')}>
                {k && <span className="mr-1 text-sm text-good">✓</span>}{v.zh}
              </button>
            );
          })}
        </div>
        <p className="mt-2 text-sm">Đã nhớ: <b>{vocab.filter((v) => prog.known.includes(v.zh)).length}</b> · Chưa nhớ: <b>{vocab.filter((v) => !prog.known.includes(v.zh)).length}</b></p>
      </section>

      <section className="card overflow-x-auto">
        <h2 className="h-section mb-3">Tôi hiểu và dùng được</h2>
        <table className="w-full text-left">
          <thead>
            <tr className="text-sm text-muted"><th className="py-1">Nội dung</th><th className="w-20 text-center"><span className="han">理解</span><br />Hiểu</th><th className="w-20 text-center"><span className="han">会用</span><br />Dùng được</th></tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.key} className="border-t border-line">
                <td className="py-2 pr-2"><span className="text-xs text-muted">Bài {r.lesson} · </span>{r.text}</td>
                {[0, 1].map((c) => (
                  <td key={c} className="text-center">
                    <input type="checkbox" aria-label={`${c === 0 ? 'Hiểu' : 'Dùng được'}: ${r.text}`} className="h-6 w-6 accent-[rgb(var(--c-primary))]" checked={!!rv.checks[r.key]?.[c]} onChange={(e) => setCheck(r.key, c as 0 | 1, e.target.checked)} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        <label className="mt-4 block font-bold" htmlFor="review-note">Điều mình cần cố gắng</label>
        <textarea id="review-note" rows={3} className="mt-1 w-full rounded-2xl border-2 border-line bg-bg p-3 focus:border-primary focus:outline-none" defaultValue={rv.note}
          onBlur={(e) => updateLevel(levelId, (p) => { (p.review[upTo] ??= { checks: {}, note: '' }).note = e.target.value; })} placeholder="Ví dụ: hay quên vị trí của 也…" />
      </section>

      <section>
        <h2 className="h-section mb-3">Bài ôn tập</h2>
        <ExerciseEngine items={quiz} levelId={levelId} upTo={upTo} onComplete={(score) => {
          updateLevel(levelId, (p) => { const r = (p.review[upTo] ??= { checks: {}, note: '' }); r.quizBest = Math.max(r.quizBest ?? 0, score); });
          addXP(20);
        }} />
      </section>
    </div>
  );
}
