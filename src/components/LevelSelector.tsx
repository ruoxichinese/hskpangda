import { Link } from 'react-router-dom';
import { getLessons, isReady, levels } from '../lib/data';
import { useProgress } from '../store/ProgressStore';
import { PandaMascot } from './panda/PandaMascot';
import { ProgressBar } from './ui';

const STAGE_NOTE = ['Gấu con', 'Gấu đeo băng đô', 'Gấu đeo kính', 'Gấu tốt nghiệp'];

/** Chọn cấp HSK 3.0 – cấp chưa mở hiển thị "Sắp ra mắt" với Pàngdá ôm biển báo */
export function LevelSelector() {
  const { level } = useProgress();
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {levels.map((lv) => {
        const lessons = getLessons(lv.id);
        const done = lessons.filter((l) => level(lv.id).lessons[l.id]?.completed).length;
        const ready = lessons.filter(isReady).length;
        const body = (
          <>
            <div className="flex items-start justify-between gap-2">
              <div>
                <span className="inline-block rounded-full px-3 py-1 text-sm font-extrabold text-white" style={{ background: lv.badgeColor }}>
                  Cấp {lv.num}
                </span>
                <h2 className="mt-2 text-xl font-extrabold">{lv.name}</h2>
                <p className="text-sm text-muted">{lv.subtitle}</p>
              </div>
              <PandaMascot mood={lv.available ? 'wave' : 'sign'} size={84} stage={lv.pandaStage} />
            </div>
            {lv.available ? (
              <div className="mt-3">
                <ProgressBar value={done} max={lv.lessonCount} label={`Tiến độ ${lv.name}`} />
                <p className="mt-1 text-sm text-muted">{done}/{lv.lessonCount} bài · {ready} bài đã có nội dung đầy đủ</p>
              </div>
            ) : (
              <p className="mt-3 text-sm font-semibold text-muted">🔒 Sắp ra mắt · Phần thưởng: {STAGE_NOTE[lv.pandaStage]}</p>
            )}
          </>
        );
        return lv.available ? (
          <Link key={lv.id} to={`/hsk/${lv.id}`} className="card card-lift block">{body}</Link>
        ) : (
          <div key={lv.id} className="card opacity-80" aria-disabled="true">{body}</div>
        );
      })}
    </div>
  );
}
