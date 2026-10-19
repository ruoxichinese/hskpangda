import { Fragment } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Stars } from '../components/ui';
import { getLessons, getLevel, isReady, isReviewPoint } from '../lib/data';
import { cls } from '../lib/util';
import { hwStatus, lessonStars, useProgress } from '../store/ProgressStore';
import { NotFound } from './NotFound';

const HW_BADGE = {
  locked: { icon: '🔒', text: 'Bài tập: chưa mở' },
  todo: { icon: '📝', text: 'Bài tập: chưa làm' },
  draft: { icon: '📝', text: 'Bài tập: đang làm dở' },
  failed: { icon: '📝', text: 'Bài tập: chưa đạt' },
  passed: { icon: '✅', text: 'Bài tập: đạt' },
};

export default function LevelMapPage() {
  const { level: levelId = '' } = useParams();
  const lv = getLevel(levelId);
  const { level } = useProgress();
  if (!lv) return <NotFound />;
  if (!lv.available) {
    return (
      <div className="card text-center">
        <h1 className="text-2xl font-extrabold">{lv.name} sắp ra mắt</h1>
        <Link to="/cap-do" className="btn-ghost mt-4">← Chọn cấp khác</Link>
      </div>
    );
  }
  const prog = level(levelId);
  const lessons = getLessons(levelId);
  const unlocked = (id: number) => {
    const l = lessons.find((x) => x.id === id);
    return id === lessons[0]?.id || !!prog.lessons[id - 1]?.completed || (l && !isReady(l));
  };

  return (
    <div>
      <h1 className="text-3xl font-extrabold">{lv.name}</h1>
      <p className="mb-5 mt-1 text-muted">{lv.subtitle}. Học xong mỗi bài sẽ mở bài tập về nhà; sau mỗi {lv.reviewEvery} bài có mốc ôn tập <span className="han">学习小结</span>.</p>
      <ol className="relative grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {lessons.map((l) => {
          const lp = prog.lessons[l.id];
          const open = unlocked(l.id);
          const hs = hwStatus(prog, l.id);
          const hwInfo = prog.homework[l.id];
          const card = (
            <>
              <div className="flex items-start gap-3">
                <span className={cls('tianzi han inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-xl text-2xl font-black', lp?.completed && '!border-good')}>
                  {lp?.completed ? '✓' : l.id}
                </span>
                <div className="min-w-0">
                  <p className="text-xs font-medium text-muted">{l.title.pinyin}</p>
                  <p className="han text-xl font-bold leading-tight" lang="zh-CN">{l.title.zh}</p>
                  <p className="text-sm font-semibold">{l.title.vi}</p>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm">
                <Stars n={lessonStars(lp)} />
                {isReady(l) ? (
                  <span className={cls('rounded-full px-2 py-0.5 font-semibold', hs === 'passed' ? 'bg-good/15 text-good' : 'bg-line/60')}>
                    {HW_BADGE[hs].icon} {HW_BADGE[hs].text}{hs === 'passed' && hwInfo ? ` · ${hwInfo.best}%` : ''}
                  </span>
                ) : <span className="rounded-full bg-line/60 px-2 py-0.5 font-semibold">🚧 Đang soạn</span>}
              </div>
            </>
          );
          return (
            <Fragment key={l.id}>
              <li>
                {open ? (
                  <Link to={`/hsk/${levelId}/bai/${l.id}`} className={cls('card card-lift block h-full', !isReady(l) && 'opacity-75')}>{card}</Link>
                ) : (
                  <div className="card h-full opacity-60" aria-disabled="true">
                    {card}
                    <p className="mt-2 text-sm text-muted">🔒 Hoàn thành bài {l.id - 1} để mở</p>
                  </div>
                )}
              </li>
              {isReviewPoint(lv, l.id) && (
                <li className="sm:col-span-2 lg:col-span-3">
                  {prog.lessons[l.id]?.completed ? (
                    <Link to={`/hsk/${levelId}/on-tap/${l.id}`} className="card card-lift flex items-center gap-3 border-dashed">
                      <span className="text-3xl" aria-hidden>📚</span>
                      <span><b className="han">学习小结</b> – Ôn tập bài {l.id - lv.reviewEvery + 1}–{l.id}{prog.review[l.id]?.quizBest !== undefined && ` · Ôn tập: ${prog.review[l.id].quizBest}%`}</span>
                    </Link>
                  ) : (
                    <div className="card flex items-center gap-3 border-dashed opacity-60">
                      <span className="text-3xl" aria-hidden>📚</span>
                      <span><b className="han">学习小结</b> – Mở sau khi học xong bài {l.id}</span>
                    </div>
                  )}
                </li>
              )}
            </Fragment>
          );
        })}
      </ol>
    </div>
  );
}
