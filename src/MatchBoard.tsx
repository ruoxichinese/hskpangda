import { useState } from 'react';
import { cls } from '../../lib/util';
import type { PinyinMode } from '../../types';
import { ZhText } from '../ZhText';

const PAIR_COLORS = ['#ED8936', '#4299E1', '#48BB78', '#9F7AEA', '#ED64A6', '#319795'];

/**
 * Nối cột trái với cột phải: chạm một ô bên trái rồi chạm ô bên phải.
 * value: chỉ số trái → chỉ số phải (theo mảng gốc). rightOrder: thứ tự hiển thị cột phải.
 */
export function MatchBoard({ left, right, rightOrder, value, onChange, levelId, pinyin = 'always', upTo, isCorrect, disabled, leftIsEmoji }: {
  left: string[]; right: string[]; rightOrder: number[]; value: Record<number, number>; onChange: (v: Record<number, number>) => void;
  levelId: string; pinyin?: PinyinMode; upTo?: number; isCorrect?: (l: number, r: number) => boolean; disabled?: boolean; leftIsEmoji?: boolean;
}) {
  const [sel, setSel] = useState<number | null>(null);
  const pairOfRight = (r: number) => Object.entries(value).find(([, rv]) => rv === r)?.[0];
  const colorOf = (l: number) => PAIR_COLORS[l % PAIR_COLORS.length];

  const clickLeft = (l: number) => {
    if (disabled) return;
    if (value[l] !== undefined && !isCorrect) {
      const v = { ...value };
      delete v[l];
      onChange(v);
    }
    setSel(l);
  };
  const clickRight = (r: number) => {
    if (disabled || sel === null) return;
    if (isCorrect && !isCorrect(sel, r)) {
      setSel(null);
      onChange({ ...value, [-1 - sel]: r }); // ghi nhận lần sai (khoá âm) để engine biết
      return;
    }
    const v = { ...value };
    for (const k of Object.keys(v)) if (v[Number(k)] === r) delete v[Number(k)];
    v[sel] = r;
    onChange(v);
    setSel(null);
  };

  return (
    <div className="grid grid-cols-2 gap-3">
      <ul className="space-y-2" aria-label="Cột trái">
        {left.map((l, i) => {
          const paired = value[i] !== undefined;
          return (
            <li key={i}>
              <button
                className={cls('opt flex items-center gap-2', sel === i && 'opt-on', paired && 'border-[3px]')}
                style={paired ? { borderColor: colorOf(i) } : undefined}
                onClick={() => clickLeft(i)}
                aria-pressed={sel === i}
                disabled={disabled}
              >
                {paired && <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: colorOf(i) }} aria-hidden />}
                {leftIsEmoji ? <span className="text-3xl">{l}</span> : <ZhText text={l} levelId={levelId} pinyin={pinyin} upTo={upTo} size="sm" />}
              </button>
            </li>
          );
        })}
      </ul>
      <ul className="space-y-2" aria-label="Cột phải">
        {rightOrder.map((r) => {
          const lp = pairOfRight(r);
          const paired = lp !== undefined && Number(lp) >= 0;
          return (
            <li key={r}>
              <button
                className={cls('opt flex items-center gap-2', paired && 'border-[3px]')}
                style={paired ? { borderColor: colorOf(Number(lp)) } : undefined}
                onClick={() => clickRight(r)}
                disabled={disabled || (!!isCorrect && paired)}
              >
                {paired && <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: colorOf(Number(lp)) }} aria-hidden />}
                <ZhText text={right[r]} levelId={levelId} pinyin={pinyin} upTo={upTo} size="sm" />
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
