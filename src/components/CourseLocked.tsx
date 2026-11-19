import { Link } from 'react-router-dom';
import { getLevel } from '../lib/data';
import { PandaMascot } from './panda/PandaMascot';

export function CourseLocked({ levelId }: { levelId?: string }) {
  const lv = getLevel(levelId);
  return (
    <div className="mx-auto max-w-lg py-8">
      <section className="card space-y-3 text-center" role="alert">
        <PandaMascot mood="sign" size={120} signText="🔒" />
        <h1 className="font-display text-2xl font-extrabold">Khoá này chưa được mở cho lớp của bạn</h1>
        <p className="text-muted">{lv ? <>Khoá <b>{lv.name}</b> chưa nằm trong các khoá giáo viên mở cho lớp bạn.</> : null} Nếu bạn cần học khoá này, hãy nhắn giáo viên.</p>
        <Link to="/cap-do" className="btn-primary inline-block">Xem các khoá bạn được học</Link>
      </section>
    </div>
  );
}
