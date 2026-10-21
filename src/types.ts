// ===== Cấp độ =====
export type PinyinMode = 'always' | 'tap' | 'hidden';
export type TranslationMode = 'shown' | 'tap' | 'hidden';

export interface Difficulty {
  pinyinDefault: PinyinMode;
  translationDefault: TranslationMode;
  explainLanguage: 'vi' | 'vi+zh';
  audioSpeed: number;
  hintsPerQuestion: number;
  timerSeconds: number | null;
  homeworkPassScore: number;
  exercisePinyin?: PinyinMode; // pinyin trong phần luyện tập & game; mặc định 'hidden' để học sinh tự nhận diện chữ Hán
}

export interface LevelConfig {
  id: string; // "hsk1"
  num: string; // "1" hoặc "7–9"
  name: string;
  subtitle: string;
  badgeColor: string;
  available: boolean;
  lessonCount: number;
  reviewEvery: number; // mốc 学习小结 sau mỗi n bài
  pandaStage: number; // 0 = gấu con, 1 = mầm lá, 2 = kính, 3 = mũ tốt nghiệp
  scene: { id: string; name: string; desc: string }; // phông nền mở khoá khi học bài đầu tiên của cấp
  difficulty: Difficulty;
}

// ===== Từ điển =====
export interface VocabItem {
  zh: string;
  pinyin: string;
  pos?: string; // n. v. adj. pron. adv. part. suf. int. phrase
  vi: string;
  proper?: boolean;
  example?: { zh: string; vi: string };
  note_vi?: string;
  noDict?: boolean; // từ đa âm (vd. 还 huán): không đưa vào từ điển tự động; trong câu ghi {还|huán}
}

// ===== Bài học =====
export interface DialogueLine {
  speaker: string; // id nhân vật trong characters.json
  zh: string;
  vi: string;
  highlight?: string[]; // các từ cần tô
  tipRef?: number; // gắn mẹo Pàngdá
  t?: number; // giây bắt đầu trong file mp3 (nếu có) cho karaoke
}

export interface GrammarRole {
  zh: string;
  label: string; // "Chủ ngữ"
  role: 'S' | 'V' | 'O' | 'ADV' | 'ATTR' | 'PART' | 'Q' | 'N' | 'X';
}

export interface MiniQuiz {
  prompt_vi: string;
  prompt_zh?: string;
  options: string[];
  answer: number;
  explain_vi?: string;
}

export interface GrammarPoint {
  id: string;
  title_zh: string;
  title_vi: string;
  formula: GrammarRole[][]; // nhiều công thức (khẳng định / phủ định / nghi vấn…)
  formulaNote?: string[];
  explain_vi: string;
  explain_zh?: string;
  examples: { zh: string; vi: string }[];
  mistakes?: { wrong: string; right: string; why_vi: string }[];
  quiz?: MiniQuiz[];
}

export interface TextSection {
  id: string; // "text-1"
  title?: string;
  context_vi: string;
  scene: string; // emoji gợi bối cảnh
  audio?: string; // "audio/hsk1/1-1.mp3"
  lines: DialogueLine[];
  tips?: { vi: string; zh?: string }[];
  vocabAudio?: string;
  vocab: VocabItem[];
  grammar?: GrammarPoint[];
  pangdaTip?: string;
  passage?: boolean; // bài đọc dạng đoạn văn (không phải hội thoại)
  listenQuiz?: MiniQuiz[]; // nghe hai lần rồi chọn đáp án (trước khi đọc)
}

export type ExerciseItem =
  | { id: string; kind: 'fill'; sentence: string; bank: string[]; answer: string; explain_vi?: string }
  | { id: string; kind: 'reorder'; tiles: string[]; answers: string[]; vi?: string; explain_vi?: string }
  | { id: string; kind: 'listenPick'; audioText: string; options: { emoji: string; label: string }[]; answer: number; explain_vi?: string }
  | { id: string; kind: 'listenTF'; audioText: string; emoji: string; statement_vi: string; answer: boolean; explain_vi?: string }
  | { id: string; kind: 'pictureComplete'; emoji: string; sentence: string; options: string[]; answer: number; explain_vi?: string }
  | { id: string; kind: 'matchQA'; pairs: { q: string; a: string }[]; explain_vi?: string }
  | { id: string; kind: 'choice'; prompt_vi: string; prompt_zh?: string; options: string[]; answer: number; explain_vi?: string };

export interface PinyinIntro {
  initials: string[][];
  finals: string[][];
  tones: { mark: string; name_vi: string; desc_vi: string; example: string; pinyin: string; contour: string }[];
  rules: { title_vi: string; body_vi: string; examples?: { zh: string; pinyin: string; note_vi?: string }[] }[];
}

export interface HanziIntro {
  strokes: { name_vi: string; zh: string; sample: string }[];
  rules: { title_vi: string; body_vi: string; example: string }[];
  radicals: { r: string; meaning_vi: string; examples: string }[];
}

export interface Lesson {
  id: number;
  level: string;
  status?: 'ready' | 'draft';
  title: { zh: string; pinyin: string; vi: string };
  grammarTopics_vi: string[];
  objectives: { id: string; vi: string; doneWhen: string[] }[];
  pinyinIntro?: PinyinIntro;
  hanziIntro?: HanziIntro;
  warmup?: { emoji: string; word: string; pinyin: string; vi: string }[];
  texts: TextSection[];
  extraGrammar?: GrammarPoint[];
  exercises: ExerciseItem[];
  activity?: { title_vi: string; steps_vi: string[]; patterns: { zh: string; vi: string }[] };
  tongueTwister?: { zh: string; vi: string; audio?: string };
  culture?: { title_vi: string; body_vi: string[]; table?: { head: string[]; rows: string[][] }; nameMap?: Record<string, [string, string]> };
}

// ===== Bài tập về nhà =====
export type HwQuestion =
  | { id: string; kind: 'mcq'; prompt_zh?: string; prompt_vi?: string; options: string[]; answer: number; explain_vi: string }
  | { id: string; kind: 'truefalse'; statement_zh: string; statement_vi?: string; answer: boolean; explain_vi: string }
  | { id: string; kind: 'match'; prompt_vi?: string; pairs: { q: string; a: string }[]; explain_vi: string }
  | { id: string; kind: 'cloze'; prompt_vi?: string; text: string; bank: string[]; answers: string[]; explain_vi: string }
  | { id: string; kind: 'reorder'; tiles: string[]; answers: string[]; vi?: string; explain_vi: string; grammarRef?: string }
  | {
      id: string;
      kind: 'translate';
      prompt_vi: string;
      acceptedAnswers: string[];
      requiredKeywords: string[];
      wordBank?: string[];
      explain_vi: string;
      grammarRef?: string;
    };

export interface HwPassage { zh: string; vi?: string; title_vi?: string }

export interface HwSection {
  type: 'reading' | 'writing';
  title_vi: string;
  part?: string; // "A1"
  instructions_vi?: string;
  passage?: HwPassage;
  questions: HwQuestion[];
}

export interface Homework {
  lessonId: number;
  level: string;
  status?: 'ready' | 'draft';
  sections: HwSection[];
}

export interface Character {
  id: string;
  zh: string;
  pinyin: string;
  vi_name: string;
  setting: 'ai' | 'overseas' | 'china' | 'group';
  desc_vi: string;
  color: string;
  levelNotes?: Record<string, string>; // diễn biến nhân vật ở từng cấp
}
