import { useMemo, useState } from 'react';
import { SpeakButton } from '../components/ui';
import { posLabel, WordPopup } from '../components/VocabTable';
import { getLevelVocab, levels } from '../lib/data';
import { cls } from '../lib/util';
import { useLevelPrefs, useProgress } from '../store/ProgressStore';
import type { VocabItem } from '../types';

type Tab = 'list' | 'cards' | 'wrong';

export default function VocabPage() {
  const avail = levels.filter((l) => l.available);
  const [levelId, setLevelId] = useState(avail[0].id);
  const [lesson, setLesson] = useState<number | 'all'>('all');
  const [pos, setPos] = useState('all');
  const [q, setQ] = useState('');
  const [tab, setTab] = useState<Tab>('list');
  const [open, setOpen] = useState<(VocabItem & { lesson: number }) | null>(null);
  const { level, toggleKnown } = useProgress();
  const { speed } = useLevelPrefs(levelId);
  const prog = level(levelId);
  const all = useMemo(() => getLevelVocab(levelId), [levelId]);
  const lessonIds = Array.from(new Set(all.map((v) => v.lesson)));
  const posList = Array.from(new Set(all.map((v) => v.pos ?? ''))).filter(Boolean);
  const list = all.filter((v) =>
    (lesson === 'all' || v.lesson === lesson) && (pos === 'all' || v.pos === pos) &&
    (!q || v.zh.includes(q) || v.pinyin.toLowerCase().includes(q.toLowerCase()) || v.vi.toLowerCase().includes(q.toLowerCase())),
  );
  const wrong = Object.entries(prog.wrong).sort((a, b) => b[1] - a[1]).map(([w, n]) => ({ v: all.find((x) => x.zh === w), n })).filter((x) => x.v);

  return (
    <div>
      <h1 className="text-3xl font-extrabold">📒 Sổ từ vựng</h1>
      <p className="mb-4 text-muted">{all.length} từ · đã thuộc {prog.known.length}</p>

      <div className="card mb-4 grid gap-3 sm:grid-cols-4">
        <label className="text-sm font-semibold">Cấp
          <select className="mt-1 w-full rounded-xl border-2 border-line bg-bg p-2" value={levelId} onChange={(e) => { setLevelId(e.target.value); setLesson('all'); }}>
            {avail.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
        </label>
        <label className="text-sm font-semibold">Bài
          <select className="mt-1 w-full rounded-xl border-2 border-line bg-bg p-2" value={lesson} onChange={(e) => setLesson(e.target.value === 'all' ? 'all' : Number(e.target.value))}>
            <option value="all">Tất cả</option>
            {lessonIds.map((id) => <option key={id} value={id}>Bài {id}</option>)}
          </select>
        </label>
        <label className="text-sm font-semibold">Từ loại
          <select className="mt-1 w-full rounded-xl border-2 border-line bg-bg p-2" value={pos} onChange={(e) => setPos(e.target.value)}>
            <option value="all">Tất cả</option>
            {posList.map((p) => <option key={p} value={p}>{posLabel(p)}</option>)}
          </select>
        </label>
        <label className="text-sm font-semibold">Tìm
          <input className="mt-1 w-full rounded-xl border-2 border-line bg-bg p-2" value={q} onChange={(e) => setQ(e.target.value)} placeholder="chữ Hán, pinyin, nghĩa…" />
        </label>
      </div>

      <div role="tablist" className="mb-4 flex gap-2">
        {([['list', '📋 Danh sách'], ['cards', '🃏 Flashcard'], ['wrong', `⚠️ Từ hay sai (${wrong.length})`]] as [Tab, string][]).map(([t, label]) => (
          <button key={t} role="tab" aria-selected={tab === t} className={cls('chip', tab === t && 'chip-on')} onClick={() => setTab(t)}>{label}</button>
        ))}
      </div>

      {tab === 'list' && (
        <div className="card overflow-x-auto">
          <table className="w-full text-left">
            <thead><tr className="text-sm text-muted"><th className="py-1">Từ</th><th>Pinyin</th><th className="hidden sm:table-cell">Từ loại</th><th>Nghĩa</th><th>Bài</th><th /></tr></thead>
            <tbody>
              {list.map((v) => (
                <tr key={v.zh + v.lesson} className="border-t border-line">
                  <td className="py-2"><button className="han rounded px-1 text-2xl hover:bg-primary/10" onClick={() => setOpen(v)}>{v.zh}</button>{prog.known.includes(v.zh) && <span className="text-good"> ✓</span>}</td>
                  <td className="text-accent">{v.pinyin}</td>
                  <td className="hidden text-sm text-muted sm:table-cell">{posLabel(v.pos)}</td>
                  <td>{v.vi}</td>
                  <td className="text-sm">{v.lesson}</td>
                  <td className="text-right"><SpeakButton text={v.zh} rate={speed} size="sm" /></td>
                </tr>
              ))}
            </tbody>
          </table>
          {list.length === 0 && <p className="py-6 text-center text-muted">Không có từ khớp bộ lọc. Thử bỏ bớt điều kiện.</p>}
        </div>
      )}
      {tab === 'cards' && <Flashcards words={list} levelId={levelId} known={prog.known} onKnown={(w) => toggleKnown(levelId, w)} speed={speed} />}
      {tab === 'wrong' && (
        <div className="card">
          {wrong.length === 0 ? (
            <p className="text-muted">Chưa có từ nào. Từ trong các câu bạn làm sai ở bài tập về nhà sẽ tự động xuất hiện ở đây.</p>
          ) : (
            <ul className="divide-y divide-line">
              {wrong.map(({ v, n }) => (
                <li key={v!.zh} className="flex items-center gap-3 py-2">
                  <button className="han text-2xl" onClick={() => setOpen(v!)}>{v!.zh}</button>
                  <span className="text-accent">{v!.pinyin}</span>
                  <span className="flex-1">{v!.vi}</span>
                  <span className="rounded-full bg-bad/15 px-2 text-sm font-bold text-bad">sai {n} lần</span>
                  <SpeakButton text={v!.zh} rate={speed} size="sm" />
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
      <WordPopup word={open} levelId={levelId} upTo={open?.lesson ?? 99} onClose={() => setOpen(null)} />
    </div>
  );
}

function Flashcards({ words, levelId, known, onKnown, speed }: { words: VocabItem[]; levelId: string; known: string[]; onKnown: (w: string) => void; speed: number }) {
  const [i, setI] = useState(0);
  const [flip, setFlip] = useState(false);
  void levelId;
  if (!words.length) return <p className="text-muted">Không có từ nào.</p>;
  const w = words[i % words.length];
  const next = () => { setFlip(false); setI((x) => (x + 1) % words.length); };
  return (
    <div className="mx-auto max-w-md text-center">
      <p className="mb-2 text-sm text-muted">Thẻ {(i % words.length) + 1}/{words.length} · Chạm thẻ để lật</p>
      <button onClick={() => setFlip((f) => !f)} className="card card-lift flex h-64 w-full flex-col items-center justify-center" aria-label={flip ? `${w.pinyin}: ${w.vi}` : `${w.zh}. Chạm để xem nghĩa`}>
        {!flip ? <span className="han text-7xl font-bold">{w.zh}</span> : (
          <span className="pop">
            <span className="block text-3xl font-bold text-accent">{w.pinyin}</span>
            <span className="mt-2 block text-xl">{w.vi}</span>
            <span className="mt-1 block text-sm text-muted">{posLabel(w.pos)}</span>
          </span>
        )}
      </button>
      <div className="mt-3 flex items-center justify-center gap-2">
        <SpeakButton text={w.zh} rate={speed} />
        <button className="btn-ghost" onClick={next}>Chưa thuộc ↻</button>
        <button className="btn-primary" onClick={() => { if (!known.includes(w.zh)) onKnown(w.zh); next(); }}>Đã thuộc ✓</button>
      </div>
    </div>
  );
}
