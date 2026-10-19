import { useState } from 'react';
import { cls } from '../../lib/util';
import type { HwQuestion, PinyinMode } from '../../types';
import { ZhText } from '../ZhText';
import { MatchBoard } from './MatchBoard';

type ReadingQ = Extract<HwQuestion, { kind: 'mcq' | 'truefalse' | 'match' | 'cloze' }>;

/**
 * Câu hỏi đọc hiểu: trắc nghiệm (A1), đúng/sai (A2), nối (A3), điền từ có ngân hàng từ (A4).
 * order: hoán vị hiển thị (đáp án trắc nghiệm / cột phải / ngân hàng từ) – xáo khi làm lại.
 * review: hiện đúng/sai sau khi nộp.
 */
export function ReadingQuestion({ q, value, onChange, order, levelId, upTo, pinyin, review }: {
  q: ReadingQ; value: unknown; onChange: (v: unknown) => void; order?: number[]; levelId: string; upTo: number; pinyin: PinyinMode; review?: boolean;
}) {
  const [blank, setBlank] = useState(0);

  if (q.kind === 'mcq') {
    const ord = order ?? q.options.map((_, i) => i);
    return (
      <fieldset>
        <legend className="mb-3 text-lg font-semibold">
          {q.prompt_zh ? <ZhText text={q.prompt_zh} levelId={levelId} pinyin={pinyin} upTo={upTo} size="lg" /> : q.prompt_vi}
          {q.prompt_zh && q.prompt_vi && <span className="block text-sm text-muted">{q.prompt_vi}</span>}
        </legend>
        <div className="grid gap-2">
          {ord.map((i, k) => (
            <label
              key={i}
              className={cls('opt flex cursor-pointer items-center gap-3', value === i && 'opt-on', review && i === q.answer && 'opt-good', review && value === i && i !== q.answer && 'opt-bad')}
            >
              <input type="radio" className="sr-only" name={q.id} checked={value === i} onChange={() => onChange(i)} disabled={review} />
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-line font-bold">{String.fromCharCode(65 + k)}</span>
              <ZhText text={q.options[i]} levelId={levelId} pinyin={pinyin} upTo={upTo} />
            </label>
          ))}
        </div>
      </fieldset>
    );
  }

  if (q.kind === 'truefalse') {
    return (
      <fieldset>
        <legend className="mb-1 text-sm font-semibold text-muted">Nhận định sau đúng hay sai so với bài đọc?</legend>
        <p className="mb-1"><ZhText text={q.statement_zh} levelId={levelId} pinyin={pinyin} upTo={upTo} size="lg" /></p>
        {q.statement_vi && <p className="mb-3 font-medium">{q.statement_vi}</p>}
        <div className="grid grid-cols-2 gap-2">
          {[true, false].map((b) => (
            <button
              key={String(b)}
              aria-pressed={value === b}
              disabled={review}
              className={cls('opt text-center text-lg font-bold', value === b && 'opt-on', review && b === q.answer && 'opt-good', review && value === b && b !== q.answer && 'opt-bad')}
              onClick={() => onChange(b)}
            >
              {b ? '✓ Đúng' : '✗ Sai'}
            </button>
          ))}
        </div>
      </fieldset>
    );
  }

  if (q.kind === 'match') {
    const v = (value as Record<number, number>) ?? {};
    return (
      <div>
        <p className="mb-3 font-semibold">{q.prompt_vi ?? 'Nối mỗi câu bên trái với câu phù hợp bên phải.'}</p>
        <MatchBoard
          left={q.pairs.map((p) => p.q)}
          right={q.pairs.map((p) => p.a)}
          rightOrder={order ?? q.pairs.map((_, i) => i)}
          value={v}
          onChange={onChange}
          levelId={levelId}
          pinyin={pinyin}
          upTo={upTo}
          disabled={review}
        />
        {review && (
          <ul className="mt-3 space-y-1 text-sm">
            {q.pairs.map((p, i) => (
              <li key={i} className={v[i] === i ? 'text-good' : 'text-bad'}>
                {v[i] === i ? '✓' : '✗'} <span className="han">{p.q} → {p.a}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  }

  // cloze
  const answers = (value as string[]) ?? [];
  const parts = q.text.split(/(\{\{\d+\}\})/);
  const bankOrder = order ?? q.bank.map((_, i) => i);
  const fill = (w: string) => {
    if (review) return;
    const next = [...answers];
    next[blank] = w;
    onChange(next);
    const empty = q.answers.findIndex((_, i) => !next[i]);
    setBlank(empty >= 0 ? empty : blank);
  };
  return (
    <div>
      <p className="mb-2 font-semibold">{q.prompt_vi ?? 'Chạm vào chỗ trống, rồi chọn từ trong ngân hàng từ.'}</p>
      <div className="mb-3 flex flex-wrap gap-2" aria-label="Ngân hàng từ">
        {bankOrder.map((i) => {
          const w = q.bank[i];
          return (
            <button key={w} className={cls('tile', answers.includes(w) && 'opacity-40')} onClick={() => fill(w)} disabled={review}>
              <ZhText text={w} levelId={levelId} pinyin={pinyin === 'hidden' ? 'hidden' : 'always'} className="!text-[1em]" />
            </button>
          );
        })}
      </div>
      <div className="han rounded-2xl bg-surface p-3 text-lg leading-[2.6]">
        {parts.map((p, k) => {
          const m = p.match(/\{\{(\d+)\}\}/);
          if (!m) return <ZhText key={k} text={p} levelId={levelId} pinyin={pinyin} upTo={upTo} className="!text-[1em]" />;
          const bi = Number(m[1]) - 1;
          const ok = review ? answers[bi] === q.answers[bi] : undefined;
          return (
            <button
              key={k}
              onClick={() => !review && setBlank(bi)}
              aria-label={`Chỗ trống ${bi + 1}${answers[bi] ? `: ${answers[bi]}` : ''}`}
              className={cls(
                'mx-1 inline-flex min-w-[3.5rem] items-center justify-center rounded-lg border-b-4 px-2 align-middle font-semibold leading-tight',
                blank === bi && !review ? 'border-primary bg-primary/15' : 'border-line bg-bg',
                ok === true && 'border-good bg-good/10', ok === false && 'border-bad bg-bad/10',
              )}
            >
              <sup className="mr-1 text-xs text-muted">{bi + 1}</sup>{answers[bi] || '\u00a0'}
              {ok === false && <span className="ml-1 text-sm text-good">→{q.answers[bi]}</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}
