import levelsJson from '../data/levels.json';
import charactersJson from '../data/characters.json';
import type { Character, Exam, Homework, Lesson, LevelConfig, VocabItem } from '../types';

/**
 * Nạp toàn bộ dữ liệu theo quy ước thư mục:
 *   src/data/<levelId>/lesson-XX.json
 *   src/data/<levelId>/homework/hw-XX.json
 *   src/data/<levelId>/glossary.json (tuỳ chọn)
 * Thêm cấp mới = thêm thư mục + khai báo trong levels.json. Không phải sửa component.
 */
const lessonFiles = import.meta.glob('../data/*/lesson-*.json', { eager: true, import: 'default' }) as Record<string, Lesson>;
const hwFiles = import.meta.glob('../data/*/homework/hw-*.json', { eager: true, import: 'default' }) as Record<string, Homework>;
const examFiles = import.meta.glob('../data/*/exams/*.json', { eager: true, import: 'default' }) as Record<string, Exam>;
const wordlistFiles = import.meta.glob('../data/*/wordlist.json', { eager: true, import: 'default' }) as Record<
  string,
  { words: VocabItem[] }
>;
const glossaryFiles = import.meta.glob('../data/*/glossary.json', { eager: true, import: 'default' }) as Record<
  string,
  { words: (VocabItem & { known?: boolean })[] }
>;

const levelOf = (path: string) => path.split('/')[2];

export const levels: LevelConfig[] = (levelsJson as { levels: LevelConfig[] }).levels;
export const characters: Character[] = charactersJson as Character[];

export function getLevel(id: string | undefined): LevelConfig | undefined {
  return levels.find((l) => l.id === id);
}

const lessonsByLevel: Record<string, Lesson[]> = {};
for (const [path, lesson] of Object.entries(lessonFiles)) {
  (lessonsByLevel[levelOf(path)] ??= []).push(lesson);
}
Object.values(lessonsByLevel).forEach((arr) => arr.sort((a, b) => a.id - b.id));

const hwByLevel: Record<string, Record<number, Homework>> = {};
for (const [path, hw] of Object.entries(hwFiles)) {
  (hwByLevel[levelOf(path)] ??= {})[hw.lessonId] = hw;
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
  return Object.entries(glossaryFiles).find(([p]) => levelOf(p) === levelId)?.[1].words ?? [];
}
/** Từ nền của một cấp (chưa dạy trong bài nào nhưng có trong chuẩn HSK của cấp đó) */
export function getWordlist(levelId: string) {
  return Object.entries(wordlistFiles).find(([p]) => levelOf(p) === levelId)?.[1].words ?? [];
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
  return Object.entries(examFiles).filter(([p]) => levelOf(p) === levelId).map(([, e]) => e).sort((a, b) => a.id.localeCompare(b.id));
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
