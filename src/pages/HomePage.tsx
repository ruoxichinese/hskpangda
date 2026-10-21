import { Link } from 'react-router-dom';
import { PandaMascot } from '../components/panda/PandaMascot';
import { ProgressBar } from '../components/ui';
import { getLessons, getLevel, isReady } from '../lib/data';
import { daysBetween, todayStr } from '../lib/util';
import { BADGES, hwStatus, useProgress } from '../store/ProgressStore';
import { useScenes } from '../components/Backdrop';
import { readJSON, writeJSON } from '../lib/util';
import { useState } from 'react';

export default function HomePage() {
  const { global, level } = useProgress();
  const lv = getLevel(global.lastLevel) ?? getLevel('hsk1')!;
  const prog = level(lv.id);
  const lessons = getLessons(lv.id);
  const completed = lessons.filter((l) => prog.lessons[l.id]?.completed).length;
  const next = lessons.find((l) => isReady(l) && !prog.lessons[l.id]?.completed) ?? lessons.find((l) => !prog.lessons[l.id]?.completed);
  const pendingHw = lessons.filter((l) => ['todo', 'draft', 'failed'].includes(hwStatus(prog, l.id)));
  const lapsed = global.streak.last ? daysBetween(global.streak.last, todayStr()) : 0;
  const sleepy = lapsed >= 2;
  const started = Object.keys(prog.lessons).length > 0;
  const xpLevel = Math.floor(global.xp / 200) + 1;
  const scenes = useScenes();
  const [seen, setSeen] = useState(() => readJSON<string>('pangda.sceneSeen', 'bamboo'));
  const newScene = scenes.highest.id !== 'bamboo' && scenes.highest.id !== seen ? scenes.highest : null;

  const greeting = sleepy
    ? <>Oáp… {lapsed} ngày rồi bạn chưa học. Học 5 phút thôi để giữ chuỗi 🔥 nhé!</>
    : started
      ? <>Chào mừng bạn quay lại! Hôm nay học tiếp bài {next?.id} nhé?</>
      : <>Chào bạn! Mình là <b>Pàngdá 胖达</b>. Mình sẽ cùng bạn học tiếng Trung từ con số 0.</>;

  return (
    <div className="space-y-6">
      <section className="card flex flex-col items-center gap-4 overflow-hidden sm:flex-row sm:items-end">
        <PandaMascot mood={sleepy ? 'sleepy' : 'wave'} size={150} stage={lv.pandaStage} message={greeting} />
        <div className="w-full flex-1 sm:pb-2">
          <p className="label">Đang học</p>
          <h1 className="text-2xl font-extrabold">{lv.name}</h1>
          <div className="mt-2"><ProgressBar value={completed} max={lv.lessonCount} label="Tiến độ cấp hiện tại" /></div>
          <p className="mt-1 text-sm text-muted">{completed}/{lv.lessonCount} bài đã hoàn thành</p>
          {next && (
            <Link to={`/hsk/${lv.id}/bai/${next.id}`} className="btn-primary mt-4 w-full !justify-between !rounded-3xl !px-5 !py-3 sm:w-auto sm:min-w-[22rem]">
              <span className="flex flex-col items-start leading-tight">
                <span className="text-base">{started ? 'Học tiếp' : 'Bắt đầu học'} · Bài {next.id}</span>
                <span className="font-hanfun text-2xl font-normal" lang="zh-CN">{next.title.zh}</span>
              </span>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z" /></svg>
            </Link>
          )}
        </div>
      </section>

      {newScene && (
        <section className="card pop flex flex-col items-center gap-3 text-center sm:flex-row sm:text-left">
          <PandaMascot mood="celebrate" size={80} stage={lv.pandaStage} />
          <div className="min-w-0 sm:flex-1">
            <p className="font-display text-lg font-bold">Mở khoá vùng đất mới: {newScene.name}!</p>
            <p className="text-sm text-muted">{newScene.desc}. Pàngdá đã chuyển đến đây cùng bạn.</p>
          </div>
          <button className="btn-ghost" onClick={() => { writeJSON('pangda.sceneSeen', newScene.id); setSeen(newScene.id); }}>Tuyệt vời!</button>
        </section>
      )}

      <section className="grid gap-4 sm:grid-cols-3">
        <div className="card text-center">
          <p className="text-4xl" aria-hidden>🔥</p>
          <p className="text-3xl font-black">{global.streak.count}</p>
          <p className="text-sm text-muted">ngày học liên tiếp</p>
        </div>
        <div className="card text-center">
          <p className="text-4xl" aria-hidden>⚡</p>
          <p className="text-3xl font-black">{global.xp} XP</p>
          <div className="mx-auto mt-2 max-w-[12rem]"><ProgressBar value={global.xp % 200} max={200} label="XP tới cấp độ tiếp theo" /></div>
          <p className="mt-1 text-sm text-muted">Cấp độ {xpLevel} · còn {200 - (global.xp % 200)} XP</p>
        </div>
        <div className="card text-center">
          <p className="text-4xl" aria-hidden>📒</p>
          <p className="text-3xl font-black">{prog.known.length}</p>
          <p className="text-sm text-muted">từ đã thuộc</p>
        </div>
      </section>

      {pendingHw.length > 0 && (
        <section className="card">
          <h2 className="mb-2 text-lg font-extrabold">📝 Bài tập về nhà chưa xong</h2>
          <ul className="flex flex-wrap gap-2">
            {pendingHw.map((l) => (
              <li key={l.id}>
                <Link to={`/hsk/${lv.id}/bai/${l.id}/bai-tap-ve-nha`} className="chip">
                  Bài {l.id} · {hwStatus(prog, l.id) === 'draft' ? 'đang làm dở' : hwStatus(prog, l.id) === 'failed' ? 'chưa đạt' : 'chưa làm'}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="card">
        <h2 className="mb-3 text-lg font-extrabold">🏅 Huy hiệu</h2>
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
          {Object.entries(BADGES).map(([id, b]) => {
            const has = global.badges.includes(id);
            return (
              <li key={id} className={has ? 'text-center' : 'text-center opacity-60 grayscale'} title={b.desc}>
                <span className="text-4xl" aria-hidden>{b.emoji}</span>
                <p className="text-sm font-bold leading-tight">{b.name}</p>
                <p className="text-xs text-muted">{has ? 'Đã đạt' : b.desc}</p>
              </li>
            );
          })}
        </ul>
      </section>

      <div className="flex flex-wrap gap-2">
        <Link to="/cap-do" className="btn-ghost">🗂️ Chọn cấp HSK</Link>
        <Link to="/tu-vung" className="btn-ghost">📒 Sổ từ vựng</Link>
        <Link to="/ngu-phap" className="btn-ghost">🧩 Kho ngữ pháp</Link>
      </div>
    </div>
  );
}
