import { useMemo, useState } from 'react';
import { learnedWords, stripTones } from '../../lib/dict';
import { cls } from '../../lib/util';
import type { HwQuestion } from '../../types';

type TranslateQ = Extract<HwQuestion, { kind: 'translate' }>;
export interface TranslateValue { text: string; noBank?: boolean }

/**
 * Dịch Việt → Trung. Gõ bằng bộ gõ của máy; HSK 1 có thêm "Gõ bằng pinyin" (pinyin không dấu → chọn từ đã học)
 * và ngân hàng từ gợi ý (tắt đi để nhận XP thưởng).
 */
export function TranslateQuestion({ q, value, onChange, levelId, upTo, allowPinyinInput, allowBank, disabled }: {
  q: TranslateQ; value?: TranslateValue; onChange: (v: TranslateValue) => void; levelId: string; upTo: number;
  allowPinyinInput: boolean; allowBank: boolean; disabled?: boolean;
}) {
  const v = value ?? { text: '', noBank: false };
  const [pyMode, setPyMode] = useState(false);
  const [py, setPy] = useState('');
  const words = useMemo(() => learnedWords(levelId, upTo), [levelId, upTo]);
  const candidates = useMemo(() => {
    const key = py.trim().toLowerCase().replace(/\s+/g, '').replace(/ü/g, 'v');
    if (!key) return [];
    return words
      .filter((w) => stripTones(w.pinyin).replace(/\s+/g, '').startsWith(key))
      .sort((a, b) => a.pinyin.length - b.pinyin.length)
      .slice(0, 12);
  }, [py, words]);

  const append = (s: string) => onChange({ ...v, text: v.text + s });

  return (
    <div className="space-y-3">
      <p className="text-lg font-semibold">🇻🇳 {q.prompt_vi}</p>
      <label className="block">
        <span className="sr-only">Câu tiếng Trung của bạn</span>
        <textarea
          lang="zh-CN"
          rows={2}
          value={v.text}
          disabled={disabled}
          onChange={(e) => onChange({ ...v, text: e.target.value })}
          placeholder="Gõ chữ Hán ở đây…"
          className="han w-full resize-none rounded-2xl border-2 border-line bg-bg p-3 text-xl focus:border-primary focus:outline-none"
        />
      </label>
      <div className="flex flex-wrap gap-2">
        {allowPinyinInput && (
          <button className={cls('chip', pyMode && 'chip-on')} onClick={() => setPyMode((m) => !m)} aria-pressed={pyMode} disabled={disabled}>
            ⌨️ Gõ bằng pinyin
          </button>
        )}
        <button className="chip" onClick={() => onChange({ ...v, text: [...v.text].slice(0, -1).join('') })} disabled={disabled || !v.text}>⌫ Xoá 1 chữ</button>
        <button className="chip" onClick={() => onChange({ ...v, text: '' })} disabled={disabled || !v.text}>Xoá hết</button>
        {['，', '。', '？', '！'].map((p) => (
          <button key={p} className="chip han" onClick={() => append(p)} disabled={disabled} aria-label={`Thêm dấu ${p}`}>{p}</button>
        ))}
      </div>

      {pyMode && (
        <div className="rounded-2xl border-2 border-primary/40 bg-primary/5 p-3">
          <label className="label" htmlFor={`py-${q.id}`}>Gõ pinyin không dấu (vd. nihao, laoshi)</label>
          <input
            id={`py-${q.id}`}
            value={py}
            onChange={(e) => setPy(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && candidates[0]) { append(candidates[0].zh); setPy(''); } }}
            autoComplete="off"
            autoCapitalize="off"
            className="mt-1 w-full rounded-xl border-2 border-line bg-bg px-3 py-2 text-lg focus:border-primary focus:outline-none"
          />
          <div className="mt-2 flex flex-wrap gap-2" aria-live="polite">
            {candidates.map((c, i) => (
              <button key={c.zh} className="tile" onClick={() => { append(c.zh); setPy(''); }}>
                <span className="text-xs text-muted">{i + 1}</span>
                <span className="ml-1">{c.zh}</span>
                <span className="ml-1 font-sans text-xs text-muted">{c.pinyin}</span>
              </button>
            ))}
            {py && candidates.length === 0 && <span className="text-sm text-muted">Không có từ đã học khớp “{py}”.</span>}
          </div>
        </div>
      )}

      {allowBank && q.wordBank && (
        <div className="rounded-2xl bg-surface p-3">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <span className="label">💡 Ngân hàng từ gợi ý</span>
            <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold">
              <input type="checkbox" className="h-5 w-5 accent-[rgb(var(--c-primary))]" checked={!!v.noBank} onChange={(e) => onChange({ ...v, noBank: e.target.checked })} disabled={disabled} />
              Tắt gợi ý (+5 XP thưởng)
            </label>
          </div>
          {!v.noBank && (
            <div className="flex flex-wrap gap-2">
              {q.wordBank.map((w) => <button key={w} className="tile" onClick={() => append(w)} disabled={disabled}>{w}</button>)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
