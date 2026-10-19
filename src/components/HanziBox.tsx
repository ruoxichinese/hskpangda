import HanziWriter from 'hanzi-writer';
import { useEffect, useRef, useState } from 'react';

let localData: Record<string, unknown> | null = null;
async function loadLocal() {
  if (!localData) localData = (await import('../data/hanzi-strokes.json')).default as Record<string, unknown>;
  return localData;
}

/** Ưu tiên dữ liệu nét đã đóng gói; thiếu thì tải từ CDN */
export function charDataLoader(char: string, onLoad: (d: unknown) => void, onError: (e?: unknown) => void) {
  loadLocal()
    .then((m) => {
      if (m[char]) return onLoad(m[char]);
      return fetch(`https://cdn.jsdelivr.net/npm/hanzi-writer-data@2.0.1/${encodeURIComponent(char)}.json`)
        .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
        .then(onLoad);
    })
    .catch(onError);
}

function cssColor(name: string, fallback: string) {
  const v = getComputedStyle(document.documentElement).getPropertyValue(`--c-${name}`).trim();
  return v ? `rgb(${v.split(/\s+/).join(',')})` : fallback;
}

/**
 * Ô 田字格 hiển thị thứ tự nét (animate) hoặc chế độ luyện viết (quiz).
 */
export function HanziBox({ char, size = 140, mode = 'animate', onQuizDone, autoPlay }: {
  char: string; size?: number; mode?: 'animate' | 'quiz'; onQuizDone?: (mistakes: number) => void; autoPlay?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const writer = useRef<HanziWriter | null>(null);
  const [error, setError] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    if (!ref.current) return;
    ref.current.innerHTML = '';
    setError(false);
    setMsg('');
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const w = HanziWriter.create(ref.current, char, {
      width: size,
      height: size,
      padding: 6,
      showOutline: true,
      showCharacter: mode === 'animate',
      strokeColor: cssColor('text', '#1A202C'),
      outlineColor: 'rgba(160,160,170,.35)',
      radicalColor: cssColor('accent', '#B0570F'),
      highlightColor: cssColor('primary', '#ED8936'),
      drawingColor: cssColor('accent', '#B0570F'),
      strokeAnimationSpeed: reduce ? 3 : 1,
      delayBetweenStrokes: reduce ? 50 : 250,
      charDataLoader: charDataLoader as unknown as Parameters<typeof HanziWriter.create>[2] extends infer O ? O extends { charDataLoader?: infer L } ? L : never : never,
      onLoadCharDataError: () => setError(true),
    });
    writer.current = w;
    if (mode === 'quiz') {
      w.quiz({
        showHintAfterMisses: 2,
        onMistake: () => setMsg('Chưa đúng nét, thử lại nhé!'),
        onCorrectStroke: () => setMsg(''),
        onComplete: (s: { totalMistakes: number }) => { setMsg('Tuyệt!'); onQuizDone?.(s.totalMistakes); },
      });
    } else if (autoPlay) {
      w.animateCharacter();
    }
    return () => { writer.current = null; };
  }, [char, size, mode, autoPlay, onQuizDone]);

  return (
    <div className="inline-flex flex-col items-center gap-2">
      <div ref={ref} className="tianzi rounded-lg" style={{ width: size, height: size }} aria-label={`Chữ ${char}`} role="img" />
      {error && <p className="text-xs text-bad">Chưa tải được dữ liệu nét chữ.</p>}
      {mode === 'animate' && !error && (
        <button className="chip" onClick={() => writer.current?.animateCharacter()}>▶ Xem thứ tự nét</button>
      )}
      {mode === 'quiz' && <p aria-live="polite" className="h-5 text-sm font-medium text-muted">{msg}</p>}
    </div>
  );
}
