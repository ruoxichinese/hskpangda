import { useState } from 'react';
import { useLevelPrefs } from '../store/ProgressStore';
import type { GrammarPoint, MiniQuiz } from '../types';
import { cls } from '../lib/util';
import { PandaMascot } from './panda/PandaMascot';
import { ROLE_STYLE, SpeakButton } from './ui';
import { ZhText } from './ZhText';

export function QuickCheck({ q, levelId, upTo, n, label = 'Kiểm tra nhanh' }: { q: MiniQuiz; levelId: string; upTo: number; n: number; label?: string }) {
  const [pick, setPick] = useState<number | null>(null);
  const { pinyin } = useLevelPrefs(levelId);
  return (
    <fieldset className="rounded-2xl border border-line bg-bg p-3">
      <legend className="px-1 text-sm font-bold">{label} {n}</legend>
      <p className="mb-2 font-medium">{q.prompt_zh && <ZhText text={q.prompt_zh} levelId={levelId} pinyin={pinyin} upTo={upTo} />} {q.prompt_vi}</p>
      <div className="grid gap-2 sm:grid-cols-3">
        {q.options.map((o, i) => (
          <button
            key={o}
            className={cls('opt', pick !== null && i === q.answer && 'opt-good', pick === i && i !== q.answer && 'opt-bad shake')}
            onClick={() => setPick(i)}
            aria-pressed={pick === i}
          >
            <ZhText text={o} levelId={levelId} pinyin={pinyin} upTo={upTo} />
          </button>
        ))}
      </div>
      {pick !== null && (
        <p aria-live="polite" className={cls('mt-2 font-medium', pick === q.answer ? 'text-good' : 'text-bad')}>
          {pick === q.answer ? '✓ Chính xác!' : '✗ Chưa đúng.'} {q.explain_vi}
        </p>
      )}
    </fieldset>
  );
}

export function GrammarCard({ g, levelId, lessonId, defaultOpen = true }: { g: GrammarPoint; levelId: string; lessonId: number; defaultOpen?: boolean }) {
  const { speed, pinyin, difficulty } = useLevelPrefs(levelId);
  return (
    <details id={g.id} open={defaultOpen} className="card scroll-mt-28">
      <summary className="flex cursor-pointer list-none items-center gap-3">
        <PandaMascot mood="explain" size={56} />
        <div className="min-w-0">
          <p className="text-xs font-bold text-accent"><span className="han">小语讲堂</span> – Pàngdá giảng ngữ pháp</p>
          <h3 className="text-lg font-extrabold leading-snug">
            {g.title_vi} <span className="han text-base font-medium text-muted">{g.title_zh}</span>
          </h3>
        </div>
      </summary>

      <div className="mt-4 space-y-4">
        <div className="space-y-2" aria-label="Công thức">
          {g.formula.map((row, ri) => (
            <div key={ri} className="flex flex-wrap items-end gap-1.5">
              {g.formulaNote?.[ri] && <span className="mr-1 self-center text-sm font-semibold text-muted">{g.formulaNote[ri]}:</span>}
              {row.map((part, pi) => (
                <span key={pi} className={cls('inline-flex flex-col items-center rounded-xl border-2 px-2.5 py-1', ROLE_STYLE[part.role])}>
                  <span className="han text-xl font-semibold leading-tight">{part.zh}</span>
                  {part.label && <span className="text-[11px] font-semibold">{part.label}</span>}
                </span>
              ))}
            </div>
          ))}
        </div>

        <p className="leading-relaxed">{g.explain_vi}</p>
        {difficulty.explainLanguage === 'vi+zh' && g.explain_zh && <p className="han text-muted">{g.explain_zh}</p>}

        <div>
          <h4 className="label mb-1">Ví dụ</h4>
          <ul className="space-y-2">
            {g.examples.map((ex) => (
              <li key={ex.zh} className="flex items-start gap-2">
                <SpeakButton text={ex.zh} rate={speed} size="sm" />
                <div>
                  <ZhText text={ex.zh} levelId={levelId} pinyin={pinyin} upTo={lessonId} />
                  <p className="text-sm text-muted">{ex.vi}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        {g.mistakes && g.mistakes.length > 0 && (
          <div className="rounded-2xl border-2 border-bad/30 bg-bad/5 p-3">
            <h4 className="mb-2 font-bold">⚠️ Lỗi hay gặp</h4>
            <ul className="space-y-3">
              {g.mistakes.map((m) => (
                <li key={m.wrong}>
                  <p>
                    <span className="font-bold text-bad" aria-label="Sai">✗</span>{' '}
                    <span className="han text-lg line-through decoration-bad/70">{m.wrong}</span>
                    <span className="mx-2 text-muted">→</span>
                    <span className="font-bold text-good" aria-label="Đúng">✓</span>{' '}
                    <span className="han text-lg">{m.right}</span>
                  </p>
                  <p className="text-sm text-muted">{m.why_vi}</p>
                </li>
              ))}
            </ul>
          </div>
        )}

        {g.quiz && g.quiz.length > 0 && (
          <div className="space-y-2">
            {g.quiz.map((q, i) => <QuickCheck key={i} q={q} levelId={levelId} upTo={lessonId} n={i + 1} />)}
          </div>
        )}
      </div>
    </details>
  );
}
