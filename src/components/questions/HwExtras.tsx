import { useEffect, useState } from 'react';
import { playSrc, stopAll } from '../../lib/audio';
import { hwImage } from '../../lib/data';
import { cls } from '../../lib/util';
import type { HwAudio, HwQuestion, HwSection } from '../../types';

/** Nút nghe một đoạn trong file nghe của bài tập (nghe lại được, vì đây là bài luyện ở nhà) */
export function ClipButton({ clip, fallbackSrc, label = 'Nghe' }: { clip: HwAudio; fallbackSrc?: string; label?: string }) {
  const [playing, setPlaying] = useState(false);
  const [missing, setMissing] = useState(false);
  const src = clip.src ?? fallbackSrc;
  useEffect(() => () => { stopAll(); }, []);
  if (!src) return null;
  const play = async () => {
    if (playing) { stopAll(); setPlaying(false); return; }
    stopAll();
    setPlaying(true);
    const ok = await playSrc(src, 1, undefined, { start: clip.start, end: clip.end });
    setPlaying(false);
    if (!ok) setMissing(true);
  };
  return (
    <div className="mb-3 flex flex-wrap items-center gap-2">
      <button className={cls('btn-primary !py-2', playing && 'animate-pulse')} onClick={play} aria-pressed={playing}>
        {playing ? '⏹ Dừng' : `🔊 ${label}`}
      </button>
      <span className="text-sm text-muted">{missing ? 'Không tải được file nghe.' : 'Mỗi đoạn được đọc hai lần, giống bài thi. Bấm lại để nghe thêm.'}</span>
    </div>
  );
}

/** Bảng tranh A, B, C… dùng chung trong một phần */
export function ImageBank({ images, levelId }: { images: NonNullable<HwSection['images']>; levelId: string }) {
  return (
    <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
      {images.map((b) => {
        const src = hwImage(levelId, b.img);
        return (
          <figure key={b.key} className="rounded-2xl border-2 border-line bg-card p-2 text-center">
            {src ? <img src={src} alt={`Tranh ${b.key}`} className="mx-auto h-28 w-full rounded-xl bg-white object-contain sm:h-32" /> : <div className="h-28 text-sm text-bad">Thiếu ảnh</div>}
            <figcaption className="mt-1 text-lg font-bold">{b.key}</figcaption>
          </figure>
        );
      })}
    </div>
  );
}

/** Bảng từ tham khảo của phần từ vựng */
export function WordTable({ rows }: { rows: NonNullable<HwSection['wordTable']> }) {
  return (
    <div className="mt-3 overflow-x-auto">
      <table className="w-full min-w-[320px] text-left">
        <tbody>
          {rows.map((r) => (
            <tr key={r.head} className="border-t border-line align-top">
              <th className="w-28 py-2 pr-2 text-sm font-semibold text-muted">{r.head}</th>
              <td className="han py-2 text-lg">{r.words.join('、')}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

type WriteQ = Extract<HwQuestion, { kind: 'charFill' | 'sentence' }>;

/** Viết chữ Hán theo pinyin · nhìn tranh dùng từ đặt câu */
export function WriteQuestion({ q, value, onChange, levelId, review }: { q: WriteQ; value: unknown; onChange: (v: string) => void; levelId: string; review?: boolean }) {
  const v = typeof value === 'string' ? value : '';
  if (q.kind === 'charFill') {
    const [before, after] = q.text.split('___');
    return (
      <div>
        <p className="mb-2 text-sm font-semibold text-muted">Viết chữ Hán theo pinyin vào chỗ trống.</p>
        <p className="han text-2xl leading-loose">
          {before}
          <span className="inline-flex flex-col items-center align-bottom">
            <span className="text-sm font-semibold text-accent">{q.pinyin}</span>
            <input
              value={v}
              onChange={(e) => onChange(e.target.value)}
              disabled={review}
              maxLength={4}
              aria-label={`Chữ Hán cho ${q.pinyin}`}
              className="han w-20 rounded-xl border-2 border-line bg-card px-2 py-1 text-center text-2xl focus:border-primary focus:outline-none"
            />
          </span>
          {after}
        </p>
      </div>
    );
  }
  const src = q.img ? hwImage(levelId, q.img) : undefined;
  return (
    <div>
      <p className="mb-2 text-sm font-semibold text-muted">Nhìn tranh, dùng từ cho sẵn để đặt một câu.</p>
      <div className="flex flex-wrap items-center gap-3">
        {src && <img src={src} alt="Tranh gợi ý" className="h-36 w-auto max-w-full rounded-2xl border-2 border-line bg-white object-contain" />}
        <span className="han rounded-xl bg-primary/15 px-3 py-1 text-2xl font-bold">{q.word}</span>
      </div>
      <textarea
        value={v}
        onChange={(e) => onChange(e.target.value)}
        disabled={review}
        rows={2}
        placeholder={`Đặt câu có từ “${q.word}”…`}
        aria-label={`Đặt câu với từ ${q.word}`}
        className="han mt-3 w-full rounded-2xl border-2 border-line bg-card p-3 text-xl focus:border-primary focus:outline-none"
      />
      <p className="mt-1 text-xs text-muted">Câu đạt khi có từ “{q.word}” và đủ dài (ít nhất {q.word.length + 4} chữ Hán). Sau khi nộp sẽ có câu mẫu để so sánh.</p>
    </div>
  );
}
