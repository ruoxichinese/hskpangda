import { useEffect, useMemo, useRef, useState } from 'react';
import { speak, stopAll } from '../../lib/audio';
import { getDict, segment, splitSyllables, stripTones, toneOf } from '../../lib/dict';
import { gradeReorder } from '../../lib/grading';
import { cls, isHan, permutation, shuffle } from '../../lib/util';
import type { PinyinMode, VocabItem } from '../../types';
import { HanziBox } from '../HanziBox';
import { ReorderQuestion } from '../questions/ReorderQuestion';
import { ProgressBar, SpeakButton } from '../ui';

export interface GameProps { words: VocabItem[]; lines: string[]; levelId: string; speed: number; pinyin: PinyinMode; onFinish: (score: number, extra?: { perfect?: boolean }) => void }

function useCountdown(seconds: number, running: boolean, onEnd: () => void) {
  const [left, setLeft] = useState(seconds);
  const endRef = useRef(onEnd);
  endRef.current = onEnd;
  useEffect(() => setLeft(seconds), [seconds]);
  useEffect(() => {
    if (!running) return;
    if (left <= 0) { endRef.current(); return; }
    const t = setTimeout(() => setLeft((l) => l - 1), 1000);
    return () => clearTimeout(t);
  }, [left, running]);
  return [left, setLeft] as const;
}

function Finished({ score, max, onFinish, note }: { score: number; max?: number; onFinish: () => void; note?: string }) {
  return (
    <div className="pop text-center">
      <p className="text-5xl font-extrabold">{score}{max ? <span className="text-2xl text-muted">/{max}</span> : ''}</p>
      <p className="mt-1 text-muted">{note ?? 'điểm'}</p>
      <button className="btn-primary mt-4" onClick={onFinish}>Lưu điểm & quay lại</button>
    </div>
  );
}

// ===== 1. Lật thẻ ghép cặp =====
export function MemoryGame({ words, onFinish }: GameProps) {
  const cards = useMemo(() => {
    const pick = shuffle(words.filter((w) => !w.proper)).slice(0, 6);
    return shuffle(pick.flatMap((w, i) => [{ key: `${i}z`, pair: i, text: w.zh, zh: true }, { key: `${i}v`, pair: i, text: w.vi.split(',')[0], zh: false }]));
  }, [words]);
  const [open, setOpen] = useState<number[]>([]);
  const [matched, setMatched] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);
  const pairs = cards.length / 2;
  const done = matched.length === pairs;
  const score = Math.max(10, 100 - Math.max(0, moves - pairs) * 6);

  const flip = (i: number) => {
    if (open.length === 2 || open.includes(i) || matched.includes(cards[i].pair)) return;
    const next = [...open, i];
    setOpen(next);
    if (cards[i].zh) void speak(cards[i].text, 0.8);
    if (next.length === 2) {
      setMoves((m) => m + 1);
      const [a, b] = next;
      if (cards[a].pair === cards[b].pair) { setMatched((m) => [...m, cards[a].pair]); setOpen([]); }
      else setTimeout(() => setOpen([]), 900);
    }
  };
  if (done) return <Finished score={score} onFinish={() => onFinish(score)} note={`${moves} lượt lật`} />;
  return (
    <div>
      <p className="mb-3 text-sm text-muted">Lật hai thẻ: một chữ Hán và nghĩa của nó. Lượt: {moves}</p>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
        {cards.map((c, i) => {
          const up = open.includes(i) || matched.includes(c.pair);
          return (
            <button
              key={c.key}
              onClick={() => flip(i)}
              aria-label={up ? c.text : `Thẻ úp số ${i + 1}`}
              className={cls('flex aspect-[4/3] items-center justify-center rounded-2xl border-2 p-2 text-center font-semibold', up ? 'border-primary bg-bg' : 'border-transparent text-3xl text-onprimary', matched.includes(c.pair) && 'border-good bg-good/10')}
              style={up ? undefined : { background: 'linear-gradient(135deg, rgb(var(--c-primary)), rgb(var(--c-secondary)))' }}
            >
              {up ? <span className={c.zh ? 'han text-2xl' : 'text-sm'}>{c.text}</span> : '🐼'}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ===== 2. Nghe nhanh chọn đúng =====
export function QuickListenGame({ words, speed, onFinish }: GameProps) {
  const pool = useMemo(() => shuffle(words).slice(0, Math.min(8, words.length)), [words]);
  const [round, setRound] = useState(0);
  const [score, setScore] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const target = pool[round];
  const options = useMemo(() => (target ? shuffle([target, ...shuffle(words.filter((w) => w.zh !== target.zh)).slice(0, 3)]) : []), [target, words]);
  const finished = round >= pool.length;
  const next = () => { setPicked(null); setRound((r) => r + 1); };
  const [left, setLeft] = useCountdown(8, !finished && !picked, () => { setPicked('__timeout'); setTimeout(next, 900); });

  useEffect(() => { if (target) { setLeft(8); void speak(target.zh, speed); } return () => stopAll(); }, [round]); // eslint-disable-line

  if (finished) return <Finished score={score} onFinish={() => onFinish(score)} />;
  const choose = (w: VocabItem) => {
    if (picked) return;
    setPicked(w.zh);
    if (w.zh === target.zh) setScore((s) => s + 10 + left);
    setTimeout(next, 900);
  };
  return (
    <div>
      <div className="mb-3 flex items-center gap-3">
        <SpeakButton text={target.zh} rate={speed} size="lg" label="Nghe lại" />
        <div className="flex-1"><ProgressBar value={left} max={8} label="Thời gian còn lại" /></div>
        <span className="font-bold">{score}đ</span>
      </div>
      <p className="mb-2 text-sm text-muted">Câu {round + 1}/{pool.length} – chọn từ bạn vừa nghe</p>
      <div className="grid grid-cols-2 gap-2">
        {options.map((w) => (
          <button key={w.zh} onClick={() => choose(w)} className={cls('opt han text-center text-3xl', picked && w.zh === target.zh && 'opt-good', picked === w.zh && w.zh !== target.zh && 'opt-bad')}>
            {w.zh}
          </button>
        ))}
      </div>
      {picked === '__timeout' && <p className="mt-2 font-semibold text-bad">Hết giờ! Đáp án: <span className="han">{target.zh}</span></p>}
    </div>
  );
}

// ===== 3. Bắt thanh điệu =====
export function ToneGame({ words, speed, onFinish }: GameProps) {
  const syllables = useMemo(() => {
    const out: { char: string; syl: string }[] = [];
    for (const w of words) {
      const chars = [...w.zh].filter(isHan);
      const syls = splitSyllables(w.pinyin.split('/')[0]);
      if (chars.length === syls.length) chars.forEach((c, i) => out.push({ char: c, syl: syls[i] }));
    }
    const uniq = Array.from(new Map(out.map((x) => [x.char + x.syl, x])).values());
    return shuffle(uniq).slice(0, 10);
  }, [words]);
  const [round, setRound] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const cur = syllables[round];
  useEffect(() => { if (cur) void speak(cur.char, speed * 0.9); }, [round]); // eslint-disable-line
  if (round >= syllables.length) {
    const score = Math.round((correct / Math.max(1, syllables.length)) * 100);
    return <Finished score={correct} max={syllables.length} onFinish={() => onFinish(score, { perfect: correct === syllables.length && syllables.length >= 10 })} note="âm tiết đúng thanh" />;
  }
  const tone = toneOf(cur.syl);
  const choose = (t: number) => {
    if (picked !== null) return;
    setPicked(t);
    if (t === tone) setCorrect((c) => c + 1);
    setTimeout(() => { setPicked(null); setRound((r) => r + 1); }, 1000);
  };
  const labels = [['ˉ', 'Thanh 1'], ['ˊ', 'Thanh 2'], ['ˇ', 'Thanh 3'], ['ˋ', 'Thanh 4'], ['·', 'Thanh nhẹ']];
  return (
    <div className="text-center">
      <p className="mb-2 text-sm text-muted">Âm tiết {round + 1}/{syllables.length} · Đúng {correct}</p>
      <div className="mb-2 flex items-center justify-center gap-3">
        <span className="tianzi han inline-flex h-24 w-24 items-center justify-center rounded-xl text-5xl">{cur.char}</span>
        <SpeakButton text={cur.char} rate={speed * 0.9} size="lg" />
      </div>
      <p className="mb-4 text-3xl font-bold tracking-wide">{picked === null ? stripTones(cur.syl) : cur.syl}</p>
      <div className="grid grid-cols-5 gap-2">
        {labels.map(([sym, name], i) => {
          const t = i === 4 ? 0 : i + 1;
          return (
            <button key={name} onClick={() => choose(t)} className={cls('opt flex flex-col items-center !px-1', picked !== null && t === tone && 'opt-good', picked === t && t !== tone && 'opt-bad')}>
              <span className="text-3xl font-black leading-none">{sym}</span>
              <span className="text-xs">{name}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ===== 4. Xếp câu đua giờ =====
export function SentenceRaceGame({ lines, levelId, pinyin, onFinish }: GameProps) {
  const sentences = useMemo(() => {
    const dict = getDict(levelId);
    return shuffle(
      lines
        .map((l) => l.split(/[。！？]/)[0])
        .map((s) => segment(s, dict).filter((x) => x.han).map((x) => x.text))
        .filter((t) => t.length >= 2 && t.length <= 7),
    ).slice(0, 10);
  }, [lines, levelId]);
  const [idx, setIdx] = useState(0);
  const [value, setValue] = useState<number[]>([]);
  const [score, setScore] = useState(0);
  const [status, setStatus] = useState<'good' | 'bad' | undefined>();
  const [over, setOver] = useState(false);
  const cur = sentences[idx];
  const order = useMemo(() => (cur ? permutation(cur.length) : []), [cur]);
  const tiles = order.map((i) => cur[i]);
  const [left] = useCountdown(60, !over && idx < sentences.length, () => setOver(true));
  if (over || idx >= sentences.length) return <Finished score={score} onFinish={() => onFinish(score)} note={`${score / 10} câu trong 60 giây`} />;
  const check = () => {
    if (gradeReorder(value.map((i) => tiles[i]), [cur.join('')])) {
      setScore((s) => s + 10); setStatus('good');
      setTimeout(() => { setStatus(undefined); setValue([]); setIdx((i) => i + 1); }, 500);
    } else { setStatus('bad'); setTimeout(() => setStatus(undefined), 600); }
  };
  return (
    <div>
      <div className="mb-3 flex items-center gap-3">
        <span className="font-bold">⏱ {left}s</span>
        <div className="flex-1"><ProgressBar value={left} max={60} label="Thời gian" /></div>
        <span className="font-bold">{score}đ</span>
      </div>
      <ReorderQuestion tiles={tiles} value={value} onChange={setValue} levelId={levelId} pinyin={pinyin} status={status} />
      <div className="mt-3 flex gap-2">
        <button className="btn-primary" disabled={value.length !== tiles.length} onClick={check}>Kiểm tra</button>
        <button className="btn-ghost" onClick={() => { setValue([]); setIdx((i) => i + 1); }}>Bỏ qua</button>
      </div>
    </div>
  );
}

// ===== 5. Tập viết chữ =====
export function WritingGame({ words, speed, onFinish }: GameProps) {
  const chars = useMemo(() => shuffle(Array.from(new Set(words.filter((w) => !w.proper).flatMap((w) => [...w.zh].filter(isHan))))).slice(0, 5), [words]);
  const [idx, setIdx] = useState(0);
  const [results, setResults] = useState<number[]>([]);
  const meaning = (c: string) => words.find((w) => w.zh.includes(c));
  if (idx >= chars.length) {
    const score = results.reduce((s, m) => s + Math.max(0, 20 - m * 4), 0);
    return <Finished score={score} max={chars.length * 20} onFinish={() => onFinish(score)} note={`Tổng số nét sai: ${results.reduce((a, b) => a + b, 0)}`} />;
  }
  const c = chars[idx];
  const w = meaning(c);
  const done = results.length > idx;
  return (
    <div className="text-center">
      <p className="mb-1 text-sm text-muted">Chữ {idx + 1}/{chars.length} · Viết từng nét vào ô 田字格. Sai 2 lần sẽ có gợi ý.</p>
      <p className="mb-2">Từ: <b className="han">{w?.zh}</b> – {w?.pinyin} – {w?.vi} <SpeakButton text={c} rate={speed} size="sm" /></p>
      <HanziBox key={c} char={c} mode="quiz" size={220} onQuizDone={(m) => setResults((r) => (r.length > idx ? r : [...r, m]))} />
      <div className="mt-2 flex justify-center gap-2">
        {done && <button className="btn-primary" onClick={() => setIdx((i) => i + 1)}>Chữ tiếp theo</button>}
        {!done && <button className="btn-ghost" onClick={() => { setResults((r) => [...r, 5]); setIdx((i) => i + 1); }}>Bỏ qua</button>}
      </div>
    </div>
  );
}


