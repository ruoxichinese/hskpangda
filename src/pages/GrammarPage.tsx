import { useState } from 'react';
import { Link } from 'react-router-dom';
import { GrammarCard } from '../components/GrammarCard';
import { allGrammar, levels } from '../lib/data';

export default function GrammarPage() {
  const avail = levels.filter((l) => l.available);
  const [levelId, setLevelId] = useState(avail[0].id);
  const [lesson, setLesson] = useState<number | 'all'>('all');
  const items = allGrammar(levelId);
  const lessonIds = Array.from(new Set(items.map((x) => x.lesson.id)));
  const shown = items.filter((x) => lesson === 'all' || x.lesson.id === lesson);
  return (
    <div>
      <h1 className="text-3xl font-extrabold">🧩 Kho ngữ pháp</h1>
      <p className="mb-4 text-muted">Tất cả điểm ngữ pháp Pàngdá đã giảng, kèm lỗi hay gặp và câu kiểm tra nhanh.</p>
      <div className="mb-4 flex flex-wrap gap-2">
        <select aria-label="Lọc theo cấp" className="rounded-xl border-2 border-line bg-bg p-2" value={levelId} onChange={(e) => { setLevelId(e.target.value); setLesson('all'); }}>
          {avail.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
        </select>
        <select aria-label="Lọc theo bài" className="rounded-xl border-2 border-line bg-bg p-2" value={lesson} onChange={(e) => setLesson(e.target.value === 'all' ? 'all' : Number(e.target.value))}>
          <option value="all">Tất cả bài</option>
          {lessonIds.map((id) => <option key={id} value={id}>Bài {id}</option>)}
        </select>
      </div>
      <div className="space-y-4">
        {shown.map(({ g, lesson: l, textId }) => (
          <div key={g.id}>
            <Link to={`/hsk/${levelId}/bai/${l.id}?buoc=${textId}#${g.id}`} className="mb-1 inline-block text-sm font-semibold text-accent underline">Bài {l.id}: {l.title.zh}</Link>
            <GrammarCard g={g} levelId={levelId} lessonId={l.id} defaultOpen={false} />
          </div>
        ))}
      </div>
    </div>
  );
}
