import type { HwQuestion } from '../../types';

type Essay = Extract<HwQuestion, { kind: 'essay' }>;
const han = (t: string) => (t.match(/[\u4e00-\u9fff]/g) ?? []).length;

/** Thang chấm bài viết (Phụ lục A2 của giáo trình) */
export const RUBRIC_A2: [string, string, string][] = [
  ['Bố cục', 'Đủ 主题 → 称呼 → 正文 → 结束语 → 落款', 'Thiếu phần chính (tiêu đề / yêu cầu)'],
  ['Nội dung', 'Rõ mục đích, số liệu, thời hạn, người phụ trách', 'Người nhận không biết cần làm gì'],
  ['Văn phong', 'Đúng register (贵司/我司, 烦请…), uyển chuyển', 'Lẫn nhiều khẩu ngữ, sai register'],
  ['Ngôn ngữ', '≤ 2 lỗi chữ / ngữ pháp', '> 10 lỗi hoặc lỗi làm sai nghĩa'],
];

export function EssayQuestion({ q, value, onChange }: { q: Essay; value?: string; onChange: (v: string) => void }) {
  const t = value ?? '';
  const n = han(t);
  return (
    <div className="space-y-3">
      <p className="text-lg font-semibold">✍️ {q.prompt_vi}</p>
      <ul className="list-inside list-disc text-sm">
        {q.requirements_vi.map((r) => <li key={r}>{r}</li>)}
      </ul>
      <p className="text-sm">Nên dùng văn phong trang trọng, ví dụ: <span className="han">{q.keywords.join('、')}</span></p>
      <textarea
        value={t}
        onChange={(e) => onChange(e.target.value)}
        rows={10}
        lang="zh-CN"
        aria-label="Bài viết của bạn"
        placeholder="主题：……&#10;尊敬的……：&#10;您好！……"
        className="w-full rounded-2xl border-2 border-line bg-card p-3 font-han text-lg leading-relaxed focus:border-primary focus:outline-none"
      />
      <p className={n >= q.minChars ? 'text-sm font-semibold text-good' : 'text-sm text-muted'}>
        {n} / {q.minChars} chữ Hán tối thiểu · Bài được lưu để giáo viên đọc và nhận xét.
      </p>
    </div>
  );
}

export function EssayReview({ q, text }: { q: Essay; text: string }) {
  const hit = q.keywords.filter((k) => text.includes(k));
  return (
    <div className="mt-2 space-y-3 text-sm">
      <p>Độ dài: <b>{han(text)}</b> / {q.minChars} chữ · Từ văn phong đã dùng: <span className="han">{hit.length ? hit.join('、') : '(chưa có)'}</span>
        {hit.length < q.keywords.length && <> · Chưa dùng: <span className="han text-muted">{q.keywords.filter((k) => !hit.includes(k)).join('、')}</span></>}</p>
      <details className="rounded-xl bg-bg p-3" open>
        <summary className="cursor-pointer font-bold">📄 Bài mẫu tham khảo</summary>
        <p className="han mt-2 whitespace-pre-line text-base leading-relaxed" lang="zh-CN">{q.model}</p>
      </details>
      <details className="rounded-xl bg-bg p-3">
        <summary className="cursor-pointer font-bold">📏 Tự chấm theo thang A2 (giáo viên chấm cùng thang này)</summary>
        <table className="mt-2 w-full text-left text-xs">
          <thead><tr className="text-muted"><th className="py-1">Tiêu chí</th><th>4 điểm</th><th>1 điểm</th></tr></thead>
          <tbody>{RUBRIC_A2.map(([c, hi, lo]) => <tr key={c} className="border-t border-line"><td className="py-1 font-bold">{c}</td><td>{hi}</td><td>{lo}</td></tr>)}</tbody>
        </table>
      </details>
    </div>
  );
}
