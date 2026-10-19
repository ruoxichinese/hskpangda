import { describe, expect, it } from 'vitest';
import { buildSummary, mergeSnapshots, type Snapshot } from './sync';

const base = (): Snapshot => ({
  version: 1,
  global: { xp: 0, badges: [], streak: { count: 0, last: null }, lastLevel: 'hsk1', lastVisit: null },
  levels: {},
});

describe('mergeSnapshots', () => {
  it('không có dữ liệu trên mạng → giữ nguyên máy này', () => {
    const a = base();
    a.global.xp = 50;
    expect(mergeSnapshots(a, null)).toBe(a);
  });

  it('gộp hai thiết bị: hợp phần đã học, lấy điểm cao nhất, hợp từ đã thuộc', () => {
    const laptop = base();
    laptop.global = { xp: 120, badges: ['first-lesson'], streak: { count: 3, last: '2026-10-18' }, lastLevel: 'hsk1', lastVisit: '2026-10-18' };
    laptop.levels.hsk1 = {
      lessons: { 1: { sections: ['text-1', 'text-2'], completed: true, exScore: 70 } },
      homework: { 1: { best: 80, passed: true, attempts: 2, history: [60, 80], last: { score: 80, results: {}, answers: {}, order: {}, at: 100 } } },
      known: ['你好', '老师'], wrong: { 再见: 2 }, games: { '1:tone': 60 }, review: {},
    };
    const phone = base();
    phone.global = { xp: 90, badges: ['tone-master'], streak: { count: 4, last: '2026-10-19' }, lastLevel: 'hsk2', lastVisit: '2026-10-19' };
    phone.levels.hsk1 = {
      lessons: { 1: { sections: ['text-3'], exScore: 90 }, 2: { sections: ['goals'] } },
      homework: { 1: { best: 95, passed: true, attempts: 1, history: [95], last: { score: 95, results: {}, answers: {}, order: {}, at: 200 } } },
      known: ['老师', '谢谢'], wrong: { 再见: 1, 您: 3 }, games: { '1:tone': 80 }, review: {},
    };
    const m = mergeSnapshots(laptop, phone);
    const l = m.levels.hsk1;
    expect(l.lessons[1].sections.sort()).toEqual(['text-1', 'text-2', 'text-3']);
    expect(l.lessons[1].completed).toBe(true);
    expect(l.lessons[1].exScore).toBe(90);
    expect(l.lessons[2]).toBeDefined();
    expect(l.homework[1].best).toBe(95);
    expect(l.homework[1].attempts).toBe(2);
    expect(l.homework[1].last?.score).toBe(95);
    expect(l.known.sort()).toEqual(['你好', '老师', '谢谢'].sort());
    expect(l.wrong).toEqual({ 再见: 2, 您: 3 });
    expect(l.games['1:tone']).toBe(80);
    expect(m.global.xp).toBe(120);
    expect(m.global.badges.sort()).toEqual(['first-lesson', 'tone-master']);
    expect(m.global.streak).toEqual({ count: 4, last: '2026-10-19' });
    // chuỗi 5 ngày đến hôm qua (máy A) + hôm nay học lần đầu ở máy B → 6
    const x = base(); x.global.streak = { count: 5, last: '2026-10-18' };
    const y = base(); y.global.streak = { count: 1, last: '2026-10-19' };
    expect(mergeSnapshots(y, x).global.streak).toEqual({ count: 6, last: '2026-10-19' });
    expect(m.global.lastLevel).toBe('hsk2');
  });

  it('bỏ bản nháp cũ nếu bài đã được nộp sau đó ở máy khác', () => {
    const a = base();
    a.levels.hsk1 = { lessons: {}, homework: { 1: { best: 0, passed: false, attempts: 0, history: [], draft: { answers: {}, order: {}, noHints: {}, index: 3, startedAt: 100 } } }, known: [], wrong: {}, games: {}, review: {} };
    const b = base();
    b.global.xp = 1;
    b.levels.hsk1 = { lessons: {}, homework: { 1: { best: 70, passed: true, attempts: 1, history: [70], last: { score: 70, results: {}, answers: {}, order: {}, at: 500 } } }, known: [], wrong: {}, games: {}, review: {} };
    const m = mergeSnapshots(a, b);
    expect(m.levels.hsk1.homework[1].draft).toBeUndefined();
    expect(m.levels.hsk1.homework[1].passed).toBe(true);
  });

  it('gộp là giao hoán về điểm số', () => {
    const a = base(); a.global.xp = 5; a.levels.hsk2 = { lessons: { 1: { sections: ['x'], completed: true } }, homework: {}, known: ['a'], wrong: {}, games: {}, review: {} };
    const b = base(); b.global.xp = 9; b.levels.hsk2 = { lessons: { 3: { sections: ['y'] } }, homework: {}, known: ['b'], wrong: {}, games: {}, review: {} };
    const ab = mergeSnapshots(a, b), ba = mergeSnapshots(b, a);
    expect(ab.global.xp).toBe(ba.global.xp);
    expect(Object.keys(ab.levels.hsk2.lessons).sort()).toEqual(Object.keys(ba.levels.hsk2.lessons).sort());
  });
});

describe('buildSummary', () => {
  it('tóm tắt cho giáo viên', () => {
    const s = base();
    s.global.xp = 300;
    s.levels.hsk1 = { lessons: { 1: { sections: [], completed: true }, 2: { sections: ['goals'] } }, homework: { 1: { best: 88, passed: true, attempts: 2, history: [] } }, known: ['你'], wrong: { 您: 4, 再见: 1 }, games: {}, review: {} };
    s.levels.hsk2 = { lessons: {}, homework: {}, known: [], wrong: {}, games: {}, review: {} };
    const sum = buildSummary(s, () => 2);
    expect(sum.xp).toBe(300);
    expect(sum.levels.hsk1.completed).toEqual([1]);
    expect(sum.levels.hsk1.homework[1]).toEqual({ best: 88, passed: true, attempts: 2 });
    expect(sum.levels.hsk1.wrongTop[0]).toEqual(['您', 4]);
    expect(sum.levels.hsk2).toBeUndefined();
  });
});
