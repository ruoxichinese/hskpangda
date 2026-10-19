import { useEffect, useMemo, useRef, useState } from 'react';
import { say } from '../lib/audio';
import { cls, permutation, stripVi } from '../lib/util';
import { useLevelPrefs } from '../store/ProgressStore';
import type { HanziIntro, Lesson, PinyinIntro } from '../types';
import { HanziBox } from './HanziBox';
import { PandaMascot } from './panda/PandaMascot';
import { MatchBoard } from './questions/MatchBoard';
import { PangdaTip, SpeakButton } from './ui';
import { ZhText } from './ZhText';

/** Đường nét thanh điệu theo thang 5 bậc */
function ToneContour({ contour }: { contour: string }) {
  const y = (d: string) => 54 - (Number(d) - 1) * 12;
  const pts = contour === '0' ? null : [...contour].map((d, i, arr) => `${(i / (arr.length - 1)) * 80 + 10},${y(d)}`).join(' ');
  return (
    <svg viewBox="0 0 100 64" className="h-16 w-24 shrink-0" aria-hidden>
      {[1, 2, 3, 4, 5].map((k) => <line key={k} x1="6" x2="94" y1={y(String(k))} y2={y(String(k))} stroke="rgb(var(--c-muted) / .35)" strokeWidth="1" />)}
      {pts ? <polyline points={pts} fill="none" stroke="rgb(var(--c-accent))" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
        : <circle cx="50" cy="42" r="5" fill="rgb(var(--c-accent))" />}
    </svg>
  );
}

export function PinyinIntroPanel({ data, speed }: { data: PinyinIntro; speed: number }) {
  const cell = (s: string) => {
    const [letter, char, py] = s.split('|');
    return (
      <button key={s} className="tile flex-col !px-2" onClick={() => void say(char, speed)} aria-label={`${letter}, ví dụ ${char} ${py}`}>
        <span className="font-sans text-xl font-extrabold">{letter}</span>
        <span className="font-sans text-[11px] font-medium text-muted">{char} {py}</span>
      </button>
    );
  };
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <PandaMascot mood="explain" size={90} />
        <p className="max-w-prose flex-1">
          Một âm tiết tiếng Trung = <b>thanh mẫu</b> (phụ âm đầu) + <b>vận mẫu</b> (phần vần) + <b>thanh điệu</b>.
          Ví dụ <b className="text-accent">h + ǎo = hǎo</b>. Chạm vào từng ô để nghe chữ ví dụ.
        </p>
      </div>
      <section>
        <h3 className="h-section mb-3">Bốn thanh điệu + thanh nhẹ</h3>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {data.tones.map((t) => (
            <button key={t.mark} className="card card-lift flex items-center gap-3 text-left" onClick={() => void say(t.example, speed)}>
              <ToneContour contour={t.contour} />
              <span>
                <span className="block text-2xl font-extrabold">{t.pinyin} <span className="han">{t.example}</span></span>
                <span className="block font-bold">{t.name_vi}</span>
                <span className="block text-sm text-muted">{t.desc_vi}</span>
              </span>
            </button>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <button className="btn-ghost" onClick={async () => { for (const t of data.tones) await say(t.example, speed); }}>▶ Nghe lần lượt mā má mǎ mà ma</button>
        </div>
      </section>
      <section>
        <h3 className="h-section mb-3">Thanh mẫu <span className="text-base font-medium text-muted">(phụ âm đầu)</span></h3>
        <div className="space-y-2">{data.initials.map((row, i) => <div key={i} className="flex flex-wrap gap-2">{row.map(cell)}</div>)}</div>
      </section>
      <section>
        <h3 className="h-section mb-3">Vận mẫu <span className="text-base font-medium text-muted">(phần vần)</span></h3>
        <div className="space-y-2">{data.finals.map((row, i) => <div key={i} className="flex flex-wrap gap-2">{row.map(cell)}</div>)}</div>
      </section>
      <section className="grid gap-3 md:grid-cols-2">
        {data.rules.map((r) => (
          <div key={r.title_vi} className="card">
            <h4 className="font-bold">{r.title_vi}</h4>
            <p className="mt-1 text-sm leading-relaxed">{r.body_vi}</p>
            {r.examples && (
              <div className="mt-2 flex flex-wrap gap-2">
                {r.examples.map((e) => (
                  <button key={e.zh} className="chip" onClick={() => void say(e.zh, speed)}>
                    <span className="han text-lg">{e.zh}</span> {e.pinyin} {e.note_vi && <span className="text-muted">({e.note_vi})</span>}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </section>
    </div>
  );
}

export function HanziIntroPanel({ data }: { data: HanziIntro }) {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <PandaMascot mood="explain" size={90} />
        <p className="max-w-prose flex-1">
          Chữ Hán được ghép từ các <b>nét</b> cơ bản theo <b>thứ tự</b> cố định. Nhiều chữ có <b>bộ thủ</b> gợi ý nghĩa –
          người Việt học chữ Hán có lợi thế nhờ âm Hán Việt!
        </p>
      </div>
      <section>
        <h3 className="h-section mb-3">Các nét cơ bản</h3>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {data.strokes.map((s) => (
            <div key={s.zh} className="card flex flex-col items-center text-center">
              <HanziBox char={s.sample} size={96} />
              <p className="mt-1 font-bold">{s.name_vi}</p>
              <p className="han text-sm text-muted">{s.zh}</p>
            </div>
          ))}
        </div>
      </section>
      <section>
        <h3 className="h-section mb-3">Quy tắc viết</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          {data.rules.map((r) => (
            <div key={r.title_vi} className="card flex items-center gap-3">
              <HanziBox char={r.example} size={90} />
              <div><p className="font-bold">{r.title_vi}</p><p className="text-sm text-muted">{r.body_vi}</p></div>
            </div>
          ))}
        </div>
      </section>
      <section>
        <h3 className="h-section mb-3">Bộ thủ thường gặp</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead><tr className="text-sm text-muted"><th className="py-1">Bộ</th><th>Ý nghĩa</th><th>Ví dụ</th></tr></thead>
            <tbody>
              {data.radicals.map((r) => (
                <tr key={r.r} className="border-t border-line"><td className="han py-2 text-3xl">{r.r}</td><td>{r.meaning_vi}</td><td className="han text-xl">{r.examples}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

export function Warmup({ items, levelId, onDone }: { items: NonNullable<Lesson['warmup']>; levelId: string; onDone: () => void }) {
  const [v, setV] = useState<Record<number, number>>({});
  const order = useMemo(() => permutation(items.length), [items]);
  const { pinyin } = useLevelPrefs(levelId);
  const done = Object.keys(v).filter((k) => Number(k) >= 0).length === items.length;
  useEffect(() => { if (done) onDone(); }, [done, onDone]);
  return (
    <div>
      <p className="mb-3">Nối mỗi bức tranh với từ phù hợp – giống dạng đề HSK 3.0.</p>
      <MatchBoard
        left={items.map((i) => i.emoji)}
        right={items.map((i) => i.word)}
        rightOrder={order}
        value={v}
        onChange={(n) => setV(Object.fromEntries(Object.entries(n).filter(([k]) => Number(k) >= 0)))}
        isCorrect={(l, r) => l === r}
        levelId={levelId}
        pinyin={pinyin}
        leftIsEmoji
      />
      {done && <p className="pop mt-3 font-bold text-good">🎉 Khởi động xong!</p>}
    </div>
  );
}

/** Ghi âm để tự nghe lại (MediaRecorder) */
export function Recorder() {
  const [state, setState] = useState<'idle' | 'rec' | 'done' | 'denied'>('idle');
  const [url, setUrl] = useState<string | null>(null);
  const rec = useRef<MediaRecorder | null>(null);
  const supported = typeof window !== 'undefined' && 'MediaRecorder' in window && !!navigator.mediaDevices?.getUserMedia;
  useEffect(() => () => { if (url) URL.revokeObjectURL(url); }, [url]);
  if (!supported) return <p className="text-sm text-muted">Trình duyệt này chưa hỗ trợ ghi âm.</p>;
  const start = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const r = new MediaRecorder(stream);
      const chunks: Blob[] = [];
      r.ondataavailable = (e) => chunks.push(e.data);
      r.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        if (url) URL.revokeObjectURL(url);
        setUrl(URL.createObjectURL(new Blob(chunks, { type: r.mimeType })));
        setState('done');
      };
      r.start();
      rec.current = r;
      setState('rec');
    } catch {
      setState('denied');
    }
  };
  return (
    <div className="flex flex-wrap items-center gap-2">
      {state !== 'rec' ? (
        <button className="btn-primary" onClick={start}>🎙️ {state === 'done' ? 'Ghi âm lại' : 'Ghi âm'}</button>
      ) : (
        <button className="btn-ghost border-bad text-bad" onClick={() => rec.current?.stop()}>⏹ Dừng ghi</button>
      )}
      {state === 'rec' && <span className="animate-pulse font-semibold text-bad">● Đang ghi…</span>}
      {url && <audio controls src={url} className="max-w-full" aria-label="Bản ghi của bạn" />}
      {state === 'denied' && <p className="text-sm text-bad">Chưa có quyền dùng micro. Hãy cho phép micro trong trình duyệt rồi thử lại.</p>}
    </div>
  );
}

export function TongueTwister({ data, levelId }: { data: NonNullable<Lesson['tongueTwister']>; levelId: string }) {
  const { speed } = useLevelPrefs(levelId);
  return (
    <div className="space-y-4">
      <div className="card">
        <ZhText text={data.zh} levelId={levelId} pinyin="always" size="xl" />
        <p className="mt-2 text-muted">{data.vi}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {[0.5, 0.75, 1].map((r) => (
            <button key={r} className="btn-ghost" onClick={() => void say(data.zh, r, data.audio)}>▶ {r}x</button>
          ))}
        </div>
      </div>
      <div className="card">
        <h3 className="mb-2 font-bold">Đến lượt bạn!</h3>
        <p className="mb-3 text-sm text-muted">Nghe ở tốc độ chậm trước, rồi ghi âm giọng mình và so sánh. Tăng dần tốc độ đến 1x nhé.</p>
        <Recorder />
      </div>
      <PangdaTip>Đọc nói nhịu 3 lần mỗi ngày, mỗi lần nhanh hơn một chút. Sai thì cười một cái rồi đọc lại – Pàngdá cũng líu lưỡi suốt! <SpeakButton text={data.zh} rate={speed} size="sm" /></PangdaTip>
    </div>
  );
}

export function ActivityPanel({ data, levelId, upTo }: { data: NonNullable<Lesson['activity']>; levelId: string; upTo: number }) {
  const { speed, pinyin } = useLevelPrefs(levelId);
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="card">
        <h3 className="mb-2 text-lg font-extrabold">👥 {data.title_vi}</h3>
        <ol className="list-decimal space-y-2 pl-5">{data.steps_vi.map((s) => <li key={s}>{s}</li>)}</ol>
      </div>
      <div className="card">
        <h3 className="mb-2 font-bold">Mẫu câu gợi ý</h3>
        <ul className="space-y-2">
          {data.patterns.map((p) => (
            <li key={p.zh} className="flex items-start gap-2">
              <SpeakButton text={p.zh} rate={speed} size="sm" />
              <div><ZhText text={p.zh} levelId={levelId} pinyin={pinyin} upTo={upTo} /><p className="text-sm text-muted">{p.vi}</p></div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function NameMaker({ map }: { map: Record<string, [string, string]> }) {
  const [name, setName] = useState('');
  const parts = name.trim().split(/\s+/).filter(Boolean).map((w) => ({ w, hit: map[stripVi(w)] }));
  return (
    <div className="rounded-2xl border-2 border-primary/40 bg-primary/5 p-4">
      <label htmlFor="name-maker" className="font-bold">✨ Tên tiếng Trung của bạn</label>
      <input id="name-maker" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ví dụ: Trần Thiên Trung" className="mt-2 w-full rounded-xl border-2 border-line bg-bg px-3 py-2 text-lg focus:border-primary focus:outline-none" />
      {parts.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2" aria-live="polite">
          {parts.map((p, i) => (
            <div key={i} className={cls('tianzi flex w-20 flex-col items-center rounded-xl py-2', !p.hit && 'opacity-60')}>
              <span className="han text-3xl">{p.hit?.[0] ?? '？'}</span>
              <span className="text-xs font-semibold">{p.hit?.[1] ?? '—'}</span>
              <span className="text-[11px] text-muted">{p.w}</span>
            </div>
          ))}
          {parts.every((p) => p.hit) && <SpeakButton text={parts.map((p) => p.hit![0]).join('')} />}
        </div>
      )}
      <p className="mt-2 text-xs text-muted">Đây chỉ là gợi ý phổ biến. Một âm Hán Việt có thể ứng với nhiều chữ khác nhau.</p>
    </div>
  );
}

export function CulturePanel({ data }: { data: NonNullable<Lesson['culture']> }) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <PandaMascot mood="wave" size={80} />
        <div>
          <p className="text-sm font-bold text-accent"><span className="han">小语的彩蛋</span> – Góc văn hoá của Pàngdá</p>
          <h3 className="text-2xl font-extrabold">{data.title_vi}</h3>
        </div>
      </div>
      <div className="card space-y-3 leading-relaxed">{data.body_vi.map((p) => <p key={p}>{p}</p>)}</div>
      {data.table && (
        <div className="card overflow-x-auto">
          <table className="w-full text-left">
            <thead><tr className="text-sm text-muted">{data.table.head.map((h) => <th key={h} className="py-1 pr-3">{h}</th>)}</tr></thead>
            <tbody>
              {data.table.rows.map((r) => (
                <tr key={r.join()} className="border-t border-line">
                  {r.map((c, i) => <td key={i} className={cls('py-2 pr-3', /[\u4e00-\u9fff]/.test(c) && 'han text-lg')}>{c}</td>)}
                  {r.some((c) => /[\u4e00-\u9fff]/.test(c)) && (
                    <td className="py-1 text-right"><SpeakButton text={r.find((c) => /[\u4e00-\u9fff]/.test(c))!.replace(/[a-zA-Zāáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜü\s]/g, '')} size="sm" /></td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {data.nameMap && <NameMaker map={data.nameMap} />}
    </div>
  );
}


