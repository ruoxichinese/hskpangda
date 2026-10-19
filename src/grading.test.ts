import { describe, expect, it } from 'vitest';
import { charDiff, compareKey, gradeReorder, gradeTranslation, levenshtein, normalize, similarity, translationPoints } from './grading';

describe('normalize', () => {
  it('bỏ khoảng trắng và dấu câu cuối', () => {
    expect(normalize(' 我 叫 陈天中 。 ')).toBe('我叫陈天中');
    expect(normalize('你好！！')).toBe('你好');
  });
  it('đồng nhất dấu câu toàn/nửa độ rộng', () => {
    expect(normalize('请问，你叫什么名字？')).toBe(normalize('请问,你叫什么名字?'));
    expect(normalize('对不起！没关系！')).toBe('对不起!没关系');
  });
  it('compareKey bỏ cả dấu câu bên trong', () => {
    expect(compareKey('老师，再见！')).toBe('老师再见');
  });
});

describe('levenshtein / similarity', () => {
  it('tính đúng khoảng cách', () => {
    expect(levenshtein('我叫陈天中', '我叫陈天中')).toBe(0);
    expect(levenshtein('我是陈天中', '我叫陈天中')).toBe(1);
    expect(levenshtein('', '你好')).toBe(2);
  });
  it('similarity trong [0,1]', () => {
    expect(similarity('你好', '你好')).toBe(1);
    expect(similarity('ab', 'cd')).toBe(0);
  });
});

describe('gradeTranslation', () => {
  const spec = { acceptedAnswers: ['我叫陈天中'], requiredKeywords: ['我', '叫'] };
  it('khớp chính xác (kể cả khác dấu câu, khoảng trắng)', () => {
    expect(gradeTranslation('我叫陈天中。', spec).status).toBe('correct');
    expect(gradeTranslation('我 叫 陈天中', spec).status).toBe('correct');
  });
  it('nhiều đáp án chấp nhận', () => {
    const s = { acceptedAnswers: ['很高兴认识你', '认识你很高兴'], requiredKeywords: ['高兴', '认识'] };
    expect(gradeTranslation('认识你很高兴！', s).status).toBe('correct');
  });
  it('gần đúng khi đủ từ khoá và đủ giống', () => {
    const r = gradeTranslation('我叫陈天', spec);
    expect(r.status).toBe('close');
    expect(r.best).toBe('我叫陈天中');
    expect(r.diff.some((d) => d.type === 'missing' && d.text === '中')).toBe(true);
  });
  it('sai khi thiếu cấu trúc bắt buộc', () => {
    const r = gradeTranslation('我是陈天中', spec);
    expect(r.status).toBe('wrong');
    expect(r.missingKeywords).toEqual(['叫']);
  });
  it('sai khi quá khác', () => {
    expect(gradeTranslation('你好', spec).status).toBe('wrong');
  });
  it('bỏ trống', () => {
    expect(gradeTranslation('  ', spec).status).toBe('empty');
  });
  it('lỗi hay gặp: dùng 是 trước tính từ bị coi là gần đúng nếu đủ từ khoá', () => {
    const s = { acceptedAnswers: ['我很忙'], requiredKeywords: ['忙'] };
    expect(gradeTranslation('我是很忙', s).status).toBe('close');
  });
});

describe('gradeReorder', () => {
  it('chấp nhận nhiều thứ tự đúng', () => {
    const answers = ['很高兴认识你', '认识你很高兴'];
    expect(gradeReorder(['认识', '你', '很', '高兴'], answers)).toBe(true);
    expect(gradeReorder(['很', '高兴', '认识', '你'], answers)).toBe(true);
    expect(gradeReorder(['你', '认识', '很', '高兴'], answers)).toBe(false);
  });
});

describe('charDiff', () => {
  it('đánh dấu ký tự thừa và thiếu', () => {
    expect(charDiff('我是很忙', '我很忙')).toEqual([
      { text: '我', type: 'same' },
      { text: '是', type: 'extra' },
      { text: '很忙', type: 'same' },
    ]);
  });
});

describe('translationPoints', () => {
  it('đúng 1, gần đúng tự xác nhận 0.5', () => {
    expect(translationPoints('correct', false)).toBe(1);
    expect(translationPoints('close', true)).toBe(0.5);
    expect(translationPoints('close', false)).toBe(0);
    expect(translationPoints('wrong', true)).toBe(0);
  });
});
