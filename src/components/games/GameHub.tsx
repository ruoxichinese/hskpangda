import { useState } from 'react';
import { useLevelPrefs, useProgress } from '../../store/ProgressStore';
import type { VocabItem } from '../../types';
import { PandaMascot } from '../panda/PandaMascot';
import { Confetti } from '../ui';
import { MemoryGame, QuickListenGame, SentenceRaceGame, ToneGame, WritingGame, type GameProps } from './Games';

export const GAMES = [
  { id: 'memory', emoji: '🃏', name: 'Lật thẻ ghép cặp', desc: 'Ghép chữ Hán với nghĩa tiếng Việt', C: MemoryGame },
  { id: 'listen', emoji: '👂', name: 'Nghe nhanh chọn đúng', desc: 'Nghe và chọn chữ trong 8 giây', C: QuickListenGame },
  { id: 'tone', emoji: '🎵', name: 'Bắt thanh điệu', desc: 'Nghe âm tiết, chọn đúng thanh', C: ToneGame },
  { id: 'race', emoji: '🏁', name: 'Xếp câu đua giờ', desc: 'Xếp được bao nhiêu câu trong 60 giây?', C: SentenceRaceGame },
  { id: 'write', emoji: '✍️', name: 'Tập viết chữ', desc: 'Viết từng nét theo đúng thứ tự', C: WritingGame },
] as const;

export function GameHub({ words, lines, levelId, lessonId }: { words: VocabItem[]; lines: string[]; levelId: string; lessonId: number }) {
  const prefs = useLevelPrefs(levelId);
  const { level, recordGame, award } = useProgress();
  const [active, setActive] = useState<string | null>(null);
  const [celebrate, setCelebrate] = useState(0);
  const [lastMsg, setLastMsg] = useState<string | null>(null);
  const games = level(levelId).games;
  const best = (g: string) => games[`${lessonId}:${g}`];

  if (words.length < 4) return <p className="text-muted">Bài này chưa đủ từ vựng để chơi game.</p>;

  const game = GAMES.find((g) => g.id === active);
  if (game) {
    const C = game.C as (p: GameProps) => JSX.Element;
    return (
      <div className="card">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-extrabold">{game.emoji} {game.name}</h3>
          <button className="chip" onClick={() => setActive(null)}>← Chọn game khác</button>
        </div>
        <C
          words={words}
          lines={lines}
          levelId={levelId}
          speed={prefs.speed}
          pinyin={prefs.exercisePinyin}
          onFinish={(score, extra) => {
            const isBest = recordGame(levelId, lessonId, game.id, score);
            if (extra?.perfect) award('tone-master');
            setLastMsg(isBest ? `Kỷ lục mới cho “${game.name}”: ${score} điểm!` : `Bạn được ${score} điểm. Kỷ lục vẫn là ${best(game.id)}.`);
            if (isBest) setCelebrate((c) => c + 1);
            setActive(null);
          }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Confetti fire={celebrate} />
      {lastMsg && <PandaMascot mood="celebrate" size={70} message={lastMsg} />}
      <div className="grid gap-3 sm:grid-cols-2">
        {GAMES.map((g) => (
          <button key={g.id} className="card card-lift flex items-center gap-3 text-left" onClick={() => { setLastMsg(null); setActive(g.id); }}>
            <span className="text-4xl" aria-hidden>{g.emoji}</span>
            <span className="min-w-0 flex-1">
              <span className="block font-bold">{g.name}</span>
              <span className="block text-sm text-muted">{g.desc}</span>
            </span>
            <span className="text-right text-sm">
              <span className="block text-muted">Kỷ lục</span>
              <b className="text-lg">{best(g.id) ?? '–'}</b>
            </span>
          </button>
        ))}
      </div>
      <section className="card">
        <h3 className="mb-2 font-extrabold">🏆 Bảng thành tích cá nhân</h3>
        <table className="w-full text-left text-sm">
          <thead><tr className="text-muted"><th className="py-1">Game</th><th>Bài này</th><th>Tốt nhất mọi bài</th></tr></thead>
          <tbody>
            {GAMES.map((g) => {
              const all = Object.entries(games).filter(([k]) => k.endsWith(`:${g.id}`)).map(([, v]) => v);
              return (
                <tr key={g.id} className="border-t border-line">
                  <td className="py-1.5">{g.emoji} {g.name}</td>
                  <td>{best(g.id) ?? '–'}</td>
                  <td>{all.length ? Math.max(...all) : '–'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>
    </div>
  );
}
