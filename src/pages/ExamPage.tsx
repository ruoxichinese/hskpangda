import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { PandaMascot } from '../components/panda/PandaMascot';
import { Confetti } from '../components/ui';
import { examImage, getExam, getLevel } from '../lib/data';
import { cls } from '../lib/util';
import { useProgress, type ExamResult, type ExamSession, type ExamStage } from '../store/ProgressStore';
import type { ExamOption, ExamPart, ExamQuestion, ExamSection } from '../types';
import { NotFound } from './NotFound';
import { grade } from '../lib/examGrade';
import { friendlyError, supabase } from '../lib/cloud';
import { useCloud } from '../store/CloudSync';

// Chỉ có ở bản demo 1 file (không có máy chủ): mã này mở được đề để xem thử
const DEMO_CODE = (import.meta.env.VITE_EXAM_DEMO_CODE as string | undefined) || '';
import { inlinedAudio } from '../lib/examAudio';

const audioSrc = (path: string) => {
  const k = Object.keys(inlinedAudio).find((x) => x.endsWith(path));
  return k ? inlinedAudio[k] : import.meta.env.BASE_URL + path;
};

/**
 * Phòng thi thử mô phỏng thi trên máy:
 *  - Nghe: file nghe tự phát MỘT lần, không dừng/tua/nghe lại; câu hỏi tự chuyển theo tiếng đọc.
 *    Tải lại trang thì phát tiếp từ thời điểm đáng lẽ đang tới (không nghe lại đoạn đã qua).
 *  - Sau phần Nghe có thời gian kiểm tra lại đáp án; Đọc, Viết có đồng hồ đếm ngược; hết giờ tự chuyển phần.
 *  - Không pinyin, không bản dịch, không gợi ý; nộp bài xong mới có điểm.
 */

interface Item { q: ExamQuestion; part: ExamPart; section: ExamSection }
const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];
const fmt = (s: number) => `${Math.floor(Math.max(0, s) / 60)}:${String(Math.floor(Math.max(0, s) % 60)).padStart(2, '0')}`;

function Clock({ time }: { time: string }) {
  const [h, m] = time.split(':').map(Number);
  const ha = ((h % 12) + m / 60) * 30;
  const ma = m * 6;
  return (
    <svg viewBox="0 0 100 100" width="96" height="96" role="img" aria-label={`Đồng hồ chỉ ${time}`}>
      <circle cx="50" cy="50" r="44" fill="#FFFFFF" stroke="#2B2730" strokeWidth="4" />
      {Array.from({ length: 12 }, (_, i) => (
        <line key={i} x1="50" y1="10" x2="50" y2={i % 3 ? 15 : 18} stroke="#2B2730" strokeWidth={i % 3 ? 2 : 3.5} transform={`rotate(${i * 30} 50 50)`} />
      ))}
      <line x1="50" y1="50" x2="50" y2="28" stroke="#2B2730" strokeWidth="5" strokeLinecap="round" transform={`rotate(${ha} 50 50)`} />
      <line x1="50" y1="50" x2="50" y2="17" stroke="#2B2730" strokeWidth="3" strokeLinecap="round" transform={`rotate(${ma} 50 50)`} />
      <circle cx="50" cy="50" r="4" fill="#2B2730" />
    </svg>
  );
}

function Pic({ o, level, size = 'lg' }: { o: ExamOption; level: string; size?: 'lg' | 'sm' }) {
  if (o.img) {
    const src = examImage(level, o.img);
    return src ? <img src={src} alt="" className={cls('w-full rounded-xl bg-white object-contain', size === 'lg' ? 'h-32 sm:h-40' : 'h-24 sm:h-28')} draggable={false} /> : <span className="text-sm text-bad">Thiếu ảnh {o.img}</span>;
  }
  return o.clock ? <Clock time={o.clock} /> : <span className="text-6xl leading-none sm:text-7xl" aria-hidden>{o.emoji}</span>;
}

/** Chọn đáp án bằng chữ cái (giống phiếu trả lời trên máy) */
function LetterPicker({ keys, value, onPick, disabled, correct }: { keys: string[]; value?: string; onPick: (k: string) => void; disabled?: boolean; correct?: string }) {
  return (
    <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Chọn đáp án">
      {keys.map((k) => (
        <button
          key={k}
          role="radio"
          aria-checked={value === k}
          disabled={disabled}
          onClick={() => onPick(k)}
          className={cls('h-12 w-12 rounded-full border-[2.5px] border-outline bg-card font-display text-lg font-bold disabled:cursor-default',
            value === k && 'bg-primary text-onprimary', correct === k && 'ring-4 ring-good/60')}
        >
          {k}
        </button>
      ))}
    </div>
  );
}

function QuestionView({ item, value, onAnswer, disabled, showAnswer, isExample, level }: {
  item: { q: Omit<ExamQuestion, 'id'> & { id?: string }; part: ExamPart }; value?: string; onAnswer: (v: string) => void; disabled?: boolean; showAnswer?: boolean; isExample?: boolean; level: string;
}) {
  const { q, part } = item;
  const correct = showAnswer ? q.answer : undefined;
  const num = isExample ? 'Ví dụ' : `Câu ${q.id}`;

  if (q.kind === 'pic3') {
    return (
      <div>
        <p className="mb-3 font-display text-lg font-bold">{num}</p>
        <div className="grid grid-cols-3 gap-3" role="radiogroup">
          {(q.options as ExamOption[]).map((o, i) => (
            <button key={i} role="radio" aria-checked={value === LETTERS[i]} disabled={disabled} onClick={() => onAnswer(LETTERS[i])}
              className={cls('opt flex flex-col items-center gap-2 !py-4 disabled:cursor-default', value === LETTERS[i] && 'opt-on', correct === LETTERS[i] && '!border-good ring-4 ring-good/40')}>
              <Pic o={o} level={level} />
              <span className="font-display text-lg font-bold">{LETTERS[i]}</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (q.kind === 'text3') {
    return (
      <div className="space-y-3">
        <p className="font-display text-lg font-bold">{num}</p>
        {q.text && <p className="font-han text-xl leading-relaxed" lang="zh-CN">{q.text}</p>}
        {q.question && <p className="font-han text-lg font-semibold" lang="zh-CN">{q.question}</p>}
        <div className="grid gap-2 sm:grid-cols-3" role="radiogroup">
          {(q.options as string[]).map((o, i) => (
            <button key={i} role="radio" aria-checked={value === LETTERS[i]} disabled={disabled} onClick={() => onAnswer(LETTERS[i])}
              className={cls('opt flex items-center gap-3 disabled:cursor-default', value === LETTERS[i] && 'opt-on', correct === LETTERS[i] && '!border-good ring-4 ring-good/40')}>
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-outline font-bold">{LETTERS[i]}</span>
              <span className="font-han text-xl" lang="zh-CN">{o}</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (q.kind === 'bank') {
    return (
      <div className="space-y-3">
        <p className="font-display text-lg font-bold">{num}</p>
        {q.text && <p className="whitespace-pre-line font-han text-xl leading-relaxed" lang="zh-CN">{q.text}</p>}
        <LetterPicker keys={(part.bank ?? []).map((b) => b.key)} value={value} onPick={onAnswer} disabled={disabled} correct={correct} />
      </div>
    );
  }

  if (q.kind === 'component') {
    const chars = [...(q.word ?? '')];
    return (
      <div className="space-y-3">
        <p className="font-display text-lg font-bold">{num}</p>
        <div className="inline-flex flex-col items-center gap-1">
          <span className="text-sm font-semibold text-muted">{q.pinyin}</span>
          <div className="flex">
            {chars.map((c, i) => (
              <span key={i} className="tianzi flex h-16 w-16 items-center justify-center font-han text-4xl" lang="zh-CN">
                {i === q.slot ? (
                  <span className="flex items-center"><span className="text-2xl text-muted">?</span><span>{q.visible}</span></span>
                ) : c}
              </span>
            ))}
          </div>
        </div>
        <LetterPicker keys={(part.bank ?? []).map((b) => b.key)} value={value} onPick={onAnswer} disabled={disabled} correct={correct} />
      </div>
    );
  }

  // fillChar: “……（pinyin）……”
  const m = (q.text ?? '').match(/^(.*)（([^）]+)）(.*)$/);
  return (
    <div className="space-y-3">
      <p className="font-display text-lg font-bold">{num}</p>
      <p className="flex flex-wrap items-end gap-1 font-han text-xl leading-loose" lang="zh-CN">
        <span>{m?.[1]}</span>
        <span className="inline-flex flex-col items-center">
          <span className="font-sans text-sm font-semibold text-muted">{m?.[2]}</span>
          <input
            aria-label={`Chữ Hán cho ${m?.[2]}`}
            lang="zh-CN"
            value={value ?? ''}
            disabled={disabled}
            maxLength={2}
            onChange={(e) => onAnswer(e.target.value.trim())}
            className={cls('tianzi h-14 w-14 rounded-lg bg-card text-center font-han text-3xl focus:outline-none', correct && (value === correct ? '!border-good' : '!border-bad'))}
          />
        </span>
        <span>{m?.[3]}</span>
      </p>
      {correct && value !== correct && <p className="font-semibold text-good">Đáp án: <span className="font-han text-xl">{correct}</span></p>}
    </div>
  );
}

function BankStrip({ part, level }: { part: ExamPart; level: string }) {
  if (!part.bank) return null;
  const pics = part.bank.some((b) => b.emoji || b.img);
  return (
    <div className={cls('grid gap-2', pics ? 'grid-cols-3 sm:grid-cols-6' : 'grid-cols-1 sm:grid-cols-2')}>
      {part.bank.map((b) => (
        <div key={b.key} className={cls('flex items-center gap-3 rounded-2xl border-2 border-outline/70 bg-card p-2', pics && 'flex-col')}>
          <span className="font-display text-lg font-bold">{b.key}</span>
          {b.img ? <Pic o={{ img: b.img }} level={level} size="sm" /> : b.emoji ? <span className="text-5xl leading-none" aria-hidden>{b.emoji}</span> : <span className="font-han text-xl" lang="zh-CN">{b.text}</span>}
        </div>
      ))}
    </div>
  );
}

export default function ExamPage() {
  const { level: levelId = 'hsk2', examId = '' } = useParams();
  const exam = getExam(levelId, examId);
  const lv = getLevel(levelId);
  const { level, updateLevel, addXP, touch } = useProgress();
  const ep = level(levelId).exams?.[examId];
  const session = ep?.session;
  const [now, setNow] = useState(Date.now());
  const [idx, setIdx] = useState(0);
  const [audioT, setAudioT] = useState(0);
  const [duration, setDuration] = useState(0);
  const [needsResume, setNeedsResume] = useState(false);
  const [audioError, setAudioError] = useState(false);
  const [confirmNext, setConfirmNext] = useState(false);
  const [result, setResult] = useState<ExamResult | null>(null);
  const [fire, setFire] = useState(0);
  const [beep, setBeep] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const cloud = useCloud();
  const [code, setCode] = useState('');
  const [codeMsg, setCodeMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [submitState, setSubmitState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [showAns, setShowAns] = useState(true);
  const startNow = useRef(false);

  const items = useMemo<Item[]>(() => (exam ? exam.sections.flatMap((section) => section.parts.flatMap((part) => part.questions.map((q) => ({ q, part, section })))) : []), [exam]);

  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 500); return () => clearInterval(t); }, []);

  const save = useCallback((fn: (s: ExamSession) => ExamSession | undefined) => {
    updateLevel(levelId, (p) => {
      p.exams ??= {};
      const e = (p.exams[examId] ??= { best: 0, attempts: 0, history: [] });
      if (!e.session) return;
      const n = fn(e.session);
      if (n) e.session = n; else delete e.session;
    });
  }, [levelId, examId, updateLevel]);

  const setStage = useCallback((stage: ExamStage) => {
    save((s) => ({ ...s, stage, stageStartedAt: Date.now() }));
    setConfirmNext(false);
    const first = items.findIndex((it) => it.section.id === (stage === 'review' ? 'listening' : stage));
    setIdx(Math.max(0, first));
  }, [save, items]);

  const finish = useCallback(() => {
    if (!exam || !session) return;
    const r = grade(exam, session.answers);
    updateLevel(levelId, (p) => {
      p.exams ??= {};
      const e = (p.exams[examId] ??= { best: 0, attempts: 0, history: [] });
      e.attempts += 1;
      e.best = Math.max(e.best, r.total);
      e.history = [...e.history, r].slice(-20);
      delete e.session;
    });
    addXP(Math.round(r.total / 3) + (r.passed ? 100 : 0));
    touch(levelId);
    if (r.passed) setFire((f) => f + 1);
    setShowAns(session.showAnswers ?? true);
    setResult(r);
    window.scrollTo({ top: 0 });
    if (session.attemptId) {
      const pending = { attemptId: session.attemptId, answers: session.answers, total: r.total, showAnswers: session.showAnswers ?? true };
      updateLevel(levelId, (p) => { p.exams![examId].pending = pending; });
      void sendPending(pending);
    }
  }, [exam, session, levelId, examId, updateLevel, addXP, touch]); // eslint-disable-line react-hooks/exhaustive-deps

  /** Gửi bài lên máy chủ; lỗi mạng thì giữ lại để gửi lại */
  const sendPending = useCallback(async (pd: { attemptId: string; answers: Record<string, string>; total: number }) => {
    if (!supabase) return;
    setSubmitState('sending');
    const { error } = await supabase.rpc('submit_exam', { p_attempt: pd.attemptId, p_answers: pd.answers, p_total: pd.total });
    if (error) { setSubmitState('error'); setCodeMsg(friendlyError(error)); return; }
    updateLevel(levelId, (p) => { if (p.exams?.[examId]) delete p.exams[examId].pending; });
    setSubmitState('sent');
  }, [levelId, examId, updateLevel]);

  // ===== Nghe: phát một lần, theo đồng hồ thật =====
  const stage = session?.stage;
  useEffect(() => {
    const a = audioRef.current;
    if (!a || stage !== 'listening' || !session) return;
    const sync = () => {
      const elapsed = (Date.now() - session.stageStartedAt) / 1000;
      if (a.duration && elapsed >= a.duration) { setStage('review'); return; }
      a.currentTime = Math.max(0, elapsed);
      a.play().then(() => setNeedsResume(false)).catch(() => setNeedsResume(true));
    };
    if (startNow.current) { startNow.current = false; a.play().catch(() => setNeedsResume(true)); }
    else if (a.paused) { a.readyState >= 1 ? sync() : a.addEventListener('loadedmetadata', sync, { once: true }); }
    const onPause = () => { if (!a.ended) setNeedsResume(true); };
    a.addEventListener('pause', onPause);
    return () => a.removeEventListener('pause', onPause);
  }, [stage, session, setStage]);

  const resumeAudio = () => {
    const a = audioRef.current;
    if (!a || !session) return;
    const elapsed = (Date.now() - session.stageStartedAt) / 1000;
    if (a.duration && elapsed >= a.duration) { setStage('review'); return; }
    a.currentTime = elapsed;
    a.play().then(() => setNeedsResume(false)).catch(() => setNeedsResume(true));
  };

  // hết giờ → tự chuyển phần
  const limit = stage === 'review' ? exam?.listeningReviewSeconds : stage === 'reading' || stage === 'writing' ? exam?.sections.find((s) => s.id === stage)?.seconds : undefined;
  const remaining = limit && session ? limit - (now - session.stageStartedAt) / 1000 : null;
  useEffect(() => {
    if (remaining === null || remaining > 0 || !stage) return;
    if (stage === 'review') setStage('reading');
    else if (stage === 'reading') setStage('writing');
    else if (stage === 'writing') finish();
  }, [remaining, stage, setStage, finish]);

  // rời trang khi đang thi → cảnh báo
  useEffect(() => {
    if (!session) return;
    const h = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', h);
    return () => window.removeEventListener('beforeunload', h);
  }, [session]);

  if (!exam || !lv) return <NotFound />;

  // ===== Màn hình kết quả =====
  if (result) {
    const passScore = (result.max * exam.passPercent) / 100;
    return (
      <div className="mx-auto max-w-4xl space-y-5 p-4">
        <Confetti fire={fire} />
        <section className="card flex flex-col items-center gap-3 text-center sm:flex-row sm:text-left">
          <PandaMascot mood={result.passed ? 'celebrate' : 'cheer'} size={120} stage={lv.pandaStage} />
          <div className="flex-1">
            <p className="text-sm font-bold text-muted">{exam.title}</p>
            <p className="font-display text-5xl font-bold">{result.total}<span className="text-2xl text-muted">/{result.max}</span></p>
            <p className={cls('mt-1 text-lg font-bold', result.passed ? 'text-good' : 'text-bad')}>{result.passed ? `ĐẠT – cần ${passScore} điểm` : `CHƯA ĐẠT – cần ${passScore} điểm`}</p>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            {exam.sections.map((s) => (
              <div key={s.id} className="rounded-2xl border-2 border-outline bg-card px-3 py-2">
                <p className="text-xs font-bold text-muted">{s.title_vi}</p>
                <p className="font-display text-2xl font-bold">{result.sections[s.id].score}</p>
                <p className="text-xs text-muted">{result.sections[s.id].correct}/{result.sections[s.id].count} câu</p>
              </div>
            ))}
          </div>
        </section>
        {submitState !== 'idle' && (
          <p role="status" className={cls('card font-bold', submitState === 'sent' ? 'text-good' : submitState === 'error' ? 'text-bad' : '')}>
            {submitState === 'sending' && '⏳ Đang gửi bài cho giáo viên…'}
            {submitState === 'sent' && '✅ Đã gửi bài cho giáo viên.'}
            {submitState === 'error' && <>⚠️ Chưa gửi được bài: {codeMsg} <button className="btn-ghost ml-2" onClick={() => ep?.pending && sendPending(ep.pending)}>Gửi lại</button></>}
          </p>
        )}
        <div className="flex flex-wrap gap-2">
          {!exam.requireCode && <button className="btn-primary" onClick={() => setResult(null)}>Làm lại đề này</button>}
          <Link to={`/hsk/${levelId}`} className="btn-ghost">Về lộ trình</Link>
        </div>
        {!showAns && <p className="card text-muted">Giáo viên chưa mở đáp án cho đợt thi này.</p>}
        {showAns && exam.sections.map((s) => (
          <section key={s.id} className="card space-y-4">
            <h2 className="font-display text-xl font-bold">{s.title_zh} · {s.title_vi}</h2>
            {s.parts.map((p, pi) => (
              <div key={pi} className="space-y-3">
                <p className="font-bold text-muted">{p.title_zh} · {p.title_vi}</p>
                <BankStrip part={p} level={levelId} />
                {p.questions.map((q) => {
                  const ok = (result.answers[q.id] ?? '') === q.answer;
                  return (
                    <div key={q.id} className={cls('rounded-2xl border-2 p-3', ok ? 'border-good/60' : 'border-bad/60')}>
                      <QuestionView item={{ q, part: p }} value={result.answers[q.id]} onAnswer={() => {}} disabled showAnswer level={levelId} />
                      <p className={cls('mt-2 text-sm font-bold', ok ? 'text-good' : 'text-bad')}>
                        {ok ? '✓ Đúng' : `✗ Bạn chọn: ${result.answers[q.id] || '(bỏ trống)'} · Đáp án: ${q.answer}`}
                      </p>
                    </div>
                  );
                })}
              </div>
            ))}
          </section>
        ))}
      </div>
    );
  }

  // ===== Bài đã làm xong nhưng chưa gửi được =====
  if (!session && ep?.pending) {
    return (
      <div className="mx-auto max-w-xl p-4">
        <section className="card space-y-3 text-center">
          <PandaMascot mood="think" size={100} stage={lv.pandaStage} />
          <p className="font-bold">Bài thi của bạn đã làm xong ({ep.pending.total} điểm) nhưng chưa gửi được cho giáo viên.</p>
          {codeMsg && <p className="text-bad">{codeMsg}</p>}
          <button className="btn-primary" disabled={submitState === 'sending'} onClick={() => sendPending(ep.pending!)}>{submitState === 'sending' ? 'Đang gửi…' : 'Gửi bài'}</button>
          {submitState === 'sent' && <p className="font-bold text-good">✅ Đã gửi bài.</p>}
        </section>
      </div>
    );
  }

  // ===== Màn hình bắt đầu =====
  if (!session) {
    const listeningCount = exam.sections[0].parts.reduce((n, p) => n + p.questions.length, 0);
    const begin = (extra: Partial<ExamSession> = {}) => {
      startNow.current = true;
      updateLevel(levelId, (p) => {
        p.exams ??= {};
        const e = (p.exams[examId] ??= { best: 0, attempts: 0, history: [] });
        e.session = { startedAt: Date.now(), stage: 'listening', stageStartedAt: Date.now(), answers: {}, flags: [], ...extra };
      });
      setIdx(0);
    };
    const start = async () => {
      if (!exam.requireCode) return begin();
      setCodeMsg(null);
      const c = code.trim().toUpperCase();
      if (!supabase) {
        if (DEMO_CODE && c === DEMO_CODE) return begin({ showAnswers: true });
        setCodeMsg('Mã thi không đúng.');
        return;
      }
      setBusy(true);
      const { data, error } = await supabase.rpc('start_exam', { p_code: c });
      setBusy(false);
      if (error) { setCodeMsg(friendlyError(error)); return; }
      const d = data as { attempt_id: string; level: string; exam_id: string; closes_at: string; show_answers: boolean };
      if (d.level !== levelId || d.exam_id !== examId) { setCodeMsg('Mã này dành cho một đề thi khác.'); return; }
      begin({ attemptId: d.attempt_id, closesAt: d.closes_at, showAnswers: d.show_answers });
    };
    const needLogin = exam.requireCode && cloud.configured && !cloud.session;
    const noServer = exam.requireCode && !cloud.configured && !DEMO_CODE;
    const testSound = () => {
      try {
        const ctx = new AudioContext();
        const o = ctx.createOscillator();
        o.frequency.value = 660;
        o.connect(ctx.destination);
        o.start();
        o.stop(ctx.currentTime + 0.4);
        setBeep(true);
      } catch { setBeep(true); }
    };
    return (
      <div className="mx-auto max-w-3xl space-y-5 p-4">
        <Link to={`/hsk/${levelId}`} className="text-sm font-semibold text-muted hover:underline">← {lv.name}</Link>
        <section className="card space-y-4">
          <div className="flex items-center gap-3">
            <PandaMascot mood="explain" size={90} stage={lv.pandaStage} />
            <div>
              <p className="font-hanfun text-3xl" lang="zh-CN">中文水平考试 · 二级</p>
              <h1 className="font-display text-2xl font-bold">{exam.title}</h1>
            </div>
          </div>
          <table className="w-full text-left">
            <thead><tr className="text-sm text-muted"><th className="py-1">Phần</th><th>Số câu</th><th>Thời gian</th></tr></thead>
            <tbody>
              <tr className="border-t border-line"><td className="py-2 font-bold">听力 Nghe</td><td>{listeningCount}</td><td>khoảng {Math.round((duration || 1069) / 60)} phút + {Math.round(exam.listeningReviewSeconds / 60)} phút kiểm tra lại</td></tr>
              {exam.sections.slice(1).map((s) => (
                <tr key={s.id} className="border-t border-line"><td className="py-2 font-bold">{s.title_zh} {s.title_vi}</td><td>{s.parts.reduce((n, p) => n + p.questions.length, 0)}</td><td>{Math.round((s.seconds ?? 0) / 60)} phút</td></tr>
              ))}
            </tbody>
          </table>
          <ul className="list-disc space-y-1 pl-5 text-sm">
            <li><b>Phần Nghe chỉ phát một lần</b>, không dừng, không tua, không nghe lại. Câu hỏi tự chuyển theo tiếng đọc.</li>
            <li>Lỡ tải lại trang thì âm thanh <b>phát tiếp từ thời điểm hiện tại</b>, đoạn đã qua không phát lại.</li>
            <li>Đọc và Viết có đồng hồ đếm ngược. Hết giờ, bài tự chuyển phần. Đã sang phần sau thì không quay lại được.</li>
            <li>Bài thi không có pinyin, không có bản dịch. Nộp bài xong mới có điểm.</li>
            <li>Đạt khi được từ {exam.passPercent}% tổng điểm ({(exam.sections.length * 100 * exam.passPercent) / 100}/{exam.sections.length * 100}).</li>
          </ul>
          <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-primary/10 p-3">
            <span className="text-2xl" aria-hidden>🎧</span>
            <span className="flex-1 text-sm">Đeo tai nghe hoặc bật loa, rồi bấm thử âm thanh.</span>
            <button className="btn-ghost" onClick={testSound}>{beep ? '✓ Đã nghe thấy' : 'Thử âm thanh'}</button>
          </div>
          {exam.audioNote && <p className="text-xs text-muted">{exam.audioNote}</p>}
          {exam.requireCode && (
            <div className="space-y-2 rounded-2xl border-2 border-outline p-3">
              <p className="font-bold">🔑 Đề thi này cần mã của giáo viên</p>
              {needLogin ? (
                <p className="text-sm">Hãy <Link to="/tai-khoan" className="font-semibold text-accent underline">đăng nhập</Link> và vào lớp trước, rồi quay lại nhập mã thi.</p>
              ) : noServer ? (
                <p className="text-sm text-muted">Website chưa bật đăng nhập nên chưa dùng được mã thi. Người quản trị cần cài Supabase (xem README).</p>
              ) : (
                <form className="flex flex-wrap gap-2" onSubmit={(e) => { e.preventDefault(); void start(); }}>
                  <label className="sr-only" htmlFor="exam-code">Mã thi</label>
                  <input id="exam-code" value={code} onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))} maxLength={6} autoComplete="off" placeholder="Mã thi (6 ký tự)"
                    className="w-48 rounded-xl border-2 border-line bg-card px-3 py-2 font-mono text-lg font-bold tracking-widest focus:border-primary focus:outline-none" />
                  <span className="text-xs text-muted self-center">{DEMO_CODE && !cloud.configured ? `Bản demo: dùng mã ${DEMO_CODE}` : 'Giáo viên gửi mã vào giờ thi.'}</span>
                </form>
              )}
              {codeMsg && <p role="alert" className="font-semibold text-bad">{codeMsg}</p>}
            </div>
          )}
          <button className="btn-primary w-full" disabled={busy || needLogin || noServer || (exam.requireCode && code.length !== 6)} onClick={() => void start()}>{busy ? 'Đang kiểm tra mã…' : 'Bắt đầu làm bài'}</button>
          {ep && ep.attempts > 0 && <p className="text-center text-sm text-muted">Điểm cao nhất của bạn: <b>{ep.best}</b> · đã thi {ep.attempts} lần</p>}
        </section>
      </div>
    );
  }

  // ===== Đang thi =====
  const sectionId = stage === 'review' ? 'listening' : stage!;
  const section = exam.sections.find((s) => s.id === sectionId)!;
  const secItems = items.filter((it) => it.section.id === sectionId);
  const listeningLive = stage === 'listening';
  // phần Nghe: câu hiện tại theo thời điểm trong file nghe
  let liveIdx = -1;
  let livePart: ExamPart | undefined;
  if (listeningLive) {
    section.parts.forEach((p) => { if ((p.start ?? 0) <= audioT) livePart = p; });
    secItems.forEach((it, i) => { if ((it.q.start ?? 0) <= audioT) liveIdx = i; });
    if (livePart && liveIdx >= 0 && secItems[liveIdx].part !== livePart) liveIdx = -1; // đang đọc hướng dẫn/ví dụ của phần mới
  }
  const curLocal = listeningLive ? liveIdx : Math.max(0, secItems.findIndex((it) => it === items[idx]));
  const cur = curLocal >= 0 ? secItems[curLocal] : undefined;
  const answers = session.answers;
  const answered = secItems.filter((it) => answers[it.q.id]).length;
  const setAnswer = (id: string, v: string) => save((s) => ({ ...s, answers: { ...s.answers, [id]: v } }));
  const toggleFlag = (id: string) => save((s) => ({ ...s, flags: s.flags.includes(id) ? s.flags.filter((x) => x !== id) : [...s.flags, id] }));
  const go = (local: number) => { const it = secItems[local]; if (it) setIdx(items.indexOf(it)); };
  const nextLabel = stage === 'review' ? 'Sang phần Đọc' : stage === 'reading' ? 'Nộp phần Đọc, sang phần Viết' : 'Nộp bài';
  const onNextStage = () => {
    if (!confirmNext) { setConfirmNext(true); return; }
    if (stage === 'review') setStage('reading');
    else if (stage === 'reading') setStage('writing');
    else finish();
  };

  return (
    <div className="flex min-h-screen flex-col bg-bg">
      <audio
        ref={audioRef}
        src={audioSrc(exam.audio)}
        preload="auto"
        onTimeUpdate={(e) => setAudioT(e.currentTarget.currentTime)}
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
        onEnded={() => setStage('review')}
        onError={() => setAudioError(true)}
        aria-hidden="true"
      />
      <header className="sticky top-0 z-30 flex flex-wrap items-center gap-3 border-b-[2.5px] border-outline bg-ink px-4 py-3 text-bg" style={{ paddingTop: 'calc(0.75rem + env(safe-area-inset-top, 0px))' }}>
        <span className="font-hanfun text-xl" lang="zh-CN">{section.title_zh}</span>
        <span className="font-bold">{section.title_vi}{stage === 'review' ? ' · Kiểm tra lại đáp án' : ''}</span>
        <span className="ml-auto text-sm">Đã làm {answered}/{secItems.length}</span>
        {listeningLive ? (
          <span className="flex items-center gap-2 rounded-full bg-bg/15 px-3 py-1 font-bold" aria-live="off">
            <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-bad" aria-hidden /> Đang phát {fmt(audioT)} / {fmt(duration)}
          </span>
        ) : (
          <span className={cls('rounded-full px-3 py-1 font-display text-lg font-bold', remaining !== null && remaining < 60 ? 'bg-bad text-white' : 'bg-bg/15')} role="timer" aria-label="Thời gian còn lại">⏱ {fmt(remaining ?? 0)}</span>
        )}
      </header>
      {session.closesAt && new Date(session.closesAt).getTime() - now < 15 * 60000 && (
        <p role="alert" className="bg-bad px-4 py-1 text-center text-sm font-bold text-white">Đợt thi đóng lúc {new Date(session.closesAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}. Nộp bài trước giờ đóng + 15 phút.</p>
      )}
      {listeningLive && duration > 0 && (
        <div className="h-1.5 w-full bg-line" aria-hidden><div className="h-full bg-primary" style={{ width: `${(audioT / duration) * 100}%` }} /></div>
      )}

      <main className="mx-auto w-full max-w-4xl flex-1 space-y-4 p-4">
        {listeningLive && needsResume && !audioError && (
          <div className="card flex flex-col items-center gap-3 text-center">
            <p className="font-bold">Âm thanh đang tạm dừng. Bấm để phát tiếp từ thời điểm hiện tại (đoạn đã qua không phát lại).</p>
            <button className="btn-primary" onClick={resumeAudio}>▶ Phát tiếp</button>
          </div>
        )}
        {listeningLive && audioError && (
          <div className="card space-y-2 text-center">
            <p className="font-bold text-bad">Không tải được file nghe.</p>
            <p className="text-sm text-muted">Kiểm tra file <code>public/{exam.audio}</code> đã được tải lên chưa. Có thể chuyển sang phần kiểm tra lại để làm tiếp.</p>
            <button className="btn-ghost" onClick={() => setStage('review')}>Bỏ qua phần Nghe</button>
          </div>
        )}

        {(cur?.part ?? livePart) && (
          <section className="card space-y-3">
            <p className="font-display font-bold">{(cur?.part ?? livePart)!.title_zh} · {(cur?.part ?? livePart)!.title_vi}</p>
            <p className="text-sm text-muted">{(cur?.part ?? livePart)!.instructions_vi}</p>
            <BankStrip part={(cur?.part ?? livePart)!} level={levelId} />
          </section>
        )}

        {cur ? (
          <section className="card" aria-live="polite">
            <QuestionView item={cur} value={answers[cur.q.id]} onAnswer={(v) => setAnswer(cur.q.id, v)} level={levelId} />
            {!listeningLive && (
              <button className={cls('chip mt-4', session.flags.includes(cur.q.id) && 'chip-on')} onClick={() => toggleFlag(cur.q.id)} aria-pressed={session.flags.includes(cur.q.id)}>
                🚩 {session.flags.includes(cur.q.id) ? 'Đã đánh dấu xem lại' : 'Đánh dấu xem lại'}
              </button>
            )}
          </section>
        ) : livePart?.example ? (
          <section className="card opacity-90">
            <QuestionView item={{ q: livePart.example, part: livePart }} value={livePart.example.answer} onAnswer={() => {}} disabled isExample level={levelId} />
            <p className="mt-2 text-sm text-muted">Đây là ví dụ, đáp án đã được chọn sẵn. Câu hỏi sẽ tự hiện khi bắt đầu.</p>
          </section>
        ) : (
          <section className="card text-center text-muted">Đang nghe hướng dẫn… Câu hỏi sẽ tự hiện.</section>
        )}

        {!listeningLive && (
          <div className="flex justify-between gap-2">
            <button className="btn-ghost" disabled={curLocal <= 0} onClick={() => go(curLocal - 1)}>← Câu trước</button>
            <button className="btn-ghost" disabled={curLocal >= secItems.length - 1} onClick={() => go(curLocal + 1)}>Câu sau →</button>
          </div>
        )}

        <nav aria-label="Danh sách câu" className="card">
          <div className="flex flex-wrap gap-1.5">
            {secItems.map((it, i) => (
              <button
                key={it.q.id}
                disabled={listeningLive}
                onClick={() => go(i)}
                aria-label={`Câu ${it.q.id}${answers[it.q.id] ? ', đã trả lời' : ''}${session.flags.includes(it.q.id) ? ', đã đánh dấu' : ''}`}
                aria-current={i === curLocal ? 'true' : undefined}
                className={cls('relative h-10 w-10 rounded-lg border-2 text-sm font-bold disabled:cursor-default',
                  i === curLocal ? 'border-outline bg-primary text-onprimary' : answers[it.q.id] ? 'border-outline bg-primary/25' : 'border-line bg-card')}
              >
                {it.q.id}
                {session.flags.includes(it.q.id) && <span className="absolute -right-1 -top-1 text-xs" aria-hidden>🚩</span>}
              </button>
            ))}
          </div>
          {!listeningLive && (
            <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
              {confirmNext && answered < secItems.length && <span className="text-sm font-semibold text-bad">Còn {secItems.length - answered} câu chưa làm.</span>}
              <button className="btn-primary" onClick={onNextStage}>{confirmNext ? `Xác nhận: ${nextLabel}` : nextLabel}</button>
            </div>
          )}
        </nav>
      </main>
    </div>
  );
}
