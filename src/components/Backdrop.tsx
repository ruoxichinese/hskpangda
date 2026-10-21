import { getLessons, levels } from '../lib/data';
import { useProgress } from '../store/ProgressStore';
import { useTheme } from '../theme/ThemeProvider';
import { SCENES, SceneArt } from './scenes';

export { SceneArt };

const W = 1440;
const H = 520;

/** Phông nền nào đã mở khoá, đang dùng phông nào */
export function useScenes() {
  const { level, settings } = useProgress();
  const list = levels.map((lv, i) => {
    const started = (id: string) => getLessons(id).some((l) => level(id).lessons[l.id]?.completed);
    const unlocked = i === 0 || levels.slice(i).some((x) => started(x.id));
    return { level: lv, ...lv.scene, unlocked };
  });
  const highest = [...list].reverse().find((s) => s.unlocked) ?? list[0];
  const chosen = list.find((s) => s.id === settings.scene && s.unlocked);
  return { list, highest, current: settings.scene === 'auto' || !chosen ? highest : chosen };
}

export function Backdrop() {
  const { mode } = useTheme();
  const { current } = useScenes();
  const s = SCENES[current.id] ?? SCENES.bamboo;
  const dark = mode === 'dark';
  return (
    <div aria-hidden="true" className="no-print pointer-events-none fixed inset-0 -z-10" style={{ background: s.sky[dark ? 1 : 0], transition: 'background-color 300ms' }}>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMax slice" className="absolute bottom-0 left-0 w-full" style={{ height: '42vh', minHeight: 220 }}>
        <s.C d={dark} />
      </svg>
    </div>
  );
}
