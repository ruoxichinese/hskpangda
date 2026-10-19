import type { Homework, HwQuestion, HwSection } from '../types';
import { gradeReorder, gradeTranslation, translationPoints, type TranslateResult } from './grading';
import { permutation } from './util';
import type { QResult } from '../store/ProgressStore';

export interface FlatQ { q: HwQuestion; section: HwSection; secIdx: number; n: number }

export function flatten(hw: Homework): FlatQ[] {
  let n = 0;
  return hw.sections.flatMap((section, secIdx) => section.questions.map((q) => ({ q, section, secIdx, n: ++n })));
}

/** Hoán vị hiển thị cho mỗi lần làm (xáo đáp án trắc nghiệm, cột nối, ngân hàng từ, thẻ sắp xếp) */
export function makeOrder(q: HwQuestion): number[] | undefined {
  switch (q.kind) {
    case 'mcq': return permutation(q.options.length);
    case 'match': return permutation(q.pairs.length);
    case 'cloze': return permutation(q.bank.length);
    case 'reorder': {
      // tránh trường hợp xáo ra đúng luôn đáp án
      for (let k = 0; k < 6; k++) {
        const p = permutation(q.tiles.length);
        if (!gradeReorder(p.map((i) => q.tiles[i]), q.answers)) return p;
      }
      return permutation(q.tiles.length);
    }
    default: return undefined;
  }
}

export interface TranslateAnswer { text: string; noBank?: boolean }

export function isAnswered(q: HwQuestion, a: unknown): boolean {
  if (a === undefined || a === null) return false;
  switch (q.kind) {
    case 'match': return Object.keys(a as object).length === q.pairs.length;
    case 'cloze': return (a as string[]).filter(Boolean).length === q.answers.length;
    case 'reorder': return (a as number[]).length === q.tiles.length;
    case 'translate': return !!(a as TranslateAnswer).text?.trim();
    default: return true;
  }
}

export interface Graded extends QResult { translate?: TranslateResult; userText?: string }

export function gradeQuestion(q: HwQuestion, a: unknown, order: number[] | undefined, confirmed = false): Graded {
  switch (q.kind) {
    case 'mcq':
    case 'truefalse': {
      if (a === undefined) return { points: 0, status: 'empty' };
      const ok = a === q.answer;
      return { points: ok ? 1 : 0, status: ok ? 'correct' : 'wrong' };
    }
    case 'match': {
      const v = (a as Record<number, number>) ?? {};
      const right = q.pairs.filter((_, i) => v[i] === i).length;
      const pts = right / q.pairs.length;
      return { points: pts, status: pts === 1 ? 'correct' : pts === 0 ? (Object.keys(v).length ? 'wrong' : 'empty') : 'partial' };
    }
    case 'cloze': {
      const v = (a as string[]) ?? [];
      const right = q.answers.filter((x, i) => v[i] === x).length;
      const pts = right / q.answers.length;
      return { points: pts, status: pts === 1 ? 'correct' : pts === 0 ? (v.some(Boolean) ? 'wrong' : 'empty') : 'partial' };
    }
    case 'reorder': {
      const v = (a as number[]) ?? [];
      if (!v.length) return { points: 0, status: 'empty' };
      const tiles = (order ?? q.tiles.map((_, i) => i)).map((i) => q.tiles[i]);
      const text = v.map((i) => tiles[i]).join('');
      const ok = gradeReorder(v.map((i) => tiles[i]), q.answers);
      return { points: ok ? 1 : 0, status: ok ? 'correct' : 'wrong', userText: text };
    }
    case 'translate': {
      const text = (a as TranslateAnswer | undefined)?.text ?? '';
      const r = gradeTranslation(text, q);
      return { points: translationPoints(r.status, confirmed), status: r.status, confirmed: confirmed && r.status === 'close', translate: r, userText: text };
    }
  }
}

export function scoreOf(results: Record<string, QResult>, total: number) {
  const sum = Object.values(results).reduce((s, r) => s + r.points, 0);
  return Math.round((sum / Math.max(1, total)) * 100);
}

export function starsFor(score: number) {
  return score >= 90 ? 3 : score >= 70 ? 2 : score >= 50 ? 1 : 0;
}

/** Huy hiệu "Chăm làm bài tập": có chuỗi 5 bài liên tiếp đạt ≥ 90% */
export function hasHwStreak(bestByLesson: Record<number, number>, need = 5) {
  let run = 0;
  const ids = Object.keys(bestByLesson).map(Number).sort((a, b) => a - b);
  let prev = -1;
  for (const id of ids) {
    run = bestByLesson[id] >= 90 && (prev === id - 1 || run === 0) ? run + 1 : bestByLesson[id] >= 90 ? 1 : 0;
    prev = id;
    if (run >= need) return true;
  }
  return false;
}
