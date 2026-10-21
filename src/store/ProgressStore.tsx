import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';
import type { Snapshot } from '../lib/sync';
import { getLevel, levels } from '../lib/data';
import { daysBetween, readJSON, todayStr, writeJSON } from '../lib/util';
import type { PinyinMode, TranslationMode } from '../types';

// ===== Kiểu dữ liệu lưu trong localStorage =====
export interface LessonProg { sections: string[]; exScore?: number; completed?: boolean; gamesPlayed?: string[] }
export interface QResult { points: number; status: 'correct' | 'close' | 'wrong' | 'empty' | 'partial'; confirmed?: boolean }
export interface HwDraft { answers: Record<string, unknown>; index: number; order: Record<string, number[]>; noHints: Record<string, boolean>; startedAt: number; retryOnly?: string[] }
export interface HwProg { best: number; passed: boolean; attempts: number; draft?: HwDraft; last?: { score: number; results: Record<string, QResult>; answers: Record<string, unknown>; order: Record<string, number[]>; at: number }; history: number[] }
export interface ReviewProg { checks: Record<string, [boolean, boolean]>; note: string; quizBest?: number }
export type ExamStage = 'listening' | 'review' | 'reading' | 'writing';
export interface ExamSession { startedAt: number; stage: ExamStage; stageStartedAt: number; answers: Record<string, string>; flags: string[]; ttsStep?: number; attemptId?: string; closesAt?: string; showAnswers?: boolean }
export interface ExamResult { at: number; total: number; max: number; sections: Record<string, { correct: number; count: number; score: number }>; answers: Record<string, string>; passed: boolean }
export interface ExamProg { best: number; attempts: number; history: ExamResult[]; session?: ExamSession; pending?: { attemptId: string; answers: Record<string, string>; total: number; showAnswers: boolean } }
export interface LevelProg {
  lessons: Record<number, LessonProg>;
  homework: Record<number, HwProg>;
  known: string[];
  wrong: Record<string, number>;
  games: Record<string, number>; // "<lessonId>:<game>" → best
  review: Record<number, ReviewProg>;
  exams?: Record<string, ExamProg>;
}
export interface GlobalProg { xp: number; badges: string[]; streak: { count: number; last: string | null }; lastLevel: string; lastVisit: string | null }
export interface Settings { pinyin: 'level' | PinyinMode; translation: 'level' | TranslationMode; speed: number | null; scene: 'auto' | string }

const emptyLevel = (): LevelProg => ({ lessons: {}, homework: {}, known: [], wrong: {}, games: {}, review: {}, exams: {} });
const emptyGlobal = (): GlobalProg => ({ xp: 0, badges: [], streak: { count: 0, last: null }, lastLevel: 'hsk1', lastVisit: null });
const defaultSettings: Settings = { pinyin: 'level', translation: 'level', speed: null, scene: 'auto' };

export const BADGES: Record<string, { emoji: string; name: string; desc: string }> = {
  'first-lesson': { emoji: '🌱', name: 'Bước chân đầu tiên', desc: 'Hoàn thành bài học đầu tiên' },
  'first-homework': { emoji: '📝', name: 'Nộp bài đầu tiên', desc: 'Đạt bài tập về nhà đầu tiên' },
  'tone-master': { emoji: '🎵', name: 'Bậc thầy thanh điệu', desc: 'Đạt 10/10 trong game Bắt thanh điệu' },
  'words-100': { emoji: '📚', name: 'Thuộc 100 từ', desc: 'Đánh dấu thuộc 100 từ vựng' },
  'hw-streak-5': { emoji: '🏅', name: 'Chăm làm bài tập', desc: '5 bài tập liên tiếp đạt ≥ 90%' },
  'perfect-hw': { emoji: '💯', name: 'Điểm tuyệt đối', desc: 'Một bài tập về nhà đạt 100%' },
  'streak-7': { emoji: '🔥', name: 'Một tuần không nghỉ', desc: 'Học 7 ngày liên tiếp' },
};

const lkey = (level: string) => `progress.${level}`;

interface Store {
  global: GlobalProg;
  settings: Settings;
  level(levelId: string): LevelProg;
  updateLevel(levelId: string, fn: (p: LevelProg) => LevelProg | void): void;
  markSection(levelId: string, lessonId: number, key: string): void;
  addXP(n: number): void;
  award(badge: string): boolean;
  touch(levelId?: string): void;
  setSettings(s: Partial<Settings>): void;
  toggleKnown(levelId: string, word: string): void;
  recordGame(levelId: string, lessonId: number, game: string, score: number): boolean;
  lastBadge: string | null;
  clearLastBadge(): void;
  exportAll(): string;
  importAll(json: string): void;
  resetAll(): void;
  /** tăng mỗi khi tiến độ thay đổi – dùng để kích hoạt đồng bộ */
  version: number;
  getSnapshot(): Snapshot;
  applySnapshot(s: Snapshot): void;
}
const Ctx = createContext<Store | null>(null);

export function ProgressProvider({ children }: { children: ReactNode }) {
  const [global, setGlobal] = useState<GlobalProg>(() => ({ ...emptyGlobal(), ...readJSON('pangda.global', {}) }));
  const [settings, setSettingsState] = useState<Settings>(() => ({ ...defaultSettings, ...readJSON('pangda.settings', {}) }));
  const [levelsState, setLevelsState] = useState<Record<string, LevelProg>>(() =>
    Object.fromEntries(levels.map((l) => [l.id, { ...emptyLevel(), ...readJSON(lkey(l.id), {}) }])),
  );
  const [lastBadge, setLastBadge] = useState<string | null>(null);
  const [version, setVersion] = useState(0);
  const latest = useRef({ global, levelsState });
  latest.current = { global, levelsState };
  const bump = useCallback(() => setVersion((v) => v + 1), []);

  const saveGlobal = useCallback((fn: (g: GlobalProg) => GlobalProg) => {
    setGlobal((g) => { const n = fn(g); writeJSON('pangda.global', n); return n; });
    bump();
  }, [bump]);

  const level = useCallback((id: string) => levelsState[id] ?? emptyLevel(), [levelsState]);

  const updateLevel = useCallback((id: string, fn: (p: LevelProg) => LevelProg | void) => {
    setLevelsState((all) => {
      const copy: LevelProg = JSON.parse(JSON.stringify(all[id] ?? emptyLevel()));
      const n = fn(copy) ?? copy;
      writeJSON(lkey(id), n);
      return { ...all, [id]: n };
    });
    bump();
  }, [bump]);

  const touch = useCallback((levelId?: string) => {
    const today = todayStr();
    saveGlobal((g) => {
      const s = { ...g.streak };
      if (s.last !== today) {
        s.count = s.last && daysBetween(s.last, today) === 1 ? s.count + 1 : 1;
        s.last = today;
      }
      const badges = s.count >= 7 && !g.badges.includes('streak-7') ? [...g.badges, 'streak-7'] : g.badges;
      return { ...g, streak: s, badges, lastVisit: today, lastLevel: levelId ?? g.lastLevel };
    });
  }, [saveGlobal]);

  const addXP = useCallback((n: number) => saveGlobal((g) => ({ ...g, xp: g.xp + n })), [saveGlobal]);

  const award = useCallback((b: string) => {
    let isNew = false;
    saveGlobal((g) => {
      if (g.badges.includes(b)) return g;
      isNew = true;
      return { ...g, badges: [...g.badges, b], xp: g.xp + 30 };
    });
    if (!global.badges.includes(b)) { setLastBadge(b); isNew = true; }
    return isNew;
  }, [saveGlobal, global.badges]);

  const markSection = useCallback((levelId: string, lessonId: number, key: string) => {
    let added = false;
    updateLevel(levelId, (p) => {
      const lp = (p.lessons[lessonId] ??= { sections: [] });
      if (!lp.sections.includes(key)) { lp.sections.push(key); added = true; }
    });
    if (added) addXP(10);
    touch(levelId);
  }, [updateLevel, addXP, touch]);

  const toggleKnown = useCallback((levelId: string, word: string) => {
    let count = 0;
    updateLevel(levelId, (p) => {
      p.known = p.known.includes(word) ? p.known.filter((w) => w !== word) : [...p.known, word];
      count = p.known.length;
    });
    const total = Object.values(levelsState).reduce((s, l) => s + l.known.length, 0) + 1;
    if (count >= 100 || total >= 100) award('words-100');
  }, [updateLevel, levelsState, award]);

  const recordGame = useCallback((levelId: string, lessonId: number, game: string, score: number) => {
    let best = false;
    updateLevel(levelId, (p) => {
      const k = `${lessonId}:${game}`;
      if ((p.games[k] ?? -1) < score) { p.games[k] = score; best = true; }
      const lp = (p.lessons[lessonId] ??= { sections: [] });
      lp.gamesPlayed = Array.from(new Set([...(lp.gamesPlayed ?? []), game]));
      if (!lp.sections.includes('games')) lp.sections.push('games');
    });
    addXP(Math.max(5, Math.round(score / 10)));
    touch(levelId);
    return best;
  }, [updateLevel, addXP, touch]);

  const setSettings = useCallback((s: Partial<Settings>) => {
    setSettingsState((cur) => { const n = { ...cur, ...s }; writeJSON('pangda.settings', n); return n; });
  }, []);

  const exportAll = useCallback(() => {
    const data: Record<string, unknown> = {};
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i)!;
        if (k.startsWith('progress.') || k.startsWith('pangda.')) {
          const v = localStorage.getItem(k)!;
          try { data[k] = JSON.parse(v); } catch { data[k] = v; }
        }
      }
    } catch { /* bỏ qua */ }
    return JSON.stringify({ app: 'pangda-hsk', version: 1, exportedAt: new Date().toISOString(), data }, null, 2);
  }, []);

  const importAll = useCallback((json: string) => {
    const parsed = JSON.parse(json);
    if (parsed?.app !== 'pangda-hsk' || typeof parsed.data !== 'object') throw new Error('File không phải bản sao lưu của Pàngdá HSK.');
    for (const [k, v] of Object.entries(parsed.data as Record<string, unknown>)) {
      if (!k.startsWith('progress.') && !k.startsWith('pangda.')) continue;
      localStorage.setItem(k, typeof v === 'string' ? v : JSON.stringify(v));
    }
    window.location.reload();
  }, []);

  const resetAll = useCallback(() => {
    try {
      Object.keys(localStorage).filter((k) => k.startsWith('progress.') || k === 'pangda.global').forEach((k) => localStorage.removeItem(k));
    } catch { /* bỏ qua */ }
    window.location.reload();
  }, []);

  const getSnapshot = useCallback((): Snapshot => ({ version: 1, global: latest.current.global, levels: latest.current.levelsState }), []);
  const applySnapshot = useCallback((s: Snapshot) => {
    const g = { ...emptyGlobal(), ...s.global };
    writeJSON('pangda.global', g);
    setGlobal(g);
    const lv: Record<string, LevelProg> = {};
    for (const l of levels) {
      lv[l.id] = { ...emptyLevel(), ...(s.levels[l.id] ?? {}) };
      writeJSON(lkey(l.id), lv[l.id]);
    }
    setLevelsState(lv);
  }, []);

  const value = useMemo<Store>(() => ({
    global, settings, level, updateLevel, markSection, addXP, award, touch, setSettings, toggleKnown, recordGame,
    lastBadge, clearLastBadge: () => setLastBadge(null), exportAll, importAll, resetAll, version, getSnapshot, applySnapshot,
  }), [global, settings, level, updateLevel, markSection, addXP, award, touch, setSettings, toggleKnown, recordGame, lastBadge, exportAll, importAll, resetAll, version, getSnapshot, applySnapshot]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useProgress() {
  const c = useContext(Ctx);
  if (!c) throw new Error('useProgress phải nằm trong ProgressProvider');
  return c;
}

/** Cài đặt hiệu lực cho một cấp: kết hợp cài đặt người dùng với bộ "difficulty" của cấp */
export function useLevelPrefs(levelId: string) {
  const { settings } = useProgress();
  const lv = getLevel(levelId) ?? levels[0];
  const d = lv.difficulty;
  return {
    level: lv,
    difficulty: d,
    pinyin: (settings.pinyin === 'level' ? d.pinyinDefault : settings.pinyin) as PinyinMode,
    translation: (settings.translation === 'level' ? d.translationDefault : settings.translation) as TranslationMode,
    speed: settings.speed ?? d.audioSpeed,
    exercisePinyin: (d.exercisePinyin ?? 'hidden') as PinyinMode,
  };
}

// ===== Các hàm tính toán trạng thái =====
export function lessonStars(lp?: LessonProg) {
  if (!lp?.completed) return 0;
  return 1 + ((lp.exScore ?? 0) >= 80 ? 1 : 0) + ((lp.gamesPlayed?.length ?? 0) >= 3 ? 1 : 0);
}
export type HwStatus = 'locked' | 'todo' | 'draft' | 'failed' | 'passed';
export function hwStatus(p: LevelProg, lessonId: number): HwStatus {
  if (!p.lessons[lessonId]?.completed) return 'locked';
  const h = p.homework[lessonId];
  if (h?.passed) return 'passed';
  if (h?.draft) return 'draft';
  if (h?.attempts) return 'failed';
  return 'todo';
}
