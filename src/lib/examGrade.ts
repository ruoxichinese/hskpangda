import type { ExamResult } from '../store/ProgressStore';
import type { Exam, ExamQuestion } from '../types';

const norm = (s: string) => s.replace(/[\s，。？！、,.?!]/g, '');

/** Câu học sinh trả lời, dạng chữ (câu sắp xếp lưu chỉ số mảnh → ghép lại thành câu) */
export function answerText(q: Pick<ExamQuestion, 'kind' | 'options'>, raw: string | undefined): string {
  const v = raw ?? '';
  if (q.kind !== 'order') return v;
  const tiles = (q.options as string[]) ?? [];
  return v.split(',').filter((x) => x !== '').map((i) => tiles[Number(i)] ?? '').join('');
}

/** Đúng/sai một câu; đáp án có thể có nhiều cách đúng, ngăn bằng dấu | */
export function isCorrect(q: Pick<ExamQuestion, 'kind' | 'options' | 'answer' | 'word'>, raw: string | undefined): boolean {
  if (q.kind === 'sentence') {
    // nhìn tranh đặt câu: đạt khi có từ cho sẵn và đủ dài (ít nhất từ + 4 chữ Hán)
    const t = raw ?? '';
    const han = t.replace(/[^\u4e00-\u9fff]/g, '');
    return !!q.word && t.includes(q.word) && han.length >= q.word.length + 4;
  }
  const a = norm(answerText(q, raw));
  return a !== '' && q.answer.split('|').some((x) => norm(x) === a);
}

/** Chấm điểm từ câu trả lời: mỗi phần 100 điểm. Trang giáo viên dùng lại hàm này để chấm bài nộp. */
export function grade(exam: Exam, answers: Record<string, string>): ExamResult {
  const sections: ExamResult['sections'] = {};
  let total = 0;
  for (const s of exam.sections) {
    const qs = s.parts.flatMap((p) => p.questions);
    const correct = qs.filter((q) => isCorrect(q, answers[q.id])).length;
    const score = Math.round((correct / qs.length) * 100);
    sections[s.id] = { correct, count: qs.length, score };
    total += score;
  }
  const max = exam.sections.length * 100;
  return { at: Date.now(), total, max, sections, answers, passed: total >= (max * exam.passPercent) / 100 };
}
