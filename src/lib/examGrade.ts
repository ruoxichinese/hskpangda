import type { ExamResult } from '../store/ProgressStore';
import type { Exam } from '../types';

/** Chấm điểm từ câu trả lời: mỗi phần 100 điểm. Trang giáo viên dùng lại hàm này để chấm bài nộp. */
export function grade(exam: Exam, answers: Record<string, string>): ExamResult {
  const sections: ExamResult['sections'] = {};
  let total = 0;
  for (const s of exam.sections) {
    const qs = s.parts.flatMap((p) => p.questions);
    const correct = qs.filter((q) => (answers[q.id] ?? '').trim() === q.answer).length;
    const score = Math.round((correct / qs.length) * 100);
    sections[s.id] = { correct, count: qs.length, score };
    total += score;
  }
  const max = exam.sections.length * 100;
  return { at: Date.now(), total, max, sections, answers, passed: total >= (max * exam.passPercent) / 100 };
}
