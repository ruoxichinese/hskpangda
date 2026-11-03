import { describe, expect, it } from 'vitest';
import comps from '../data/components.json';
import { getLevelVocab } from './data';

describe('Game từ vựng', () => {
  const data = comps as Record<string, { s: string; p: string[] }>;
  it('dữ liệu bộ kiện: cấu tạo trái–phải / trên–dưới, đúng 2 bộ kiện', () => {
    for (const [c, x] of Object.entries(data)) {
      expect(['⿰', '⿱']).toContain(x.s);
      expect(x.p).toHaveLength(2);
      for (const part of x.p) expect([...part]).toHaveLength(1);
      expect([...c]).toHaveLength(1);
    }
  });
  it('mỗi cấp HSK 1–3 có đủ chữ ghép và câu ví dụ để chơi', () => {
    for (const lv of ['hsk1', 'hsk2', 'hsk3']) {
      const words = getLevelVocab(lv);
      const build = new Set(words.flatMap((w) => [...w.zh].filter((c) => data[c])));
      const fill = words.filter((w) => w.example && w.example.zh.replace(/\{(.)\|[^}]*\}/g, '$1').includes(w.zh));
      expect(build.size, lv).toBeGreaterThanOrEqual(10);
      expect(fill.length, lv).toBeGreaterThanOrEqual(10);
    }
  });
});
