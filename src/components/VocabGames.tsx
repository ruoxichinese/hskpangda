import { useEffect, useMemo, useRef, useState } from 'react';
import componentsData from '../data/components.json';
import { getHomework } from '../lib/data';
import { cls } from '../lib/util';
import { useLevelPrefs, useProgress } from '../store/ProgressStore';
import type { VocabItem } from '../types';
import { ZhText } from './ZhText';

type Word = VocabItem & { lesson: number };
type Comp = { s: '⿰' | '⿱'; p: [string, string] };
const COMPS = componentsData as unknown as Record<string, Comp>;
const ROUND = 10;

const shuffle = <T,>(a: T[]): T[] => {
  const b = [...a];
  for (let i = b.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [b[i], b[j]] = [b[j], b[i]];
  }
  return b;
};
const clean = (s: string) => s.replace(/\{(.)\|[^}]*\}/g, '$1');

/** Ghi từ sai + cộng XP khi kết thúc một lượt */
function useFinish(levelId: string) {
  const { updateLevel, addXP } = useProgress();
  return (correct: number, wrongWords: string[]) => {
    if (wrongWords.length) {
      updateLevel(levelId, (p) => {
        for (const w of wrongWords) p.wrong[w] = (p.wrong[w] ?? 0) + 1;
      });
    }
    if (correct > 0) addXP(correct * 2);
  };
}

function Result({ correct, total, wrong, onAgain, extra }: { correct: number; total: number; wrong: Word[]; onAgain: () => void; extra?: string }) {
  const pct = total ? correct / total : 0;
  const stars = pct >= 0.9 ? 3 : pct >= 0.7 ? 2 : pct >= 0.4 ? 1 : 0;
  return (
    <div className="card text-center" role="status">
      <p className="text-5xl">{stars === 3 ? '🐼🎉' : stars >= 2 ? '🐼👍' : '🐼💪'}</p>
      <p className="mt-2 font-display text-3xl font-extrabold">{correct}/{total}</p>
      <p className="text-2xl" aria-label={`${stars} sao`}>{'⭐'.repeat(stars)}{'☆'.repeat(3 - stars)}</p>
      {extra && <p className="mt-1 text-muted">{extra}</p>}
      <p className="mt-1 text-sm text-muted">+{correct * 2} XP</p>
      {wrong.length > 0 && (
        <div className="mx-auto mt-4 max-w-md text-left">
          <p className="label mb-1">Từ cần ôn lại (đã thêm vào “Từ hay sai”)</p>
          <ul className="space-y-1">
            {wrong.map((w) => (
              <li key={w.zh} className="flex items-baseline gap-2 rounded-xl bg-bg px-3 py-1">
                <span className="han text-xl" lang="zh-CN">{w.zh}</span>
                <span className="text-sm text-muted">{w.pinyin}</span>
                <span className="text-sm">{w.vi}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      <button className="btn-primary mt-5" onClick={onAgain}>🔁 Chơi lượt mới</button>
    </div>
  );
}

function Progress({ i, total, score }: { i: number; total: number; score: number }) {
  return (
    <div className="mb-3 flex items-center gap-3">
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-line" aria-hidden>
        <div className="h-full bg-primary transition-all" style={{ width: `${(i / total) * 100}%` }} />
      </div>
      <span className="text-sm font-bold">Câu {Math.min(i + 1, total)}/{total} · ✅ {score}</span>
    </div>
  );
}

function TooFew({ need, have, what }: { need: number; have: number; what: string }) {
  return (
    <div className="card text-center">
      <p className="text-4xl">🐼</p>
      <p className="mt-2">Phạm vi đang chọn chỉ có {have} {what}, cần ít nhất {need} để chơi.</p>
      <p className="text-sm text-muted">Hãy chọn “Tất cả” bài, hoặc chọn thêm bài khác.</p>
    </div>
  );
}

/* ================= 1. Ghép chữ Pàngdá ================= */

interface BuildItem { word: Word; idx: number; char: string; comp: Comp; tiles: string[] }

function makeBuildItems(words: Word[]): BuildItem[] {
  const seen = new Set<string>();
  const cand: { word: Word; idx: number; char: string }[] = [];
  for (const w of shuffle(words)) {
    [...w.zh].forEach((c, idx) => {
      if (COMPS[c] && !seen.has(c)) {
        seen.add(c);
        cand.push({ word: w, idx, char: c });
      }
    });
  }
  const all = Object.entries(COMPS);
  const freq = new Map<string, number>();
  for (const [, x] of all) for (const p of x.p) freq.set(p, (freq.get(p) ?? 0) + 1);
  const common = [...freq.entries()].sort((a, b) => b[1] - a[1]).slice(0, 40).map(([p]) => p);
  return shuffle(cand).slice(0, ROUND).map(({ word, idx, char }) => {
    const comp = COMPS[char];
    const [a, b] = comp.p;
    // mảnh nhiễu: lấy từ những chữ có chung một bộ kiện (休 → 体 → 本), rồi bộ kiện hay gặp
    const near = new Set<string>();
    for (const [c, x] of all) {
      if (c === char) continue;
      if (x.p[0] === a && x.p[1] !== b) near.add(x.p[1]);
      if (x.p[1] === b && x.p[0] !== a) near.add(x.p[0]);
    }
    const dist = [...shuffle([...near]), ...shuffle(common)].filter((p) => p !== a && p !== b);
    const uniq = Array.from(new Set(dist)).slice(0, 4);
    return { word, idx, char, comp, tiles: shuffle([a, b, ...uniq]) };
  });
}

export function CharBuildGame({ words, levelId }: { words: Word[]; levelId: string }) {
  const finish = useFinish(levelId);
  const [seed, setSeed] = useState(0);
  const items = useMemo(() => makeBuildItems(words), [words, seed]);
  const [i, setI] = useState(0);
  const [slots, setSlots] = useState<(number | null)[]>([null, null]);
  const [checked, setChecked] = useState<null | 'ok' | 'swap' | 'bad'>(null);
  const [score, setScore] = useState(0);
  const [wrong, setWrong] = useState<Word[]>([]);
  const [done, setDone] = useState(false);

  useEffect(() => { setI(0); setSlots([null, null]); setChecked(null); setScore(0); setWrong([]); setDone(false); }, [items]);

  if (items.length < 4) return <TooFew need={4} have={items.length} what="chữ ghép được" />;
  if (done) return <Result correct={score} total={items.length} wrong={wrong} onAgain={() => setSeed((s) => s + 1)} />;

  const it = items[i];
  const pick = (t: number) => {
    if (checked || slots.includes(t)) return;
    const k = slots.indexOf(null);
    if (k < 0) return;
    const next = [...slots];
    next[k] = t;
    setSlots(next);
    if (next.every((x) => x !== null)) {
      const got = next.map((x) => it.tiles[x!]);
      const res = got[0] === it.comp.p[0] && got[1] === it.comp.p[1] ? 'ok' : got[0] === it.comp.p[1] && got[1] === it.comp.p[0] ? 'swap' : 'bad';
      setChecked(res);
      if (res === 'ok') setScore((s) => s + 1);
      else setWrong((w) => (w.some((x) => x.zh === it.word.zh) ? w : [...w, it.word]));
    }
  };
  const unpick = (k: number) => {
    if (checked) return;
    const next = [...slots];
    next[k] = null;
    setSlots(next);
  };
  const next = () => {
    if (i + 1 >= items.length) {
      finish(score, wrong.map((w) => w.zh));
      setDone(true);
      return;
    }
    setI(i + 1);
    setSlots([null, null]);
    setChecked(null);
  };
  const horiz = it.comp.s === '⿰';

  return (
    <div className="card">
      <Progress i={i} total={items.length} score={score} />
      <p className="label">Ghép chữ còn thiếu trong từ</p>
      <div className="my-3 flex flex-wrap items-end justify-center gap-1" lang="zh-CN">
        {[...it.word.zh].map((c, k) =>
          k === it.idx ? (
            <span key={k} className={cls('inline-grid h-20 w-20 gap-1 rounded-2xl border-4 border-dashed p-1', horiz ? 'grid-cols-2' : 'grid-rows-2', checked === 'ok' ? 'border-good' : checked ? 'border-bad' : 'border-primary')}>
              {checked === 'ok' ? (
                <span className={cls('han col-span-2 row-span-2 grid place-items-center text-5xl font-bold text-good', horiz ? '' : '')}>{it.char}</span>
              ) : (
                [0, 1].map((s) => (
                  <button key={s} onClick={() => unpick(s)} aria-label={`Ô ${horiz ? (s ? 'phải' : 'trái') : s ? 'dưới' : 'trên'}`}
                    className="han grid place-items-center rounded-xl bg-bg text-2xl">
                    {slots[s] !== null ? it.tiles[slots[s]!] : ''}
                  </button>
                ))
              )}
            </span>
          ) : (
            <span key={k} className="han text-6xl font-bold">{c}</span>
          ),
        )}
      </div>
      <p className="text-center text-lg"><span className="font-bold">{it.word.pinyin}</span> · {it.word.vi}</p>
      <p className="mb-3 text-center text-sm text-muted">Cấu tạo: {horiz ? 'trái + phải' : 'trên + dưới'} — bấm mảnh {horiz ? 'bên trái' : 'phía trên'} trước</p>
      <div className="flex flex-wrap justify-center gap-2">
        {it.tiles.map((t, k) => (
          <button key={k} disabled={!!checked || slots.includes(k)} onClick={() => pick(k)}
            className={cls('han h-14 w-14 rounded-2xl border-2 border-line bg-card text-3xl shadow-sm transition', slots.includes(k) ? 'opacity-30' : 'hover:-translate-y-0.5 hover:border-primary')} lang="zh-CN">
            {t}
          </button>
        ))}
      </div>
      {checked && (
        <div className="mt-4 text-center" aria-live="polite">
          <p className={cls('text-lg font-bold', checked === 'ok' ? 'text-good' : 'text-bad')}>
            {checked === 'ok' ? '✓ Chính xác!' : checked === 'swap' ? '✗ Đúng mảnh nhưng sai vị trí.' : '✗ Chưa đúng.'}
          </p>
          <p className="han text-2xl" lang="zh-CN">{it.char} = {it.comp.p[0]} {horiz ? '+' : '/'} {it.comp.p[1]}</p>
          <button className="btn-primary mt-3" onClick={next}>{i + 1 >= items.length ? 'Xem kết quả' : 'Câu sau →'}</button>
        </div>
      )}
    </div>
  );
}

/* ================= 2. Pàngdá đi chợ ================= */

const POS_BASKET: Record<string, string> = { 'n.': 'Danh từ', 'v.': 'Động từ', 'adj.': 'Tính từ' };
const OTHER_POS = new Set(['adv.', 'm.', 'pron.', 'conj.', 'prep.', 'part.', 'mod.', 'num.', 'int.', 'suf.']);
const BASKET_ICON: Record<string, string> = { 'Danh từ': '🍎', 'Động từ': '🏃', 'Tính từ': '🎨', 'Từ khác': '🧩' };

function themeMap(levelId: string, lessons: number[]): Map<string, string> {
  const m = new Map<string, string>();
  for (const id of lessons) {
    const hw = getHomework(levelId, id);
    for (const s of hw?.sections ?? []) {
      for (const row of s.wordTable ?? []) {
        if (/kết hợp/i.test(row.head)) continue;
        for (const w of row.words) if (!m.has(w)) m.set(w, row.head);
      }
    }
  }
  return m;
}

export function MarketGame({ words, levelId }: { words: Word[]; levelId: string }) {
  const finish = useFinish(levelId);
  const lessons = useMemo(() => Array.from(new Set(words.map((w) => w.lesson))), [words]);
  const themes = useMemo(() => themeMap(levelId, lessons), [levelId, lessons]);
  const themeWords = words.filter((w) => themes.has(w.zh));
  const themeNames = Array.from(new Set(themeWords.map((w) => themes.get(w.zh)!)));
  const canTheme = themeNames.length >= 2 && themeWords.length >= 8;
  const [mode, setMode] = useState<'pos' | 'theme'>('pos');
  const [seed, setSeed] = useState(0);

  const { pool, baskets } = useMemo(() => {
    if (mode === 'theme' && canTheme) {
      const pick = shuffle(themeNames).slice(0, 4);
      const pw = themeWords.filter((w) => pick.includes(themes.get(w.zh)!));
      return { pool: shuffle(pw).slice(0, 12).map((w) => ({ w, key: themes.get(w.zh)! })), baskets: pick };
    }
    const tagged = words
      .filter((w) => !w.proper && w.pos && (POS_BASKET[w.pos] || OTHER_POS.has(w.pos)))
      .map((w) => ({ w, key: POS_BASKET[w.pos!] ?? 'Từ khác' }));
    const keys = ['Danh từ', 'Động từ', 'Tính từ', 'Từ khác'].filter((k) => tagged.filter((x) => x.key === k).length >= 1);
    return { pool: shuffle(tagged).slice(0, 12), baskets: keys };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [words, mode, seed, canTheme]);

  const [i, setI] = useState(0);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [wrong, setWrong] = useState<Word[]>([]);
  const [flash, setFlash] = useState<null | { ok: boolean; key: string }>(null);
  const [done, setDone] = useState(false);
  const [run, setRun] = useState(0); // khởi động lại thanh chạy cho mỗi từ
  const timer = useRef<number>();

  useEffect(() => { setI(0); setScore(0); setStreak(0); setWrong([]); setFlash(null); setDone(false); }, [pool]);

  // tốc độ băng chuyền: nhanh dần theo chuỗi đúng
  const duration = Math.max(3.5, 8 - streak * 0.6);
  const cur = pool[i];

  const answer = (key: string | null) => {
    if (!cur || flash) return;
    window.clearTimeout(timer.current);
    const ok = key === cur.key;
    setFlash({ ok, key: cur.key });
    if (ok) { setScore((s) => s + 1); setStreak((s) => s + 1); }
    else { setStreak(0); setWrong((w) => (w.some((x) => x.zh === cur.w.zh) ? w : [...w, cur.w])); }
    window.setTimeout(() => {
      setFlash(null);
      if (i + 1 >= pool.length) {
        finish(score + (ok ? 1 : 0), [...wrong, ...(ok ? [] : [cur.w])].map((w) => w.zh));
        setDone(true);
      } else { setI(i + 1); setRun((r) => r + 1); }
    }, ok ? 650 : 1500);
  };

  useEffect(() => {
    if (done || !cur || flash) return;
    timer.current = window.setTimeout(() => answer(null), duration * 1000);
    return () => window.clearTimeout(timer.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [i, run, done, flash]);

  if (pool.length < 6 || baskets.length < 2) return <TooFew need={6} have={pool.length} what="từ phân loại được" />;
  if (done) return <Result correct={score} total={pool.length} wrong={wrong} onAgain={() => setSeed((s) => s + 1)} />;

  return (
    <div className="card">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="label">Phân loại theo:</span>
        <button className={cls('chip', mode === 'pos' && 'chip-on')} onClick={() => setMode('pos')}>Từ loại</button>
        <button className={cls('chip', mode === 'theme' && 'chip-on')} disabled={!canTheme} onClick={() => setMode('theme')}
          title={canTheme ? '' : 'Chủ đề có ở HSK 3 (theo sách bài tập)'}>Chủ đề{canTheme ? '' : ' (HSK 3)'}</button>
        {streak >= 3 && <span className="chip chip-on">🔥 Chuỗi {streak}</span>}
      </div>
      <Progress i={i} total={pool.length} score={score} />
      <p className="label">Bấm vào giỏ đúng trước khi món hàng chạy hết băng chuyền!</p>
      {/* băng chuyền */}
      <div className="relative my-3 h-28 overflow-hidden rounded-2xl border-2 border-line bg-bg">
        <div className="absolute inset-x-0 bottom-3 h-2 bg-line" aria-hidden />
        {cur && (
          <div key={`${i}-${run}`}
            className={cls('absolute top-2 rounded-2xl border-2 bg-card px-4 py-2 text-center shadow', flash ? (flash.ok ? 'border-good' : 'border-bad') : 'border-primary')}
            style={flash ? { left: '50%', transform: 'translateX(-50%)' } : { animation: `belt ${duration}s linear forwards` }}>
            <span className="han block text-4xl font-bold" lang="zh-CN">{cur.w.zh}</span>
            <span className="text-sm">{cur.w.pinyin}</span>
          </div>
        )}
      </div>
      <div aria-live="polite" className="mb-2 min-h-[1.5rem] text-center">
        {flash && (flash.ok ? <span className="font-bold text-good">✓ Đúng giỏ! · {cur.w.vi}</span>
          : <span className="font-bold text-bad">✗ Giỏ đúng là “{flash.key}” · {cur.w.vi}</span>)}
      </div>
      <div className={cls('grid gap-2', baskets.length > 2 ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-2')}>
        {baskets.map((b) => (
          <button key={b} onClick={() => answer(b)} disabled={!!flash}
            className={cls('rounded-2xl border-2 border-line bg-card px-2 py-3 text-center font-bold shadow-sm transition hover:-translate-y-0.5 hover:border-primary',
              flash && flash.key === b && 'border-good ring-4 ring-good/30')}>
            <span className="block text-2xl">{BASKET_ICON[b] ?? '🧺'}</span>
            <span className="text-sm">{b}</span>
          </button>
        ))}
      </div>
      <style>{'@keyframes belt{from{left:2%}to{left:100%}}'}</style>
    </div>
  );
}

/* ================= 3. Điền từ tốc độ ================= */

interface FillItem { word: Word; sentence: string; options: string[] }
const LIMIT = 10; // giây mỗi câu

function makeFillItems(words: Word[], all: Word[]): FillItem[] {
  const usable = words.filter((w) => !w.proper && w.example && clean(w.example.zh).includes(w.zh));
  return shuffle(usable).slice(0, ROUND).map((w) => {
    const s = clean(w.example!.zh);
    const same = (x: Word) => x.zh !== w.zh && x.pos === w.pos && !s.includes(x.zh) && !w.zh.includes(x.zh) && !x.zh.includes(w.zh);
    const near = shuffle(all.filter((x) => same(x) && x.lesson === w.lesson));
    const far = shuffle(all.filter((x) => same(x) && x.lesson !== w.lesson));
    const any = shuffle(all.filter((x) => x.zh !== w.zh && !s.includes(x.zh)));
    const dist = Array.from(new Set([...near, ...far, ...any].map((x) => x.zh))).slice(0, 2);
    return { word: w, sentence: s.replace(w.zh, '（　）'), options: shuffle([w.zh, ...dist]) };
  });
}

export function SpeedFillGame({ words, all, levelId }: { words: Word[]; all: Word[]; levelId: string }) {
  const finish = useFinish(levelId);
  const { pinyin } = useLevelPrefs(levelId);
  const [seed, setSeed] = useState(0);
  const items = useMemo(() => makeFillItems(words, all), [words, all, seed]);
  const [i, setI] = useState(0);
  const [score, setScore] = useState(0);
  const [points, setPoints] = useState(0);
  const [left, setLeft] = useState(LIMIT);
  const [pick, setPick] = useState<string | null>(null);
  const [wrong, setWrong] = useState<Word[]>([]);
  const [done, setDone] = useState(false);
  const started = useRef(Date.now());

  useEffect(() => { setI(0); setScore(0); setPoints(0); setPick(null); setWrong([]); setDone(false); started.current = Date.now(); setLeft(LIMIT); }, [items]);

  const it = items[i];
  useEffect(() => {
    if (done || pick !== null || !it) return;
    const t = window.setInterval(() => {
      const l = Math.max(0, LIMIT - (Date.now() - started.current) / 1000);
      setLeft(l);
      if (l <= 0) choose('');
    }, 100);
    return () => window.clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [i, pick, done, it]);

  if (items.length < 4) return <TooFew need={4} have={items.length} what="câu ví dụ dùng được" />;
  if (done) return <Result correct={score} total={items.length} wrong={wrong} onAgain={() => setSeed((s) => s + 1)} extra={`Điểm tốc độ: ${points}`} />;

  function choose(o: string) {
    if (pick !== null) return;
    setPick(o);
    const ok = o === it.word.zh;
    if (ok) { setScore((s) => s + 1); setPoints((p) => p + 10 + Math.round(left)); }
    else setWrong((w) => [...w, it.word]);
  }
  const next = () => {
    if (i + 1 >= items.length) {
      finish(score, wrong.map((w) => w.zh));
      setDone(true);
      return;
    }
    setI(i + 1);
    setPick(null);
    setLeft(LIMIT);
    started.current = Date.now();
  };
  const filled = pick !== null ? it.sentence.replace('（　）', `【${it.word.zh}】`) : it.sentence;

  return (
    <div className="card">
      <Progress i={i} total={items.length} score={score} />
      <div className="mb-3 flex items-center gap-2">
        <div className="h-3 flex-1 overflow-hidden rounded-full bg-line" aria-hidden>
          <div className={cls('h-full transition-[width] duration-100', left > 3 ? 'bg-good' : 'bg-bad')} style={{ width: `${(left / LIMIT) * 100}%` }} />
        </div>
        <span className="w-14 text-right font-bold tabular-nums" aria-label={`Còn ${Math.ceil(left)} giây`}>⏱ {Math.ceil(left)}s</span>
        <span className="chip">⚡ {points}</span>
      </div>
      <div className="rounded-2xl bg-bg p-4 text-center">
        <ZhText text={filled} levelId={levelId} pinyin={pick !== null ? pinyin : 'hidden'} size="xl" />
        {pick !== null && <p className="mt-2 text-muted">{it.word.example!.vi}</p>}
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2">
        {it.options.map((o) => (
          <button key={o} onClick={() => choose(o)} disabled={pick !== null} lang="zh-CN"
            className={cls('opt han justify-center !py-3 text-2xl', pick !== null && o === it.word.zh && 'opt-good', pick === o && o !== it.word.zh && 'opt-bad')}>
            {o}
          </button>
        ))}
      </div>
      {pick !== null && (
        <div className="mt-3 text-center" aria-live="polite">
          <p className={cls('font-bold', pick === it.word.zh ? 'text-good' : 'text-bad')}>
            {pick === it.word.zh ? `✓ Đúng! +${10 + Math.round(left)} điểm` : pick === '' ? '⏰ Hết giờ!' : '✗ Chưa đúng.'} {it.word.zh} ({it.word.pinyin}) = {it.word.vi}
          </p>
          <button className="btn-primary mt-3" onClick={next}>{i + 1 >= items.length ? 'Xem kết quả' : 'Câu sau →'}</button>
        </div>
      )}
    </div>
  );
}
