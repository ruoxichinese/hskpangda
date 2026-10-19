import { useState } from 'react';
import { cls } from '../../lib/util';
import type { PinyinMode } from '../../types';
import { ZhText } from '../ZhText';

/**
 * Sắp xếp thẻ từ. Máy tính: kéo thả. Điện thoại: chạm lần lượt để đưa thẻ vào câu, chạm thẻ trong câu để gỡ ra.
 * value = chỉ số các thẻ (trong mảng tiles) theo thứ tự người học đã xếp.
 */
export function ReorderQuestion({ tiles, value, onChange, levelId, pinyin = 'always', disabled, status }: {
  tiles: string[]; value: number[]; onChange: (v: number[]) => void; levelId: string; pinyin?: PinyinMode; disabled?: boolean; status?: 'good' | 'bad';
}) {
  const [drag, setDrag] = useState<{ from: 'pool' | 'answer'; idx: number } | null>(null);
  const pool = tiles.map((_, i) => i).filter((i) => !value.includes(i));

  const add = (i: number, at = value.length) => {
    if (disabled) return;
    const v = value.filter((x) => x !== i);
    v.splice(Math.min(at, v.length), 0, i);
    onChange(v);
  };
  const remove = (i: number) => !disabled && onChange(value.filter((x) => x !== i));

  const onDropAnswer = (at?: number) => {
    if (!drag) return;
    add(drag.idx, at);
    setDrag(null);
  };

  const Tile = ({ i, where, pos }: { i: number; where: 'pool' | 'answer'; pos?: number }) => (
    <button
      type="button"
      draggable={!disabled}
      onDragStart={() => setDrag({ from: where, idx: i })}
      onDragOver={(e) => where === 'answer' && e.preventDefault()}
      onDrop={(e) => { if (where === 'answer') { e.preventDefault(); e.stopPropagation(); onDropAnswer(pos); } }}
      onClick={() => (where === 'pool' ? add(i) : remove(i))}
      className={cls('tile', where === 'answer' && 'border-primary bg-primary/10')}
      aria-label={where === 'pool' ? `Thêm “${tiles[i]}” vào câu` : `Gỡ “${tiles[i]}” khỏi câu`}
      disabled={disabled}
    >
      <ZhText text={tiles[i]} levelId={levelId} pinyin={pinyin === 'hidden' ? 'hidden' : 'always'} className="!text-[1em] !leading-tight" />
    </button>
  );

  return (
    <div className="space-y-3">
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => { e.preventDefault(); onDropAnswer(); }}
        aria-label="Câu của bạn"
        className={cls(
          'flex min-h-[64px] flex-wrap items-center gap-2 rounded-2xl border-2 border-dashed p-2',
          status === 'good' ? 'border-good bg-good/10' : status === 'bad' ? 'border-bad bg-bad/10 shake' : 'border-primary/60 bg-bg',
        )}
      >
        {value.length === 0 && <span className="px-2 text-sm text-muted">Chạm hoặc kéo thẻ vào đây…</span>}
        {value.map((i, pos) => <Tile key={i} i={i} where="answer" pos={pos} />)}
      </div>
      <div className="flex flex-wrap gap-2" aria-label="Các thẻ từ">
        {pool.map((i) => <Tile key={i} i={i} where="pool" />)}
      </div>
    </div>
  );
}
