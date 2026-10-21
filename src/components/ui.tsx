import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { say, stopAll, type Seg } from '../lib/audio';
import { getCharacter } from '../lib/data';
import { cls } from '../lib/util';
import { BADGES, useProgress } from '../store/ProgressStore';

export function SpeakButton({ text, rate = 0.75, src, seg, label, className, size = 'md' }: {
  text: string; rate?: number; src?: string; seg?: Seg; label?: string; className?: string; size?: 'sm' | 'md' | 'lg';
}) {
  const [busy, setBusy] = useState(false);
  const dim = { sm: 'h-9 w-9 text-base', md: 'h-11 w-11 text-lg', lg: 'h-16 w-16 text-3xl' }[size];
  return (
    <button
      type="button"
      aria-label={label ?? `Nghe: ${text}`}
      className={cls('inline-flex shrink-0 items-center justify-center rounded-full border-2 border-line bg-bg hover:border-primary active:scale-95', busy && 'border-primary bg-primary/15', dim, className)}
      onClick={async (e) => {
        e.stopPropagation();
        setBusy(true);
        await say(text, rate, src, seg);
        setBusy(false);
      }}
    >
      {busy ? '🔊' : '🔈'}
    </button>
  );
}

export function SpeedPicker({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div role="radiogroup" aria-label="Tốc độ đọc" className="inline-flex gap-1">
      {[0.5, 0.75, 1].map((s) => (
        <button key={s} role="radio" aria-checked={value === s} className={cls('chip', value === s && 'chip-on')} onClick={() => onChange(s)}>
          {s}x
        </button>
      ))}
    </div>
  );
}

export function Confetti({ fire }: { fire: number }) {
  const pieces = useMemo(() => {
    if (!fire) return [];
    const colors = ['rgb(var(--c-primary))', 'rgb(var(--c-secondary))', '#F6E05E', '#68D391', '#63B3ED', '#F687B3'];
    return Array.from({ length: 70 }, (_, i) => ({
      id: `${fire}-${i}`,
      left: Math.random() * 100,
      dx: (Math.random() - 0.5) * 200,
      dur: 1.6 + Math.random() * 1.6,
      delay: Math.random() * 0.4,
      color: colors[i % colors.length],
    }));
  }, [fire]);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (!fire) return;
    setVisible(true);
    const t = setTimeout(() => setVisible(false), 3600);
    return () => clearTimeout(t);
  }, [fire]);
  if (!visible) return null;
  return (
    <div aria-hidden className="no-print">
      {pieces.map((p) => (
        <span
          key={p.id}
          className="confetti-piece"
          style={{ left: `${p.left}vw`, background: p.color, animationDelay: `${p.delay}s`, ['--dx' as string]: `${p.dx}px`, ['--dur' as string]: `${p.dur}s` }}
        />
      ))}
    </div>
  );
}

export function Modal({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    ref.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('keydown', onKey); stopAll(); prev?.focus(); };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4" onClick={onClose}>
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className="pop max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-bg p-5 shadow-2xl sm:rounded-3xl"
        style={{ paddingBottom: 'calc(1.25rem + env(safe-area-inset-bottom, 0px))' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="text-lg font-extrabold">{title}</h2>
          <button className="chip" onClick={onClose} aria-label="Đóng">✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Stars({ n, max = 3, size = 'text-lg' }: { n: number; max?: number; size?: string }) {
  return (
    <span className={size} aria-label={`${n} trên ${max} sao`}>
      {Array.from({ length: max }, (_, i) => (
        <span key={i} className={i < n ? '' : 'opacity-25 grayscale'}>⭐</span>
      ))}
    </span>
  );
}

export function ProgressBar({ value, max = 100, label }: { value: number; max?: number; label: string }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div role="progressbar" aria-label={label} aria-valuenow={Math.round(value)} aria-valuemin={0} aria-valuemax={max} className="h-3 w-full overflow-hidden rounded-full bg-line">
      <div className="h-full rounded-full" style={{ width: `${pct}%`, background: 'linear-gradient(90deg, rgb(var(--c-primary)), rgb(var(--c-secondary)))', transition: 'width .4s ease' }} />
    </div>
  );
}

export function Avatar({ id, size = 44 }: { id: string; size?: number }) {
  const c = getCharacter(id);
  const label = c ? (c.id === 'students' ? '👥' : c.id === 'xiaoyu' ? 'AI' : [...c.zh].slice(-1)[0]) : '?';
  return (
    <span
      className="han inline-flex shrink-0 items-center justify-center rounded-full font-bold text-white"
      style={{ width: size, height: size, background: c?.color ?? '#718096', fontSize: size * 0.4, lineHeight: 1, boxShadow: '0 0 0 3px rgb(var(--c-bg)), 0 0 0 5px ' + (c?.color ?? '#718096') + '55' }}
      aria-hidden
    >
      {label}
    </span>
  );
}

export function PangdaTip({ children, title = '💡 Mẹo của Pàngdá', sub = '小语助力' }: { children: ReactNode; title?: string; sub?: string }) {
  return (
    <aside className="flex gap-3 rounded-2xl border-2 border-dashed border-primary/60 bg-primary/5 p-4">
      <span className="text-3xl" aria-hidden>🐼</span>
      <div>
        <p className="font-bold">{title} <span className="han text-sm text-muted">{sub}</span></p>
        <div className="mt-1 leading-relaxed">{children}</div>
      </div>
    </aside>
  );
}

export function BadgeToast() {
  const { lastBadge, clearLastBadge } = useProgress();
  useEffect(() => {
    if (!lastBadge) return;
    const t = setTimeout(clearLastBadge, 4500);
    return () => clearTimeout(t);
  }, [lastBadge, clearLastBadge]);
  if (!lastBadge) return null;
  return (
    <div role="status" className="pop fixed bottom-24 left-1/2 z-50 -translate-x-1/2 rounded-full bg-ink px-5 py-3 font-bold text-bg shadow-xl lg:bottom-8">
      🏅 Huy hiệu mới! <BadgeName id={lastBadge} />
    </div>
  );
}
export function BadgeName({ id }: { id: string }) {
  const b = BADGES[id];
  return <span>{b ? `${b.emoji} ${b.name}` : id}</span>;
}

/** Tô màu thành phần câu cho công thức ngữ pháp */
export const ROLE_STYLE: Record<string, string> = {
  S: 'bg-sky-500/15 text-sky-900 border-sky-500/50 dark:text-sky-100',
  V: 'bg-rose-500/15 text-rose-900 border-rose-500/50 dark:text-rose-100',
  O: 'bg-emerald-500/15 text-emerald-900 border-emerald-500/50 dark:text-emerald-100',
  ADV: 'bg-violet-500/15 text-violet-900 border-violet-500/50 dark:text-violet-100',
  ATTR: 'bg-teal-500/15 text-teal-900 border-teal-500/50 dark:text-teal-100',
  PART: 'bg-amber-500/20 text-amber-900 border-amber-500/60 dark:text-amber-100',
  Q: 'bg-pink-500/15 text-pink-900 border-pink-500/50 dark:text-pink-100',
  N: 'bg-sky-500/15 text-sky-900 border-sky-500/50 dark:text-sky-100',
  X: 'bg-transparent border-transparent text-muted',
};
