import { useMemo, useState } from 'react';
import { getDict, segment } from '../lib/dict';
import { cls } from '../lib/util';
import type { PinyinMode } from '../types';

/**
 * Hiển thị chữ Hán kèm pinyin (thẻ <ruby>), tự sinh pinyin từ từ điển của cấp.
 * - pinyin="always": luôn hiện | "tap": chạm vào câu để hiện | "hidden": ẩn
 * - upTo: số bài hiện tại → từ chưa học được gạch chân, chạm để xem nghĩa.
 */
export function ZhText({ text, levelId = 'hsk1', pinyin = 'always', upTo, className, size }: {
  text: string; levelId?: string; pinyin?: PinyinMode; upTo?: number; className?: string; size?: 'sm' | 'md' | 'lg' | 'xl';
}) {
  const [revealed, setRevealed] = useState(false);
  const [popup, setPopup] = useState<number | null>(null);
  const segs = useMemo(() => segment(text, getDict(levelId)), [text, levelId]);
  const show = pinyin === 'always' || (pinyin === 'tap' && revealed);
  // chữ Hán ≈ 1.3× chữ Việt (16px) ở cỡ mặc định
  const sizeCls = { sm: 'text-[1.15rem]', md: 'text-[1.3rem]', lg: 'text-[1.6rem]', xl: 'text-[2.4rem]' }[size ?? 'md'];

  const content = segs.map((s, i) => {
    if (!s.han) {
      return s.text.split('\n').map((part, j) => (
        <span key={`${i}-${j}`}>
          {j > 0 && <br />}
          {part}
        </span>
      ));
    }
    const isUnknown = upTo !== undefined && s.entry && !s.entry.known && (s.entry.lesson === 0 || s.entry.lesson > upTo);
    // chưa hiện pinyin thì không dựng <ruby> → chữ không bị giãn cách
    const ruby = !show ? (
      <span>{s.text}</span>
    ) : (
      <ruby className={cls(!show && 'rt-hidden')}>
        {s.text}
        <rt>{s.pinyin ?? ''}</rt>
      </ruby>
    );
    if (!isUnknown) return <span key={i}>{ruby}</span>;
    return (
      <span key={i} className="relative">
        <button
          type="button"
          className="unknown-word"
          aria-label={`Từ chưa học: ${s.text}. Chạm để xem nghĩa`}
          onClick={(e) => { e.stopPropagation(); setPopup(popup === i ? null : i); }}
        >
          {ruby}
        </button>
        {popup === i && (
          <span role="tooltip" className="pop absolute left-1/2 top-full z-30 mt-1 w-max max-w-[14rem] -translate-x-1/2 rounded-xl border-2 border-primary bg-bg px-3 py-2 text-left font-sans text-sm shadow-lg">
            <b className="han text-base">{s.text}</b> <span className="text-muted">{s.entry?.pinyin}</span>
            <br />
            {s.entry?.vi}
          </span>
        )}
      </span>
    );
  });

  if (pinyin === 'tap') {
    return (
      <span
        role="button"
        tabIndex={0}
        title={revealed ? 'Ẩn pinyin' : 'Chạm để hiện pinyin'}
        onClick={() => setRevealed((r) => !r)}
        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && setRevealed((r) => !r)}
        className={cls('han cursor-pointer', sizeCls, className)}
        lang="zh-CN"
      >
        {content}
      </span>
    );
  }
  return (
    <span className={cls('han', sizeCls, className)} lang="zh-CN">
      {content}
    </span>
  );
}
