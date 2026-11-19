import levelsJson from '../data/levels.json';
import charactersJson from '../data/characters.json';
import type { Character, Exam, Homework, Lesson, LevelConfig, VocabItem } from '../types';

/**
 * Dữ liệu theo quy ước thư mục:
 *   src/data/<levelId>/lesson-XX.json, homework/hw-XX.json, exams/*.json
 *   src/data/<levelId>/dict-index.json (sinh tự động bởi scripts/build-dict-index.mjs: từ nền + bảng tra + từ mới)
 * Thêm cấp mới = thêm thư mục + khai báo trong levels.json. Không phải sửa component.
 *
 * Dữ liệu được TẢI THEO NHU CẦU: chỉ khi học sinh mở một khoá thì mới tải bài học, bài tập, đề thi của khoá đó;
 * từ điển tra pinyin chỉ cần dict-index (nhỏ) của khoá đó và các cấp trước. Gọi ensureLevel() trước khi đọc.
 */
type Loaders<T> = Record<string, () => Promise<T>>;
const lessonFiles = import.meta.glob('../data/*/lesson-*.json', { import: 'default' }) as Loaders<Lesson>;
const hwFiles = import.meta.glob('../data/*/homework/hw-*.json', { import: 'default' }) as Loaders<Homework>;
const examFiles = import.meta.glob('../data/*/exams/*.json', { import: 'default' }) as Loaders<Exam>;
type IndexWord = VocabItem & { known?: boolean; lesson?: number; textId?: string };
const indexFiles = import.meta.glob('../data/*/dict-index.json', { import: 'default' }) as Loaders<{ wordlist: IndexWord[]; glossary: IndexWord[]; vocab: IndexWord[] }>;

const levelOf = (path: string) => path.split('/')[2];

export const levels: LevelConfig[] = (levelsJson as { levels: LevelConfig[] }).levels;
export const characters: Character[] = charactersJson as Character[];

export function getLevel(id: string | undefined): LevelConfig | undefined {
  return levels.find((l) => l.id === id);
}

const lessonsByLevel: Record<string, Lesson[]> = {};
const hwByLevel: Record<string, Record<number, Homework>> = {};
const examsByLevel: Record<string, Exam[]> = {};
const indexByLevel: Record<string, { wordlist: IndexWord[]; glossary: IndexWord[]; vocab: IndexWord[] }> = {};
const done = new Set<string>();
const pending = new Map<string, Promise<void>>();
const listeners = new Set<() => void>();
/** Báo khi có dữ liệu mới được tải (để từ điển xoá bộ nhớ đệm, trang vẽ lại) */
export function onDataLoaded(fn: () => void) {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}
const of = <T,>(files: Loaders<T>, level: string) => Promise.all(Object.entries(files).filter(([p]) => levelOf(p) === level).map(([, f]) => f()));

function load(part: 'index' | 'content', level: string): Promise<void> {
  const key = `${part}:${level}`;
  if (done.has(key)) return Promise.resolve();
  if (!pending.has(key)) {
    pending.set(key, (async () => {
      if (part === 'index') {
        const [ix] = await of(indexFiles, level);
        indexByLevel[level] = ix ?? { wordlist: [], glossary: [], vocab: [] };
      } else {
        const [ls, hws, exs] = await Promise.all([of(lessonFiles, level), of(hwFiles, level), of(examFiles, level)]);
        lessonsByLevel[level] = ls.sort((a, b) => a.id - b.id);
        hwByLevel[level] = Object.fromEntries(hws.map((h) => [h.lessonId, h]));
        examsByLevel[level] = exs.sort((a, b) => a.id.localeCompare(b.id));
      }
      done.add(key);
      listeners.forEach((f) => f());
    })());
  }
  return pending.get(key)!;
}
/** Các cấp mà từ điển của một cấp cần (chính nó và mọi cấp đứng trước) */
const dictLevels = (id: string) => levels.slice(0, Math.max(0, levels.findIndex((l) => l.id === id)) + 1).map((l) => l.id);
/** Đã tải đủ dữ liệu để hiển thị một khoá chưa */
export function levelReady(id: string) {
  return done.has(`content:${id}`) && dictLevels(id).every((l) => done.has(`index:${l}`));
}
/** Tải dữ liệu một khoá (bài học, bài tập, đề thi) + chỉ mục từ điển của khoá đó và các cấp trước */
export function ensureLevel(id: string): Promise<void> {
  if (!getLevel(id)) return Promise.resolve();
  return Promise.all([load('content', id), ...dictLevels(id).map((l) => load('index', l))]).then(() => undefined);
}
/** Tải hết (dùng cho kiểm thử, xuất dữ liệu) */
export function loadAllLevels(): Promise<void> {
  return Promise.all(levels.map((l) => ensureLevel(l.id))).then(() => undefined);
}

export function getLessons(levelId: string): Lesson[] {
  return lessonsByLevel[levelId] ?? [];
}
export function getLesson(levelId: string, id: number): Lesson | undefined {
  return getLessons(levelId).find((l) => l.id === id);
}
export function getHomework(levelId: string, id: number): Homework | undefined {
  return hwByLevel[levelId]?.[id];
}
export function isReady(x?: { status?: string }) {
  return !!x && x.status !== 'draft';
}
export function getGlossary(levelId: string) {
  return indexByLevel[levelId]?.glossary ?? [];
}
/** Từ nền của một cấp (chưa dạy trong bài nào nhưng có trong chuẩn HSK của cấp đó) */
export function getWordlist(levelId: string) {
  return indexByLevel[levelId]?.wordlist ?? [];
}
/** Từ mới của một cấp theo chỉ mục từ điển (không cần tải nguyên bài học) */
export function getIndexVocab(levelId: string) {
  return (indexByLevel[levelId]?.vocab ?? []) as (VocabItem & { lesson: number; textId: string })[];
}
// Ảnh của đề thi: src/data/<cấp>/exams/img/<đề>/*.jpg – Vite đóng gói (bản demo 1 file thì nhúng thẳng vào trang)
const examImages = import.meta.glob('../data/*/exams/img/**/*.{jpg,jpeg,png,webp}', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;
// Ảnh của bài tập về nhà: src/data/<cấp>/homework/img/<bài>/*.jpg
const hwImages = import.meta.glob('../data/*/homework/img/**/*.{jpg,jpeg,png,webp}', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;
export function hwImage(levelId: string, path: string): string | undefined {
  return hwImages[`../data/${levelId}/homework/img/${path}`];
}

export function examImage(levelId: string, path: string): string | undefined {
  return examImages[`../data/${levelId}/exams/img/${path}`];
}

/** Đề thi thử của một cấp: src/data/<cấp>/exams/*.json */
export function getExams(levelId: string): Exam[] {
  return examsByLevel[levelId] ?? [];
}
export function getExam(levelId: string, id: string): Exam | undefined {
  return getExams(levelId).find((e) => e.id === id);
}
export function getCharacter(id: string): Character | undefined {
  return characters.find((c) => c.id === id);
}

/** Từ vựng của một cấp, kèm số bài */
export function getLevelVocab(levelId: string): (VocabItem & { lesson: number; textId: string })[] {
  return getLessons(levelId).flatMap((l) => l.texts.flatMap((t) => t.vocab.map((v) => ({ ...v, lesson: l.id, textId: t.id }))));
}

export function allGrammar(levelId: string) {
  return getLessons(levelId).flatMap((l) => [
    ...l.texts.flatMap((t) => (t.grammar ?? []).map((g) => ({ g, lesson: l, textId: t.id }))),
    ...(l.extraGrammar ?? []).map((g) => ({ g, lesson: l, textId: 'grammar' })),
  ]);
}

export function isReviewPoint(level: LevelConfig, lessonId: number) {
  return lessonId % level.reviewEvery === 0;
}
