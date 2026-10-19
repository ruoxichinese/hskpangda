import { describe, expect, it } from 'vitest';
import { getHomework } from './data';
import { flatten, gradeQuestion, hasHwStreak, isAnswered, makeOrder, scoreOf, starsFor } from './homework';

const hw = getHomework('hsk1', 2)!;
const qs = flatten(hw);
const byId = (id: string) => qs.find((x) => x.q.id === id)!.q;

describe('chấm bài tập về nhà', () => {
  it('trắc nghiệm theo chỉ số gốc dù đáp án đã xáo', () => {
    const q = byId('a1');
    const order = makeOrder(q);
    expect(gradeQuestion(q, 1, order).points).toBe(1);
    expect(gradeQuestion(q, 0, order).points).toBe(0);
  });
  it('sắp xếp: dùng chỉ số theo thứ tự hiển thị', () => {
    const q = byId('b1');
    if (q.kind !== 'reorder') throw new Error();
    const order = makeOrder(q)!;
    const shown = order.map((i) => q.tiles[i]);
    const correct = ['你', '叫', '什么', '名字'].map((t) => shown.indexOf(t));
    expect(gradeQuestion(q, correct, order).status).toBe('correct');
  });
  it('nối & điền từ cho điểm từng phần', () => {
    const m = byId('a7');
    expect(gradeQuestion(m, { 0: 0, 1: 1, 2: 3, 3: 2 }, undefined).points).toBe(0.5);
    const c = byId('a8');
    expect(gradeQuestion(c, ['叫', '不', '也', '高兴'], undefined).status).toBe('partial');
  });
  it('dịch gần đúng chỉ được nửa điểm khi tự xác nhận', () => {
    const q = byId('b6');
    expect(gradeQuestion(q, { text: '我叫陈天' }, undefined).points).toBe(0);
    expect(gradeQuestion(q, { text: '我叫陈天' }, undefined, true).points).toBe(0.5);
    expect(gradeQuestion(q, { text: '我叫陈天中。' }, undefined).points).toBe(1);
  });
  it('isAnswered / điểm / sao', () => {
    expect(isAnswered(byId('b6'), { text: ' ' })).toBe(false);
    expect(scoreOf({ a: { points: 1, status: 'correct' }, b: { points: 0.5, status: 'close' } }, 2)).toBe(75);
    expect(starsFor(95)).toBe(3);
    expect(starsFor(40)).toBe(0);
  });
  it('chuỗi 5 bài liên tiếp ≥ 90%', () => {
    expect(hasHwStreak({ 1: 95, 2: 90, 3: 100, 4: 92, 5: 91 })).toBe(true);
    expect(hasHwStreak({ 1: 95, 2: 80, 3: 100, 4: 92, 5: 91 })).toBe(false);
  });
});
