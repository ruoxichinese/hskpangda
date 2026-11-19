// Sinh src/data/<cấp>/dict-index.json: chỉ mục từ điển gọn của mỗi cấp (từ nền + bảng tra + từ mới kèm số bài).
// Website chỉ cần file nhỏ này để tra pinyin cho các cấp trước, không phải tải nguyên bài học.
// Chạy tự động trước dev / build / test (xem package.json).
import { readdirSync, readFileSync, writeFileSync, existsSync, statSync } from 'node:fs';
import { join } from 'node:path';

const DATA = 'src/data';
for (const lv of readdirSync(DATA)) {
  const dir = join(DATA, lv);
  if (!statSync(dir).isDirectory()) continue;
  const lessons = readdirSync(dir).filter((f) => /^lesson-\d+\.json$/.test(f));
  const read = (f) => JSON.parse(readFileSync(join(dir, f), 'utf8'));
  const pick = ({ zh, pinyin, vi, known, noDict }) => ({ zh, pinyin, vi, ...(known ? { known } : {}), ...(noDict ? { noDict } : {}) });
  const out = {
    wordlist: existsSync(join(dir, 'wordlist.json')) ? (read('wordlist.json').words ?? read('wordlist.json')).map(pick) : [],
    glossary: existsSync(join(dir, 'glossary.json')) ? read('glossary.json').words.map(pick) : [],
    vocab: lessons.flatMap((f) => {
      const l = read(f);
      return l.texts.flatMap((t) => t.vocab.map((v) => ({ ...pick(v), lesson: l.id, textId: t.id })));
    }),
  };
  if (!lessons.length && !out.wordlist.length && !out.glossary.length) continue;
  writeFileSync(join(dir, 'dict-index.json'), JSON.stringify(out));
  console.log(`dict-index ${lv}: ${out.vocab.length} từ mới, ${out.glossary.length} bảng tra, ${out.wordlist.length} từ nền`);
}
