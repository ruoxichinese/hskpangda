import { describe, expect, it } from 'vitest';
import { examImage, getExams, levels } from './data';

describe('Đề thi thử', () => {
  const exams = levels.flatMap((l) => getExams(l.id));
  it('có ít nhất một đề', () => expect(exams.length).toBeGreaterThan(0));
  for (const e of exams) {
    it(`${e.level}/${e.id}: đủ câu, đáp án hợp lệ, mốc thời gian nghe tăng dần`, () => {
      const qs = e.sections.flatMap((s) => s.parts.flatMap((p) => p.questions.map((q) => ({ q, p, s }))));
      expect(new Set(qs.map((x) => x.q.id)).size).toBe(qs.length);
      const count = (id: string) => qs.filter((x) => x.s.id === id).length;
      expect([count('listening'), count('reading'), count('writing')]).toEqual([25, 25, 10]);
      for (const { q, p } of qs) {
        if (q.kind === 'pic3' || q.kind === 'text3') expect(['A', 'B', 'C']).toContain(q.answer);
        if (q.kind === 'bank' || q.kind === 'component') expect((p.bank ?? []).map((b) => b.key)).toContain(q.answer);
        if (q.kind === 'fillChar') { expect(q.text).toMatch(/（[^）]+）/); expect([...q.answer].length).toBe(1); }
        if (q.kind === 'component') expect(q.slot).toBeLessThan([...(q.word ?? '')].length);
      }
      const starts = qs.filter((x) => x.s.id === 'listening').map((x) => x.q.start ?? -1);
      expect(starts.every((t, i) => t >= 0 && (i === 0 || t > starts[i - 1]))).toBe(true);
      for (const s of e.sections.slice(1)) expect(s.seconds).toBeGreaterThan(0);
      const imgs = e.sections.flatMap((s) => s.parts.flatMap((p) => [
        ...(p.bank ?? []).map((b) => b.img),
        ...[...p.questions, ...(p.example ? [p.example] : [])].flatMap((q) => (q.options ?? []).map((o) => (typeof o === 'string' ? undefined : o.img))),
      ])).filter(Boolean) as string[];
      const missing = imgs.filter((i) => !examImage(e.level, i));
      expect(missing).toEqual([]);
    });
  }
});
