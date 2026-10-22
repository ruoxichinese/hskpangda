import { getGlossary, getLevelVocab, getWordlist, levels } from './data';

/** Mục từ điển dùng để tự sinh pinyin và phát hiện từ chưa học */
export interface DictEntry {
  zh: string;
  pinyin: string;
  vi: string;
  lesson: number; // 0 = ngoài bài (glossary)
  known?: boolean; // tên riêng: không gạch chân
}

export interface Segment {
  text: string;
  pinyin?: string;
  entry?: DictEntry;
  han: boolean;
}

const cache: Record<string, Map<string, DictEntry>> = {};

/**
 * Từ điển của một cấp, theo thứ tự ưu tiên tăng dần:
 *   1. mọi từ của các cấp thấp hơn (coi là đã học: known)
 *   2. wordlist của cấp này (từ nền chưa dạy – gạch chân)
 *   3. glossary của cấp này
 *   4. 生词 trong các bài của cấp này (gắn số bài)
 */
export function getDict(levelId: string): Map<string, DictEntry> {
  if (cache[levelId]) return cache[levelId];
  const m = new Map<string, DictEntry>();
  const idx = levels.findIndex((l) => l.id === levelId);
  const priorKeys = new Set<string>();
  for (const prior of levels.slice(0, Math.max(0, idx))) {
    for (const e of getDict(prior.id).values()) { m.set(e.zh, { ...e, lesson: 0, known: true }); priorKeys.add(e.zh); }
  }
  for (const w of getWordlist(levelId)) m.set(w.zh, { zh: w.zh, pinyin: w.pinyin, vi: w.vi, lesson: 0 });
  for (const g of getGlossary(levelId)) m.set(g.zh, { zh: g.zh, pinyin: g.pinyin, vi: g.vi, lesson: 0, known: g.known });
  const own = new Map<string, DictEntry>();
  for (const v of getLevelVocab(levelId)) {
    if (v.noDict) continue;
    const prev = own.get(v.zh);
    if (!prev || prev.lesson > v.lesson) own.set(v.zh, { zh: v.zh, pinyin: v.pinyin.split('/')[0], vi: v.vi, lesson: v.lesson });
  }
  // từ đã học ở cấp trước: vẫn là từ đã biết (lesson 0), nhưng đọc theo pinyin của bài mới
  for (const [k, v] of own) m.set(k, priorKeys.has(k) ? { ...v, lesson: 0, known: true } : v);
  cache[levelId] = m;
  return m;
}

const HAN = /[\u3400-\u9fff]/;
const TONE4 = /[àèìòùǜ]/;
const TONE_ANY = /[āáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜ]/;

/** Tách câu bằng thuật toán khớp dài nhất (tối đa 5 chữ), xử lý biến điệu của 不 */
export function segment(text: string, dict: Map<string, DictEntry>): Segment[] {
  const out: Segment[] = [];
  let i = 0;
  while (i < text.length) {
    // ghi đè cách đọc: {还|huán}
    if (text[i] === '{') {
      const m = text.slice(i).match(/^\{([^|{}]+)\|([^{}]+)\}/);
      if (m) {
        out.push({ text: m[1], pinyin: m[2], han: true, entry: { zh: m[1], pinyin: m[2], vi: '', lesson: 0, known: true } });
        i += m[0].length;
        continue;
      }
    }
    const ch = text[i];
    if (!HAN.test(ch)) {
      // gom ký tự không phải chữ Hán
      let j = i;
      while (j < text.length && !HAN.test(text[j]) && text[j] !== '{') j++;
      if (j === i) j++;
      out.push({ text: text.slice(i, j), han: false });
      i = j;
      continue;
    }
    let matched: DictEntry | undefined;
    for (let len = Math.min(5, text.length - i); len >= 1; len--) {
      const e = dict.get(text.slice(i, i + len));
      if (e) { matched = e; break; }
    }
    if (matched) {
      out.push({ text: matched.zh, pinyin: matched.pinyin, entry: matched, han: true });
      i += matched.zh.length;
    } else {
      out.push({ text: ch, han: true });
      i++;
    }
  }
  // Biến điệu của 不 và 一
  const firstSyl = (s?: Segment) => (s?.pinyin ?? '').match(/^[^\s]*?[aeiouüāáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜ]+/)?.[0] ?? '';
  for (let k = 0; k < out.length; k++) {
    const cur = out[k];
    const prev = out[k - 1];
    const next = out[k + 1];
    if (cur.text !== '不' && cur.text !== '一') continue;
    if (prev && next && prev.han && prev.text === next.text) { cur.pinyin = cur.text === '不' ? 'bu' : 'yi'; continue; } // A不A, A一A
    if (cur.text === '不') {
      if (next?.pinyin && TONE4.test(firstSyl(next))) cur.pinyin = 'bú';
    } else if (next?.han && next.pinyin) {
      // 一 + thanh 4 (hoặc 个) → yí; + thanh 1-3 → yì
      cur.pinyin = TONE4.test(firstSyl(next)) || next.text === '个' ? 'yí' : toneOf(firstSyl(next)) > 0 ? 'yì' : 'yī';
    }
  }
  return out;
}

/** Bỏ dấu thanh: "nǐ hǎo" → "ni hao" */
/** Bỏ ký hiệu ghi đè cách đọc: {还|huán} → 还 */
export function plainZh(s: string): string {
  return s.replace(/\{([^|{}]+)\|[^{}]+\}/g, '$1');
}

export function stripTones(p: string): string {
  return p
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ü/g, 'v')
    .toLowerCase();
}

/** Số thanh của âm tiết pinyin có dấu (0 = thanh nhẹ) */
export function toneOf(syllable: string): number {
  const m = syllable.match(TONE_ANY)?.[0];
  if (!m) return 0;
  const groups = ['āēīōūǖ', 'áéíóúǘ', 'ǎěǐǒǔǚ', 'àèìòùǜ'];
  return groups.findIndex((g) => g.includes(m)) + 1;
}

/** Từ đã học tính đến bài `upTo` */
export function learnedWords(levelId: string, upTo: number) {
  return [...getDict(levelId).values()].filter((e) => (e.lesson > 0 && e.lesson <= upTo) || e.known);
}

const V = 'aeiouüvāáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜ';
const SYL = new RegExp(`(zh|ch|sh|[bpmfdtnlgkhjqxrzcsyw])?[${V}]+(ng(?![${V}])|n(?![${V}])|r(?![${V}]))?`, 'gi');
/** Tách pinyin liền thành âm tiết: "nǚpéngyou" → ["nǚ","péng","you"] */
export function splitSyllables(pinyin: string): string[] {
  return pinyin
    .split(/[\s'’-]+/)
    .flatMap((w) => w.match(SYL) ?? [])
    .filter(Boolean);
}
