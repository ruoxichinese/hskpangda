import { useEffect, useMemo, useRef, useState } from 'react';
import { gradeReorder } from '../lib/grading';
import { cls, permutation } from '../lib/util';
import { useLevelPrefs } from '../store/ProgressStore';
import type { ExerciseItem } from '../types';
import { PandaMascot } from './panda/PandaMascot';
import { MatchBoard } from './questions/MatchBoard';
import { ReorderQuestion } from './questions/ReorderQuestion';
import { SpeakButton } from './ui';
import { ZhText } from './ZhText';

const KIND_LABEL: Record<ExerciseItem['kind'], string> = {
  fill: 'Chọn từ điền vào chỗ trống',
  reorder: 'Sắp xếp thành câu',
  listenPick: 'Nghe và chọn tranh',
  listenTF: 'Nghe và phán đoán đúng/sai',
  pictureComplete: 'Nhìn tranh hoàn thành câu',
  matchQA: 'Nối câu hỏi – câu trả lời',
  choice: 'Chọn đáp án đúng',
};

interface ItemState { done: boolean; firstTry: boolean | null; wrong: number }

function correctAnswer(item: ExerciseItem): string {
  switch (item.kind) {
    case 'fill': return item.answer;
    case 'reorder': return item.answers[0];
    case 'listenPick': return item.options[item.answer].label;
    case 'listenTF': return item.answer ? 'Đúng' : 'Sai';
    case 'pictureComplete': return item.options[item.answer];
    case 'choice': return item.options[item.answer];
    case 'matchQA': return item.pairs.map((p) => `${p.q} → ${p.a}`).join(' · ');
  }
}

function ExerciseCard({ item, n, levelId, upTo, onResult }: {
  item: ExerciseItem; n: number; levelId: string; upTo: number; onResult: (correct: boolean, final: boolean) => void;
}) {
  // Luyện tập không hiện pinyin: học sinh tự nhận diện chữ Hán (chỉnh bằng difficulty.exercisePinyin)
  const { exercisePinyin: pinyin, speed, difficulty } = useLevelPrefs(levelId);
  const [state, setState] = useState<'idle' | 'good' | 'bad'>('idle');
  const [tries, setTries] = useState(0);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [eliminated, setEliminated] = useState<number[]>([]);
  const [reorder, setReorder] = useState<number[]>([]);
  const [match, setMatch] = useState<Record<number, number>>({});
  const tileOrder = useMemo(() => (item.kind === 'reorder' ? permutation(item.tiles.length) : []), [item]);
  const rightOrder = useMemo(() => (item.kind === 'matchQA' ? permutation(item.pairs.length) : []), [item]);
  const solved = state === 'good';

  const submit = (correct: boolean) => {
    setTries((t) => t + 1);
    setState(correct ? 'good' : 'bad');
    onResult(correct, correct);
    if (!correct) setTimeout(() => setState((s) => (s === 'bad' ? 'idle' : s)), 1600);
  };

  // gợi ý: loại bớt một đáp án sai (dạng chọn) hoặc đặt sẵn thẻ đầu (sắp xếp)
  const canHint = hintsUsed < difficulty.hintsPerQuestion && !solved;
  const hint = () => {
    setHintsUsed((h) => h + 1);
    if (item.kind === 'reorder') {
      // đặt sẵn (hintsUsed + 1) thẻ đầu tiên theo đáp án mẫu; chỉ số theo thứ tự hiển thị
      const shown = tileOrder.map((i) => item.tiles[i]);
      const target = item.answers[0];
      let pos = 0; const seq: number[] = [];
      for (let k = 0; k <= hintsUsed && pos < target.length; k++) {
        const hit = shown.findIndex((t, i) => !seq.includes(i) && target.startsWith(t, pos));
        if (hit < 0) break;
        seq.push(hit); pos += shown[hit].length;
      }
      setReorder(seq);
      return;
    }
    const opts = item.kind === 'fill' ? item.bank.map((_, i) => i).filter((i) => item.bank[i] !== item.answer)
      : 'options' in item && 'answer' in item && typeof item.answer === 'number' ? (item.options as unknown[]).map((_, i) => i).filter((i) => i !== item.answer) : [];
    const left = opts.filter((i) => !eliminated.includes(i));
    if (left.length) setEliminated((e) => [...e, left[0]]);
  };

  const choice = (opts: React.ReactNode[], answer: number, grid = 'sm:grid-cols-3') => (
    <div className={cls('grid gap-2', grid)}>
      {opts.map((o, i) => (
        <button
          key={i}
          disabled={solved || eliminated.includes(i)}
          className={cls('opt text-center', eliminated.includes(i) && 'opacity-30 line-through', solved && i === answer && 'opt-good')}
          onClick={() => submit(i === answer)}
        >
          {o}
        </button>
      ))}
    </div>
  );

  let body: React.ReactNode = null;
  switch (item.kind) {
    case 'fill': {
      const [a, b] = item.sentence.split('___');
      body = (
        <>
          <p className="mb-3">
            <ZhText text={a} levelId={levelId} pinyin={pinyin} upTo={upTo} size="lg" />
            <span className={cls('han mx-1 inline-block min-w-[3rem] border-b-4 px-1 text-center text-2xl', solved ? 'border-good text-good' : 'border-primary')}>{solved ? item.answer : '\u00a0'}</span>
            <ZhText text={b ?? ''} levelId={levelId} pinyin={pinyin} upTo={upTo} size="lg" />
          </p>
          {choice(item.bank.map((w) => <ZhText key={w} text={w} levelId={levelId} pinyin={pinyin} />), item.bank.indexOf(item.answer))}
        </>
      );
      break;
    }
    case 'reorder': {
      const tiles = tileOrder.map((i) => item.tiles[i]);
      body = (
        <>
          {item.vi && <p className="mb-2 font-medium">🇻🇳 {item.vi}</p>}
          <ReorderQuestion tiles={tiles} value={reorder} onChange={setReorder} levelId={levelId} pinyin={pinyin} disabled={solved} status={state === 'idle' ? undefined : state} />
          {!solved && (
            <button className="btn-primary mt-3" disabled={reorder.length !== tiles.length} onClick={() => submit(gradeReorder(reorder.map((i) => tiles[i]), item.answers))}>
              Kiểm tra
            </button>
          )}
        </>
      );
      break;
    }
    case 'listenPick':
      body = (
        <>
          <div className="mb-3 flex items-center gap-3">
            <SpeakButton text={item.audioText} rate={speed} size="lg" label="Nghe câu" />
            <span className="text-muted">Nghe rồi chọn tranh đúng</span>
          </div>
          {choice(item.options.map((o) => (
            <span key={o.label} className="flex flex-col items-center"><span className="text-5xl" aria-hidden>{o.emoji}</span><span className="text-sm font-medium">{o.label}</span></span>
          )), item.answer)}
        </>
      );
      break;
    case 'listenTF':
      body = (
        <>
          <div className="mb-3 flex items-center gap-4">
            <SpeakButton text={item.audioText} rate={speed} size="lg" label="Nghe câu" />
            <span className="text-6xl" aria-hidden>{item.emoji}</span>
          </div>
          <p className="mb-3 font-medium">{item.statement_vi}</p>
          {choice(['✓ Đúng', '✗ Sai'], item.answer ? 0 : 1, 'grid-cols-2')}
          {solved && <p className="mt-2"><ZhText text={item.audioText} levelId={levelId} pinyin={pinyin} /></p>}
        </>
      );
      break;
    case 'pictureComplete': {
      const [a, b] = item.sentence.split('___');
      body = (
        <>
          <p className="mb-2 text-6xl" aria-hidden>{item.emoji}</p>
          <p className="mb-3">
            <ZhText text={a} levelId={levelId} pinyin={pinyin} upTo={upTo} size="lg" />
            <span className={cls('han mx-1 inline-block min-w-[3rem] border-b-4 px-1 text-center text-2xl', solved ? 'border-good text-good' : 'border-primary')}>{solved ? item.options[item.answer] : '\u00a0'}</span>
            <ZhText text={b ?? ''} levelId={levelId} pinyin={pinyin} upTo={upTo} size="lg" />
          </p>
          {choice(item.options.map((o) => <ZhText key={o} text={o} levelId={levelId} pinyin={pinyin} />), item.answer)}
        </>
      );
      break;
    }
    case 'choice':
      body = (
        <>
          <p className="mb-3 font-semibold">{item.prompt_vi}</p>
          {item.prompt_zh && <p className="mb-3"><ZhText text={item.prompt_zh} levelId={levelId} pinyin={pinyin} size="lg" /></p>}
          {choice(item.options.map((o) => <ZhText key={o} text={o} levelId={levelId} pinyin={pinyin} />), item.answer)}
        </>
      );
      break;
    case 'matchQA':
      body = (
        <MatchBoard
          left={item.pairs.map((p) => p.q)}
          right={item.pairs.map((p) => p.a)}
          rightOrder={rightOrder}
          value={match}
          levelId={levelId}
          pinyin={pinyin}
          upTo={upTo}
          disabled={solved}
          isCorrect={(l, r) => l === r}
          onChange={(v) => {
            const wrongNow = Object.keys(v).some((k) => Number(k) < 0);
            const clean = Object.fromEntries(Object.entries(v).filter(([k]) => Number(k) >= 0)) as Record<number, number>;
            setMatch(clean);
            if (wrongNow) { setTries((t) => t + 1); setState('bad'); onResult(false, false); setTimeout(() => setState('idle'), 1200); }
            else if (Object.keys(clean).length === item.pairs.length) submit(true);
          }}
        />
      );
      break;
  }

  return (
    <article className={cls('card', state === 'bad' && 'shake')} aria-labelledby={`ex-${item.id}`}>
      <header className="mb-3 flex items-center justify-between gap-2">
        <h3 id={`ex-${item.id}`} className="font-bold">
          <span className="mr-2 inline-flex h-7 w-7 items-center justify-center rounded-full bg-primary/20 text-sm">{n}</span>
          {KIND_LABEL[item.kind]}
        </h3>
        {canHint && item.kind !== 'matchQA' && (
          <button className="chip" onClick={hint}>💡 Gợi ý ({difficulty.hintsPerQuestion - hintsUsed})</button>
        )}
      </header>
      {body}
      <div aria-live="polite">
        {state === 'good' && (
          <p className="pop mt-3 rounded-xl bg-good/10 p-3 font-semibold text-good">
            ✓ {tries <= 1 ? 'Chính xác ngay lần đầu!' : 'Đúng rồi!'} <span className="font-normal text-ink">{item.explain_vi}</span>
          </p>
        )}
        {state === 'bad' && (
          <div className="pop mt-3 flex items-center gap-2">
            <PandaMascot mood="cheer" size={52} />
            <p className="rounded-xl bg-bad/10 p-3 font-semibold text-bad">Không sao, thử lại nhé! {tries >= 2 && <span className="font-normal text-ink">Đáp án: <span className="han">{correctAnswer(item)}</span></span>}</p>
          </div>
        )}
      </div>
    </article>
  );
}

/**
 * Luyện tập tổng hợp trên lớp: phản hồi đúng/sai ngay, có giải thích, gợi ý theo cấp.
 * onComplete(score%) khi mọi câu đã được làm đúng (điểm tính theo lần thử đầu).
 */
export function ExerciseEngine({ items, levelId, upTo, onComplete }: { items: ExerciseItem[]; levelId: string; upTo: number; onComplete?: (score: number) => void }) {
  const [st, setSt] = useState<Record<string, ItemState>>({});
  const reported = useRef(false);
  const doneCount = Object.values(st).filter((s) => s.done).length;
  const firstRight = Object.values(st).filter((s) => s.firstTry).length;

  useEffect(() => {
    if (!reported.current && items.length && doneCount === items.length) {
      reported.current = true;
      onComplete?.(Math.round((firstRight / items.length) * 100));
    }
  }, [doneCount, firstRight, items.length, onComplete]);

  return (
    <div className="space-y-4">
      <div className="sticky top-[7.5rem] z-10 rounded-full bg-bg/90 py-1 backdrop-blur" aria-live="polite">
        <p className="text-center text-sm font-semibold">Đã xong {doneCount}/{items.length} câu · Đúng ngay lần đầu: {firstRight}</p>
      </div>
      {items.map((it, i) => (
        <ExerciseCard
          key={it.id}
          item={it}
          n={i + 1}
          levelId={levelId}
          upTo={upTo}
          onResult={(correct, final) =>
            setSt((s) => {
              const cur = s[it.id] ?? { done: false, firstTry: null, wrong: 0 };
              if (cur.done) return s;
              return { ...s, [it.id]: { done: final, firstTry: cur.firstTry ?? correct, wrong: cur.wrong + (correct ? 0 : 1) } };
            })
          }
        />
      ))}
      {doneCount === items.length && items.length > 0 && (
        <div className="card pop flex items-center gap-3">
          <PandaMascot mood={firstRight / items.length >= 0.8 ? 'celebrate' : 'cheer'} size={80} />
          <div>
            <p className="text-xl font-extrabold">Hoàn thành luyện tập: {Math.round((firstRight / items.length) * 100)}%</p>
            <p className="text-muted">{firstRight / items.length >= 0.8 ? 'Xuất sắc! Bài học được thêm 1 sao ⭐' : 'Đạt từ 80% sẽ được thêm 1 sao. Tải lại phần này để luyện lại nhé.'}</p>
          </div>
        </div>
      )}
    </div>
  );
}
