import { daysBetween } from './util';
import type { ExamProg, GlobalProg, HwProg, LessonProg, LevelProg, ReviewProg } from '../store/ProgressStore';

/** Ảnh chụp tiến độ để đồng bộ (không gồm cài đặt giao diện – mỗi máy giữ riêng) */
export interface Snapshot {
  version: 1;
  global: GlobalProg;
  levels: Record<string, LevelProg>;
}

const uniq = <T,>(a: T[]) => Array.from(new Set(a));
const later = (a: string | null, b: string | null) => (!a ? b : !b ? a : a > b ? a : b);

function mergeLesson(a?: LessonProg, b?: LessonProg): LessonProg {
  if (!a) return b!;
  if (!b) return a;
  return {
    sections: uniq([...a.sections, ...b.sections]),
    completed: !!(a.completed || b.completed),
    exScore: Math.max(a.exScore ?? 0, b.exScore ?? 0) || undefined,
    gamesPlayed: uniq([...(a.gamesPlayed ?? []), ...(b.gamesPlayed ?? [])]),
  };
}

function mergeHw(a?: HwProg, b?: HwProg): HwProg {
  if (!a) return b!;
  if (!b) return a;
  const last = !a.last ? b.last : !b.last ? a.last : a.last.at >= b.last.at ? a.last : b.last;
  // bản nháp: giữ bản mới bắt đầu hơn; nếu bài đã nộp sau thời điểm nháp thì bỏ nháp
  let draft = !a.draft ? b.draft : !b.draft ? a.draft : a.draft.startedAt >= b.draft.startedAt ? a.draft : b.draft;
  if (draft && last && last.at > draft.startedAt) draft = undefined;
  const history = a.history.length >= b.history.length ? a.history : b.history;
  return {
    best: Math.max(a.best, b.best),
    passed: a.passed || b.passed,
    attempts: Math.max(a.attempts, b.attempts),
    history,
    ...(last ? { last } : {}),
    ...(draft ? { draft } : {}),
  };
}

function mergeReview(a?: ReviewProg, b?: ReviewProg): ReviewProg {
  if (!a) return b!;
  if (!b) return a;
  const checks: ReviewProg['checks'] = { ...b.checks };
  for (const [k, v] of Object.entries(a.checks)) {
    const o = checks[k] ?? [false, false];
    checks[k] = [v[0] || o[0], v[1] || o[1]];
  }
  return { checks, note: a.note.length >= b.note.length ? a.note : b.note, quizBest: Math.max(a.quizBest ?? 0, b.quizBest ?? 0) || undefined };
}

function mergeRecord<T>(a: Record<string | number, T> = {}, b: Record<string | number, T> = {}, fn: (x?: T, y?: T) => T) {
  const out: Record<string, T> = {};
  for (const k of uniq([...Object.keys(a), ...Object.keys(b)])) out[k] = fn(a[k], b[k]);
  return out;
}

function mergeExam(a?: ExamProg, b?: ExamProg): ExamProg {
  if (!a) return b!;
  if (!b) return a;
  const seen = new Set<number>();
  const history = [...a.history, ...b.history].filter((h) => (seen.has(h.at) ? false : (seen.add(h.at), true))).sort((x, y) => x.at - y.at).slice(-20);
  const lastDone = history.length ? history[history.length - 1].at : 0;
  let session = !a.session ? b.session : !b.session ? a.session : a.session.startedAt >= b.session.startedAt ? a.session : b.session;
  if (session && session.startedAt < lastDone) session = undefined; // đã nộp ở máy khác
  return { best: Math.max(a.best, b.best), attempts: Math.max(a.attempts, b.attempts, history.length), history, ...(session ? { session } : {}) };
}

export function mergeLevel(a?: LevelProg, b?: LevelProg): LevelProg {
  const empty: LevelProg = { lessons: {}, homework: {}, known: [], wrong: {}, games: {}, review: {} };
  const x = { ...empty, ...(a ?? {}) };
  const y = { ...empty, ...(b ?? {}) };
  return {
    lessons: mergeRecord(x.lessons, y.lessons, mergeLesson),
    homework: mergeRecord(x.homework, y.homework, mergeHw),
    known: uniq([...x.known, ...y.known]),
    wrong: mergeRecord(x.wrong, y.wrong, (p, q) => Math.max(p ?? 0, q ?? 0)),
    games: mergeRecord(x.games, y.games, (p, q) => Math.max(p ?? 0, q ?? 0)),
    review: mergeRecord(x.review, y.review, mergeReview),
    exams: mergeRecord(x.exams ?? {}, y.exams ?? {}, mergeExam),
  };
}

export function mergeGlobal(a: GlobalProg, b: GlobalProg): GlobalProg {
  const sa = a.streak, sb = b.streak;
  let streak: GlobalProg['streak'];
  if (sa.last === sb.last) streak = { last: sa.last, count: Math.max(sa.count, sb.count) };
  else {
    const [newer, older] = later(sa.last, sb.last) === sa.last ? [sa, sb] : [sb, sa];
    // học liên tiếp nhưng ở hai máy khác nhau: hôm qua (máy A) + hôm nay (máy B) → nối chuỗi
    const consecutive = !!(older.last && newer.last && daysBetween(older.last, newer.last) === 1);
    streak = { last: newer.last, count: consecutive ? Math.max(newer.count, older.count + 1) : newer.count };
  }
  const newer = later(a.lastVisit, b.lastVisit) === a.lastVisit ? a : b;
  return {
    xp: Math.max(a.xp, b.xp),
    badges: uniq([...a.badges, ...b.badges]),
    streak,
    lastLevel: newer.lastLevel,
    lastVisit: later(a.lastVisit, b.lastVisit),
  };
}

/** Gộp tiến độ hai nơi: không bao giờ làm mất thành tích (lấy lớn nhất / hợp lại) */
export function mergeSnapshots(local: Snapshot, remote?: Partial<Snapshot> | null): Snapshot {
  if (!remote || !remote.global) return local;
  const levels: Record<string, LevelProg> = {};
  for (const id of uniq([...Object.keys(local.levels), ...Object.keys(remote.levels ?? {})])) {
    levels[id] = mergeLevel(local.levels[id], remote.levels?.[id]);
  }
  return { version: 1, global: mergeGlobal(local.global, remote.global), levels };
}

export interface LevelSummary {
  completed: number[];
  stars: Record<number, number>;
  homework: Record<number, { best: number; passed: boolean; attempts: number }>;
  known: number;
  wrongTop: [string, number][];
  exams?: Record<string, { best: number; attempts: number; passed: boolean }>;
}
export interface Summary {
  xp: number;
  streak: number;
  lastActive: string | null;
  badges: number;
  levels: Record<string, LevelSummary>;
}

/** Bản tóm tắt gọn cho trang giáo viên */
export function buildSummary(s: Snapshot, starsOf: (lp?: LessonProg) => number): Summary {
  const levels: Record<string, LevelSummary> = {};
  for (const [id, lv] of Object.entries(s.levels)) {
    const completed = Object.entries(lv.lessons).filter(([, l]) => l.completed).map(([k]) => Number(k)).sort((a, b) => a - b);
    const exams = Object.fromEntries(Object.entries(lv.exams ?? {}).filter(([, e]) => e.attempts > 0).map(([k, e]) => [k, { best: e.best, attempts: e.attempts, passed: e.history.some((h) => h.passed) }]));
    if (!completed.length && !Object.keys(lv.homework).length && !lv.known.length && !Object.keys(exams).length) continue;
    levels[id] = {
      completed,
      stars: Object.fromEntries(completed.map((k) => [k, starsOf(lv.lessons[k])])),
      homework: Object.fromEntries(Object.entries(lv.homework).filter(([, h]) => h.attempts > 0).map(([k, h]) => [Number(k), { best: h.best, passed: h.passed, attempts: h.attempts }])),
      known: lv.known.length,
      wrongTop: Object.entries(lv.wrong).sort((a, b) => b[1] - a[1]).slice(0, 10),
      ...(Object.keys(exams).length ? { exams } : {}),
    };
  }
  return { xp: s.global.xp, streak: s.global.streak.count, lastActive: s.global.lastVisit, badges: s.global.badges.length, levels };
}
