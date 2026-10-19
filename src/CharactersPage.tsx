import { Avatar } from '../components/ui';
import { characters } from '../lib/data';

const GROUPS = [
  { key: 'ai', title: '🤖 Trợ lý AI' },
  { key: 'overseas', title: '🌍 Ở nước ngoài – lớp học của cô Vương' },
  { key: 'china', title: '🇨🇳 Ở Trung Quốc – gia đình và đồng nghiệp' },
  { key: 'group', title: '👥 Nhân vật phụ' },
] as const;

export default function CharactersPage() {
  return (
    <div>
      <h1 className="text-3xl font-extrabold">👥 Nhân vật trong sách</h1>
      <p className="mb-5 mt-1 max-w-prose text-muted">Câu chuyện diễn ra ở hai bối cảnh: lớp tiếng Trung của cô Vương Nhất Phi ở nước ngoài, và gia đình chị họ Vương Nhất Tuyết ở Bắc Kinh.</p>
      {GROUPS.map((g) => (
        <section key={g.key} className="mb-6">
          <h2 className="h-section mb-3">{g.title}</h2>
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {characters.filter((c) => c.setting === g.key).map((c) => (
              <li key={c.id} className="card flex gap-3">
                <Avatar id={c.id} size={56} />
                <div>
                  <p className="han text-xl font-bold">{c.zh} <span className="font-sans text-sm font-medium text-accent">{c.pinyin}</span></p>
                  <p className="font-semibold">{c.vi_name}</p>
                  <p className="text-sm text-muted">{c.desc_vi}</p>
                  {c.levelNotes && Object.entries(c.levelNotes).map(([lv, note]) => (
                    <p key={lv} className="mt-1 text-sm"><b className="text-accent">{lv.toUpperCase()}:</b> {note}</p>
                  ))}
                </div>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
