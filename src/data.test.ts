import { describe, expect, it } from 'vitest';
import { getHomework, getLessons, isReady, levels } from './data';
import { getDict, segment } from './dict';


/** Gom mọi chuỗi tiếng Trung trong một object (bỏ qua các trường giải thích tiếng Việt & bảng văn hoá) */
function collectZh(o: unknown, out: string[] = [], key = ''): string[] {
  const skip = ['vi', 'explain_vi', 'context_vi', 'desc_vi', 'body_vi', 'pangdaTip', 'pinyinIntro', 'hanziIntro', 'culture', 'title', 'grammarTopics_vi', 'why_vi', 'prompt_vi', 'statement_vi', 'note_vi', 'formula', 'title_zh'];
  if (skip.includes(key)) return out;
  if (typeof o === 'string') { if (/[\u4e00-\u9fff]/.test(o)) out.push(o); }
  else if (Array.isArray(o)) o.forEach((x) => collectZh(x, out, key));
  else if (o && typeof o === 'object') Object.entries(o).forEach(([k, v]) => collectZh(v, out, k));
  return out;
}

for (const level of levels.filter((l) => l.available)) {
  const dict = getDict(level.id);
  describe(`Dữ liệu ${level.id}`, () => {
    for (const lesson of getLessons(level.id).filter(isReady)) {
      it(`bài ${lesson.id}: mọi chữ Hán đều có trong từ điển (để tự sinh pinyin)`, () => {
        const missing = new Set<string>();
        for (const s of collectZh(lesson)) for (const seg of segment(s, dict)) if (seg.han && !seg.entry) missing.add(seg.text);
        expect([...missing]).toEqual([]);
      });

      const hw = getHomework(level.id, lesson.id);
      if (!hw || !isReady(hw)) continue;
      it(`bài tập về nhà ${lesson.id}: 15–20 câu, chỉ dùng từ đã học, đáp án hợp lệ`, () => {
        const qs = hw.sections.flatMap((s) => s.questions.map((q) => ({ q, type: s.type })));
        expect(qs.length).toBeGreaterThanOrEqual(15);
        expect(qs.length).toBeLessThanOrEqual(20);
        const reading = qs.filter((x) => x.type === 'reading').length;
        expect(reading).toBeGreaterThanOrEqual(7);
        expect(reading).toBeLessThanOrEqual(9);

        const tooAdvanced = new Set<string>();
        const unknown = new Set<string>();
        // điền đáp án vào chỗ trống trước khi tách từ (不{{3}} + 客气 → 不客气)
        const filled = JSON.parse(JSON.stringify(hw));
        for (const sec of filled.sections) for (const q of sec.questions) if (q.kind === 'cloze') {
          q.text = q.text.replace(/\{\{(\d+)\}\}/g, (_: string, n: string) => q.answers[Number(n) - 1]);
          q.bank = q.bank.filter((b: string) => !q.answers.includes(b));
        }
        for (const s of collectZh(filled)) {
          for (const seg of segment(s, dict)) {
            if (!seg.han) continue;
            if (!seg.entry) unknown.add(seg.text);
            else if (seg.entry.lesson > lesson.id) tooAdvanced.add(seg.text);
          }
        }
        expect([...unknown]).toEqual([]);
        expect([...tooAdvanced]).toEqual([]);

        for (const { q } of qs) {
          if (q.kind === 'mcq') expect(q.answer).toBeLessThan(q.options.length);
          if (q.kind === 'cloze') {
            const blanks = q.text.match(/\{\{\d+\}\}/g)?.length ?? 0;
            expect(blanks).toBe(q.answers.length);
            q.answers.forEach((a) => expect(q.bank).toContain(a));
          }
          if (q.kind === 'reorder') {
            // mỗi đáp án phải dùng đúng các thẻ
            for (const a of q.answers) expect([...a].sort().join('')).toBe([...q.tiles.join('')].sort().join(''));
          }
        }
      });
    }
  });
}
