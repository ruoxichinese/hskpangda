import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { PandaMascot } from '../components/panda/PandaMascot';
import { ReadingQuestion } from '../components/questions/ReadingQuestion';
import { ReorderQuestion } from '../components/questions/ReorderQuestion';
import { TranslateQuestion, type TranslateValue } from '../components/questions/TranslateQuestion';
import { Confetti, ProgressBar, Stars } from '../components/ui';
import { ZhText } from '../components/ZhText';
import { ClipButton, ImageBank, WordTable, WriteQuestion } from '../components/questions/HwExtras';
import { allGrammar, getHomework, getLesson, getLevel, isReady } from '../lib/data';
import { getDict, segment } from '../lib/dict';
import { charDiff, compareKey } from '../lib/grading';
import { flatten, gradeQuestion, hasHwStreak, isAnswered, makeOrder, scoreOf, starsFor, type FlatQ, type Graded } from '../lib/homework';
import { cls } from '../lib/util';
import { hwStatus, useLevelPrefs, useProgress, type HwDraft, type QResult } from '../store/ProgressStore';
import type { HwQuestion, PinyinMode } from '../types';
import { NotFound } from './NotFound';

function correctText(q: HwQuestion): string {
  switch (q.kind) {
    case 'mcq': return q.options[q.answer];
    case 'truefalse': return q.answer ? 'Đúng' : 'Sai';
    case 'match': return q.pairs.map((p) => `${p.q} → ${p.a}`).join('  ·  ');
    case 'cloze': return q.answers.map((a, i) => `(${i + 1}) ${a}`).join('  ');
    case 'reorder': return q.answers.join(' / ');
    case 'translate': return q.acceptedAnswers[0];
    case 'charFill': return q.answer;
    case 'sentence': return q.sample;
  }
}

function newDraft(items: FlatQ[], keep?: Record<string, unknown>, keepOrder?: Record<string, number[]>, only?: string[]): HwDraft {
  const order: Record<string, number[]> = { ...(keepOrder ?? {}) };
  for (const { q } of items) if (!only || only.includes(q.id)) { const o = makeOrder(q); if (o) order[q.id] = o; }
  const answers = { ...(keep ?? {}) };
  if (only) only.forEach((id) => delete answers[id]);
  const firstIdx = only ? items.findIndex((x) => only.includes(x.q.id)) : 0;
  return { answers, order, noHints: {}, index: Math.max(0, firstIdx), startedAt: Date.now(), retryOnly: only };
}

export default function HomeworkPage() {
  const { level: levelId = 'hsk1', id } = useParams();
  const lessonId = Number(id);
  const lv = getLevel(levelId);
  const lesson = getLesson(levelId, lessonId);
  const hw = getHomework(levelId, lessonId);
  const prefs = useLevelPrefs(levelId);
  const { level, updateLevel, addXP, award, touch } = useProgress();
  const items = useMemo(() => (hw ? flatten(hw) : []), [hw]);
  const prog = level(levelId);
  const hp = prog.homework[lessonId];
  const status = hwStatus(prog, lessonId);

  const [mode, setMode] = useState<'doing' | 'result'>(() => (hp?.last && !hp.draft ? 'result' : 'doing'));
  const [draft, setDraft] = useState<HwDraft>(() => hp?.draft ?? newDraft(items));
  const noPinyin = hw?.pinyin === false;
  const [passagePinyin, setPassagePinyin] = useState<PinyinMode>(noPinyin ? 'hidden' : prefs.pinyin);
  const [toast, setToast] = useState<string | null>(null);
  const [fire, setFire] = useState(0);
  const [now, setNow] = useState(Date.now());
  const [confirmSubmit, setConfirmSubmit] = useState(false);
  const submittedRef = useRef(false);

  const visible = draft.retryOnly ? items.filter((x) => draft.retryOnly!.includes(x.q.id)) : items;
  const cur = items[draft.index] ?? items[0];
  const posInVisible = visible.findIndex((x) => x.q.id === cur?.q.id);

  // tự lưu nháp
  const saveDraft = useCallback((d: HwDraft, notify = false) => {
    updateLevel(levelId, (p) => {
      const h = (p.homework[lessonId] ??= { best: 0, passed: false, attempts: 0, history: [] });
      h.draft = d;
    });
    if (notify) { setToast('💾 Đã lưu nháp. Lần sau vào sẽ làm tiếp từ câu này.'); setTimeout(() => setToast(null), 2500); }
  }, [levelId, lessonId, updateLevel]);
  useEffect(() => {
    if (mode !== 'doing' || status === 'locked') return;
    const t = setTimeout(() => saveDraft(draft), 600);
    return () => clearTimeout(t);
  }, [draft, mode, saveDraft, status]);

  const timer = lv?.difficulty.timerSeconds ?? null;
  const remaining = timer ? Math.max(0, Math.round(timer - (now - draft.startedAt) / 1000)) : null;
  useEffect(() => {
    if (!timer || mode !== 'doing') return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [timer, mode]);

  const setAnswer = (qid: string, v: unknown) => setDraft((d) => ({ ...d, answers: { ...d.answers, [qid]: v } }));
  const goIdx = (i: number) => setDraft((d) => ({ ...d, index: i }));
  const step = (delta: number) => {
    const next = visible[posInVisible + delta];
    if (next) goIdx(items.indexOf(next));
  };

  const submit = useCallback(() => {
    if (!hw || submittedRef.current) return;
    submittedRef.current = true;
    const results: Record<string, QResult> = {};
    const wrongWords: string[] = [];
    let bonus = 0;
    const dict = getDict(levelId);
    for (const { q } of items) {
      const g = gradeQuestion(q, draft.answers[q.id], draft.order[q.id]);
      results[q.id] = { points: g.points, status: g.status };
      if (q.kind === 'translate' && g.points === 1 && (draft.answers[q.id] as TranslateValue | undefined)?.noBank) bonus += 5;
      if (g.points < 1) {
        const txt = q.kind === 'translate' ? q.acceptedAnswers[0] : q.kind === 'reorder' ? q.answers[0] : q.kind === 'cloze' ? q.answers.join('') : q.kind === 'mcq' ? q.options[q.answer] : '';
        segment(txt, dict).forEach((s) => s.entry && s.entry.lesson > 0 && wrongWords.push(s.entry.zh));
      }
    }
    const score = scoreOf(results, items.length);
    const pass = lv!.difficulty.homeworkPassScore;
    const firstPass = !hp?.passed && score >= pass;
    let bestMap: Record<number, number> = {};
    updateLevel(levelId, (p) => {
      const h = (p.homework[lessonId] ??= { best: 0, passed: false, attempts: 0, history: [] });
      h.attempts += 1;
      h.best = Math.max(h.best, score);
      h.passed = h.passed || score >= pass;
      h.history = [...(h.history ?? []), score].slice(-20);
      h.last = { score, results, answers: draft.answers, order: draft.order, at: Date.now() };
      delete h.draft;
      for (const w of wrongWords) p.wrong[w] = (p.wrong[w] ?? 0) + 1;
      bestMap = Object.fromEntries(Object.entries(p.homework).map(([k, v]) => [Number(k), v.best]));
    });
    addXP(Math.round(score / 5) + bonus + (firstPass ? 100 : 0));
    if (score >= pass) { award('first-homework'); setFire((f) => f + 1); }
    if (score === 100) award('perfect-hw');
    if (hasHwStreak({ ...bestMap, [lessonId]: Math.max(score, bestMap[lessonId] ?? 0) })) award('hw-streak-5');
    touch(levelId);
    setMode('result');
    window.scrollTo({ top: 0 });
  }, [hw, items, draft, levelId, lessonId, lv, hp?.passed, updateLevel, addXP, award, touch]);

  useEffect(() => { if (remaining === 0 && mode === 'doing') submit(); }, [remaining, mode, submit]);

  if (!lv || !lesson || !hw) return <NotFound />;
  const backToLesson = `/hsk/${levelId}/bai/${lessonId}`;

  if (!isReady(hw) || items.length === 0) {
    return (
      <div className="card mx-auto max-w-xl text-center">
        <PandaMascot mood="think" size={110} />
        <h1 className="mt-2 text-2xl font-extrabold">Bài tập về nhà bài {lessonId} đang được soạn</h1>
        <p className="mt-2 text-muted">Khung đã có ở <code>src/data/{levelId}/homework/hw-{String(lessonId).padStart(2, '0')}.json</code>.</p>
        <Link to={backToLesson} className="btn-ghost mt-4">← Về bài học</Link>
      </div>
    );
  }
  if (status === 'locked') {
    return (
      <div className="card mx-auto max-w-xl text-center">
        <PandaMascot mood="bag" size={110} />
        <h1 className="mt-2 text-2xl font-extrabold">🔒 Học xong bài {lessonId} để mở bài tập về nhà</h1>
        <p className="mt-2 text-muted">Hoàn thành các phần bài khoá và luyện tập, rồi bấm “Hoàn thành bài học”.</p>
        <Link to={`${backToLesson}?buoc=finish`} className="btn-primary mt-4">Đi tới bài học</Link>
      </div>
    );
  }

  const header = (
    <header className="no-print mb-4">
      <nav aria-label="Đường dẫn" className="mb-1 text-sm text-muted">
        <Link to={`/hsk/${levelId}`} className="hover:underline">{lv.name}</Link> / <Link to={backToLesson} className="hover:underline">Bài {lessonId}</Link> / Bài tập về nhà
      </nav>
      <div className="flex flex-wrap items-end justify-between gap-2">
        <h1 className="text-2xl font-extrabold">📝 Bài tập về nhà – <span className="han">{lesson.title.zh}</span></h1>
        <button className="btn-ghost no-print" onClick={() => window.print()}>🖨️ In / Xuất PDF</button>
      </div>
    </header>
  );

  // ===== KẾT QUẢ =====
  if (mode === 'result' && hp?.last) {
    const last = hp.last;
    const score = last.score;
    const pass = score >= lv.difficulty.homeworkPassScore;
    const wrongIds = items.filter((x) => (last.results[x.q.id]?.points ?? 0) < 1).map((x) => x.q.id);
    const gmap = allGrammar(levelId);
    const grammarLink = (gid?: string) => {
      const g = gid && gmap.find((x) => x.g.id === gid);
      return g ? { to: `/hsk/${levelId}/bai/${g.lesson.id}?buoc=${g.textId}#${g.g.id}`, label: g.g.title_vi } : null;
    };
    const confirm = (qid: string) => {
      updateLevel(levelId, (p) => {
        const h = p.homework[lessonId];
        if (!h?.last) return;
        h.last.results[qid] = { ...h.last.results[qid], points: 0.5, confirmed: true };
        h.last.score = scoreOf(h.last.results, items.length);
        h.best = Math.max(h.best, h.last.score);
        h.passed = h.passed || h.last.score >= lv.difficulty.homeworkPassScore;
      });
    };
    return (
      <div>
        <Confetti fire={fire} />
        {header}
        <section className="card mb-5 flex flex-col items-center gap-3 text-center sm:flex-row sm:text-left">
          <PandaMascot mood={pass ? 'celebrate' : score >= 50 ? 'cheer' : 'think'} size={120} stage={lv.pandaStage} />
          <div className="flex-1">
            <p className="text-5xl font-black">{score}%</p>
            <Stars n={starsFor(score)} size="text-2xl" />
            <p className="mt-1 text-lg font-semibold">
              {pass ? `✅ Đạt! (cần ${lv.difficulty.homeworkPassScore}%) – Pàngdá tự hào về bạn!` : `Cần ${lv.difficulty.homeworkPassScore}% để đạt. Không sao, làm lại các câu sai nhé!`}
            </p>
            <p className="text-sm text-muted">Điểm cao nhất: {hp.best}% · Số lần làm: {hp.attempts}</p>
          </div>
          <div className="flex flex-col gap-2">
            {wrongIds.length > 0 && (
              <button className="btn-primary" onClick={() => { submittedRef.current = false; setDraft(newDraft(items, last.answers, last.order, wrongIds)); setMode('doing'); }}>
                🔁 Làm lại {wrongIds.length} câu sai
              </button>
            )}
            <button className="btn-ghost" onClick={() => { submittedRef.current = false; setDraft(newDraft(items)); setMode('doing'); }}>Làm lại từ đầu</button>
            <Link to={`/hsk/${levelId}`} className="btn-ghost">Về lộ trình</Link>
          </div>
        </section>

        <h2 className="h-section mb-3">Chi tiết từng câu</h2>
        <ol className="space-y-3">
          {items.map(({ q, label }) => {
            const r = last.results[q.id] ?? { points: 0, status: 'empty' };
            const g: Graded = gradeQuestion(q, last.answers[q.id], last.order[q.id], r.confirmed);
            const ok = r.points === 1;
            const link = 'grammarRef' in q ? grammarLink(q.grammarRef) : null;
            return (
              <li key={q.id} className={cls('card', ok ? '' : r.points > 0 ? 'border-amber-500/60' : 'border-bad/50')}>
                <div className="flex items-start gap-3">
                  <span className={cls('inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full font-bold text-white', ok ? 'bg-good' : r.points > 0 ? 'bg-amber-500' : 'bg-bad')} aria-hidden>
                    {ok ? '✓' : r.points > 0 ? '½' : '✗'}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">
                      Câu {label}. {q.kind === 'translate' ? q.prompt_vi : q.kind === 'mcq' ? (q.prompt_zh ?? q.prompt_vi) : q.kind === 'truefalse' ? q.statement_zh : q.kind === 'reorder' ? q.vi : q.kind === 'match' ? 'Nối câu' : q.kind === 'charFill' ? `${q.text.replace('___', `（${q.pinyin}）`)}` : q.kind === 'sentence' ? `Đặt câu với “${q.word}”` : 'Điền từ'}
                      <span className="sr-only">{ok ? ' – đúng' : ' – chưa đúng'}</span>
                    </p>
                    {!ok && (
                      <div className="mt-2 space-y-2 text-sm">
                        {(q.kind === 'mcq' || q.kind === 'truefalse') && (
                          <p>Bạn trả lời: <span className="han text-base">{last.answers[q.id] === undefined ? '(bỏ trống)' : q.kind === 'mcq' ? q.options[last.answers[q.id] as number] : last.answers[q.id] ? 'Đúng' : 'Sai'}</span></p>
                        )}
                        {g.userText !== undefined && <p>Bạn trả lời: <span className="han text-base">{g.userText || '(bỏ trống)'}</span></p>}
                        {g.status === 'close' && g.translate && (
                          <div className="rounded-xl bg-amber-500/10 p-3">
                            <p className="font-bold">🟡 Gần đúng! So với đáp án mẫu:</p>
                            <p className="han mt-1 text-xl" aria-label="So sánh với đáp án mẫu">
                              {charDiff(compareKey(g.userText ?? ''), compareKey(g.translate.best)).map((d, i) => (
                                <span key={i} className={cls(d.type === 'extra' && 'bg-bad/20 text-bad line-through', d.type === 'missing' && 'bg-good/20 text-good underline')}>{d.text}</span>
                              ))}
                            </p>
                            <p className="mt-1 text-xs text-muted">Gạch ngang = chữ thừa · Gạch dưới = chữ còn thiếu</p>
                            {!r.confirmed ? (
                              <button className="btn-ghost mt-2 !min-h-0 !py-1.5" onClick={() => confirm(q.id)}>Câu của tôi cũng đúng (+½ điểm)</button>
                            ) : <p className="mt-1 font-semibold text-good">Đã xác nhận – được ½ điểm.</p>}
                          </div>
                        )}
                        {g.status === 'wrong' && g.translate && g.translate.missingKeywords.length > 0 && (
                          <p className="text-bad">Thiếu thành phần quan trọng: <span className="han">{g.translate.missingKeywords.join('、')}</span></p>
                        )}
                        <p>Đáp án: <span className="han text-base font-semibold text-good">{correctText(q)}</span></p>
                        <p className="text-muted">{q.explain_vi}</p>
                        {link && <Link to={link.to} className="font-semibold text-accent underline">📖 Ôn lại: {link.label}</Link>}
                      </div>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
        <PrintSheet noPinyin={noPinyin} items={items} levelId={levelId} title={lesson.title.zh} />
      </div>
    );
  }

  // ===== ĐANG LÀM =====
  const answered = visible.filter((x) => isAnswered(x.q, draft.answers[x.q.id])).length;
  const { q, section } = cur;
  const pinyinFor: PinyinMode = noPinyin ? 'hidden' : prefs.pinyin;
  const showPassage = section.passage && section.passage.zh;

  let qBody: React.ReactNode;
  if (q.kind === 'reorder') {
    const order = draft.order[q.id] ?? q.tiles.map((_, i) => i);
    qBody = (
      <div>
        {q.vi && <p className="mb-3 text-lg font-semibold">🇻🇳 {q.vi}</p>}
        <ReorderQuestion tiles={order.map((i) => q.tiles[i])} value={(draft.answers[q.id] as number[]) ?? []} onChange={(v) => setAnswer(q.id, v)} levelId={levelId} pinyin={pinyinFor} />
      </div>
    );
  } else if (q.kind === 'translate') {
    qBody = (
      <TranslateQuestion
        q={q}
        value={draft.answers[q.id] as TranslateValue}
        onChange={(v) => setAnswer(q.id, v)}
        levelId={levelId}
        upTo={lessonId}
        allowPinyinInput={lv.difficulty.pinyinDefault === 'always'}
        allowBank={lv.difficulty.hintsPerQuestion > 0}
      />
    );
  } else if (q.kind === 'charFill' || q.kind === 'sentence') {
    qBody = <WriteQuestion key={q.id} q={q} value={draft.answers[q.id]} onChange={(v) => setAnswer(q.id, v)} levelId={levelId} />;
  } else {
    qBody = (
      <div>
        {(q.kind === 'mcq' || q.kind === 'truefalse') && q.audio && <ClipButton key={`clip-${q.id}`} clip={q.audio} fallbackSrc={hw?.audio} />}
        {q.kind === 'mcq' && q.context_zh && (
          <div className="mb-3 rounded-2xl bg-bg p-3"><ZhText text={q.context_zh} levelId={levelId} pinyin={pinyinFor} upTo={lessonId} size="lg" className="block !leading-[2.2]" /></div>
        )}
        <ReadingQuestion key={q.id} q={q} value={draft.answers[q.id]} onChange={(v) => setAnswer(q.id, v)} order={draft.order[q.id]} levelId={levelId} upTo={lessonId} pinyin={pinyinFor} />
      </div>
    );
  }

  return (
    <div>
      {header}
      <div className="no-print">
        <div className="sticky top-[57px] z-20 -mx-4 mb-4 border-b border-line bg-bg/95 px-4 py-2 backdrop-blur">
          <div className="flex items-center gap-3">
            <span className="whitespace-nowrap font-bold">Câu {posInVisible + 1}/{visible.length}</span>
            <div className="flex-1"><ProgressBar value={answered} max={visible.length} label="Số câu đã trả lời" /></div>
            {remaining !== null && <span className={cls('font-bold', remaining < 60 && 'text-bad')}>⏱ {Math.floor(remaining / 60)}:{String(remaining % 60).padStart(2, '0')}</span>}
          </div>
          {draft.retryOnly && <p className="mt-1 text-sm font-semibold text-accent">Đang làm lại {draft.retryOnly.length} câu sai</p>}
        </div>

        <section className="card mb-4">
          <p className="text-sm font-bold text-accent">
            {({ vocab: 'Từ vựng', listening: 'Nghe', reading: 'Đọc hiểu', writing: 'Viết' } as Record<string, string>)[section.type]} · {section.part} {section.title_vi}
          </p>
          {section.instructions_vi && <p className="text-sm text-muted">{section.instructions_vi}</p>}
          {section.images && <ImageBank images={section.images} levelId={levelId} />}
          {section.wordTable && <WordTable rows={section.wordTable} />}
          {showPassage && (
            <div className="mt-3 rounded-2xl bg-bg p-3">
              <div className="mb-2 flex items-center justify-between gap-2">
                <span className="label">📄 {section.passage!.title_vi ?? 'Bài đọc'}</span>
                {!noPinyin && (
                  <button className="chip" onClick={() => setPassagePinyin((p) => (p === 'always' ? (prefs.pinyin === 'always' ? 'hidden' : prefs.pinyin) : 'always'))} aria-pressed={passagePinyin === 'always'}>
                    {passagePinyin === 'always' ? 'Tắt pinyin' : 'Hiện toàn bộ pinyin'}
                  </button>
                )}
              </div>
              <ZhText text={section.passage!.zh} levelId={levelId} pinyin={passagePinyin} upTo={lessonId} size="lg" className="block !leading-[2.4]" />
            </div>
          )}
        </section>

        <section className="card mb-4" aria-live="polite" aria-label={`Câu ${cur.label}`}>
          <p className="label mb-2">Câu {cur.label}</p>
          {qBody}
        </section>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <button className="btn-ghost" disabled={posInVisible <= 0} onClick={() => step(-1)}>← Câu trước</button>
          <button className="btn-ghost" onClick={() => saveDraft(draft, true)}>💾 Lưu nháp</button>
          {posInVisible < visible.length - 1 ? (
            <button className="btn-primary" onClick={() => step(1)}>Câu sau →</button>
          ) : (
            <button className="btn-primary" onClick={() => { if (answered < visible.length && !confirmSubmit) { setConfirmSubmit(true); return; } submit(); }}>
              {confirmSubmit && answered < visible.length ? `Còn ${visible.length - answered} câu trống – bấm lần nữa để nộp` : '📮 Nộp bài'}
            </button>
          )}
        </div>

        <nav aria-label="Chuyển nhanh tới câu" className="mt-5 flex flex-wrap gap-1.5">
          {visible.map((x) => {
            const i = items.indexOf(x);
            const a = isAnswered(x.q, draft.answers[x.q.id]);
            return (
              <button key={x.q.id} onClick={() => goIdx(i)} aria-current={i === draft.index ? 'true' : undefined} aria-label={`Câu ${x.label}${a ? ', đã trả lời' : ''}`}
                className={cls('h-10 w-10 rounded-full border-2 text-sm font-bold', i === draft.index ? 'border-primary bg-primary text-onprimary' : a ? 'border-primary/60 bg-primary/10' : 'border-line')}>
                {x.label}
              </button>
            );
          })}
        </nav>
        <p className="mt-3 text-sm text-muted">Bài tập về nhà không báo đúng/sai từng câu – nộp xong mới có kết quả. Đáp án trắc nghiệm được xáo trộn mỗi lần làm.</p>
        {answered === visible.length && posInVisible < visible.length - 1 && (
          <button className="btn-primary mt-4 w-full" onClick={submit}>📮 Đã làm hết – Nộp bài</button>
        )}
      </div>
      {toast && <div role="status" className="pop fixed bottom-24 left-1/2 z-50 -translate-x-1/2 rounded-full bg-ink px-5 py-3 font-semibold text-bg md:bottom-8">{toast}</div>}
      <PrintSheet noPinyin={noPinyin} items={items} levelId={levelId} title={lesson.title.zh} />
    </div>
  );
}

/** Trang in: có chỗ trống để viết tay; đáp án in ở trang riêng */
function PrintSheet({ items, levelId, title, noPinyin = false }: { items: FlatQ[]; levelId: string; title: string; noPinyin?: boolean }) {
  const sections = Array.from(new Set(items.map((x) => x.secIdx)));
  return (
    <div className="print-only text-black">
      <h1 className="text-2xl font-bold">Bài tập về nhà – <span className="han">{title}</span></h1>
      <p className="mb-4">Họ tên: ............................................ Ngày: ......................</p>
      {sections.map((si) => {
        const group = items.filter((x) => x.secIdx === si);
        const sec = group[0].section;
        return (
          <section key={si} className="mb-5" style={{ breakInside: 'avoid-page' }}>
            <h2 className="text-lg font-bold">{sec.part} · {sec.title_vi}</h2>
            {sec.instructions_vi && <p className="text-sm">{sec.instructions_vi}</p>}
            {sec.passage?.zh && <div className="my-2 border p-2"><ZhText text={sec.passage.zh} levelId={levelId} pinyin={noPinyin ? 'hidden' : 'always'} /></div>}
            {sec.type === 'listening' && <p className="text-sm italic">(Phần nghe: mở bài trên website để nghe file ghi âm.)</p>}
            {group.map(({ q, label }) => (
              <div key={q.id} className="my-3" style={{ breakInside: 'avoid' }}>
                {q.kind === 'mcq' && (<><p>{label}. {q.prompt_zh ?? q.prompt_vi}</p><p className="han">{q.options.map((o, i) => `☐ ${String.fromCharCode(65 + i)}. ${o}`).join('　　')}</p></>)}
                {q.kind === 'truefalse' && <p>{label}. <span className="han">{q.statement_zh}</span> {q.statement_vi && `(${q.statement_vi})`}　☐ Đúng　☐ Sai</p>}
                {q.kind === 'match' && (
                  <div>
                    <p>{label}. Nối mỗi câu bên trái với một câu bên phải:</p>
                    <div className="han grid grid-cols-2 gap-x-8">
                      <div>{q.pairs.map((p, i) => <p key={i}>{i + 1}. {p.q} ____</p>)}</div>
                      <div>{q.pairs.map((_, i) => <p key={i}>{String.fromCharCode(65 + i)}. {q.pairs[(i + 1) % q.pairs.length].a}</p>)}</div>
                    </div>
                  </div>
                )}
                {q.kind === 'cloze' && (<><p>{label}. Từ: <span className="han">{q.bank.join('　')}</span></p><p className="han whitespace-pre-line">{q.text.replace(/\{\{(\d+)\}\}/g, '($1)______')}</p></>)}
                {q.kind === 'reorder' && (<><p>{label}. {q.vi} — <span className="han">{q.tiles.join(' / ')}</span></p><div className="write-line" /></>)}
                {q.kind === 'translate' && (<><p>{label}. {q.prompt_vi}</p><div className="write-line" /><div className="write-line" /></>)}
                {q.kind === 'charFill' && <p className="han">{label}. {q.text.replace('___', `（${q.pinyin}）______`)}</p>}
                {q.kind === 'sentence' && (<><p>{label}. Nhìn tranh, đặt câu với từ <span className="han">{q.word}</span></p><div className="write-line" /></>)}
              </div>
            ))}
          </section>
        );
      })}
      <section className="print-page-break">
        <h2 className="text-xl font-bold">Đáp án</h2>
        <ol className="han mt-2 list-decimal pl-6">
          {items.map(({ q }) => (
            <li key={q.id}>
              {q.kind === 'match' ? q.pairs.map((_, i) => `${i + 1}-${String.fromCharCode(65 + ((i - 1 + q.pairs.length) % q.pairs.length))}`).join('  ') : correctText(q)}
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
