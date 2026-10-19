import { describe, expect, it } from 'vitest';
import { getDict, segment, splitSyllables, stripTones, toneOf } from './dict';

describe('splitSyllables', () => {
  it('tách đúng âm tiết', () => {
    expect(splitSyllables('nǚpéngyou')).toEqual(['nǚ', 'péng', 'you']);
    expect(splitSyllables('Ānnī')).toEqual(['Ān', 'nī']);
    expect(splitSyllables('shénme')).toEqual(['shén', 'me']);
    expect(splitSyllables('míngzi')).toEqual(['míng', 'zi']);
    expect(splitSyllables('méi guānxi')).toEqual(['méi', 'guān', 'xi']);
    expect(splitSyllables('duìbuqǐ')).toEqual(['duì', 'bu', 'qǐ']);
  });
});
describe('thanh điệu', () => {
  it('toneOf & stripTones', () => {
    expect(toneOf('mā')).toBe(1);
    expect(toneOf('mǎ')).toBe(3);
    expect(toneOf('ma')).toBe(0);
    expect(stripTones('nǐ hǎo')).toBe('ni hao');
  });
});
describe('segment', () => {
  it('ghi đè cách đọc {还|huán}', () => {
    const segs = segment('钱可以慢慢{还|huán}。', getDict('hsk1')).filter((s) => s.han);
    expect(segs[segs.length - 1]).toMatchObject({ text: '还', pinyin: 'huán' });
  });
  it('biến điệu 一 và A不A', () => {
    const d = getDict('hsk1');
    const py = (t: string) => segment(t, d).filter((s) => s.han).map((s) => s.pinyin);
    expect(py('想不想')).toEqual(['xiǎng', 'bu', 'xiǎng']);
    expect(py('想一想')).toEqual(['xiǎng', 'yi', 'xiǎng']);
  });
  it('tách từ dài nhất và biến điệu 不', () => {
    const segs = segment('我不是安妮。', getDict('hsk1')).filter((s) => s.han);
    expect(segs.map((s) => s.text)).toEqual(['我', '不', '是', '安妮']);
    expect(segs[1].pinyin).toBe('bú');
    const s2 = segment('我不忙', getDict('hsk1'));
    expect(s2[1].pinyin).toBe('bù');
  });
});
