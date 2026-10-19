// Gom dữ liệu nét chữ (hanzi-writer-data) cho mọi chữ Hán xuất hiện trong từ vựng & bài học
// → src/data/hanzi-strokes.json, để tập viết hoạt động cả khi không có mạng.
// Chạy lại sau khi thêm bài: node scripts/build-hanzi-data.mjs
import fs from 'node:fs';
import path from 'node:path';
const root = path.resolve(import.meta.dirname, '..');
const dataDir = path.join(root, 'src/data');
const chars = new Set();
const walk = (d) => {
  for (const f of fs.readdirSync(d)) {
    const p = path.join(d, f);
    if (fs.statSync(p).isDirectory()) walk(p);
    else if (/lesson-\d+\.json$|glossary\.json$|wordlist\.json$/.test(f)) {
      const txt = fs.readFileSync(p, 'utf8');
      for (const c of txt) if (/[\u4e00-\u9fff]/.test(c)) chars.add(c);
    }
  }
};
walk(dataDir);
const out = {};
let miss = 0;
for (const c of chars) {
  const f = path.join(root, 'node_modules/hanzi-writer-data', `${c}.json`);
  if (fs.existsSync(f)) out[c] = JSON.parse(fs.readFileSync(f, 'utf8'));
  else miss++;
}
fs.writeFileSync(path.join(dataDir, 'hanzi-strokes.json'), JSON.stringify(out));
console.log(`Đã gói ${Object.keys(out).length} chữ (${miss} chữ không có dữ liệu).`);
