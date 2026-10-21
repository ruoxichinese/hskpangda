import { useEffect, useRef, useState } from 'react';
import { playSrc, recognitionSupported, recognize, speak, speakSequence, stopAll, say } from '../lib/audio';
import { getCharacter } from '../lib/data';
import { compareKey, similarity } from '../lib/grading';
import { cls } from '../lib/util';
import { useLevelPrefs, useProgress } from '../store/ProgressStore';
import type { TextSection, TranslationMode } from '../types';
import { Avatar, SpeakButton, SpeedPicker } from './ui';
import { ZhText } from './ZhText';

/**
 * Hội thoại dạng bong bóng chat + nghe karaoke + chế độ Đóng vai (chấm phát âm đơn giản).
 */
export function DialoguePlayer({ text, levelId, lessonId }: { text: TextSection; levelId: string; lessonId: number }) {
  const prefs = useLevelPrefs(levelId);
  const { setSettings } = useProgress();
  const [active, setActive] = useState(-1);
  const [playing, setPlaying] = useState(false);
  const [trans, setTrans] = useState<TranslationMode>(prefs.translation);
  const [shownTrans, setShownTrans] = useState<Record<number, boolean>>({});
  const [role, setRole] = useState<string | null>(null);
  const [rpIndex, setRpIndex] = useState(-1);
  const [scores, setScores] = useState<Record<number, number | 'skip'>>({});
  const [listening, setListening] = useState(false);
  const lineRefs = useRef<(HTMLLIElement | null)[]>([]);

  const speakers = Array.from(new Set(text.lines.map((l) => l.speaker)));
  const left = speakers[0];

  useEffect(() => () => stopAll(), []);
  useEffect(() => setTrans(prefs.translation), [prefs.translation]);
  useEffect(() => {
    if (active >= 0) lineRefs.current[active]?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [active]);

  // mốc thời gian từng câu trong file nghe → nghe riêng từng câu bằng giọng thật
  const timed = !!text.audio && text.lines.every((l) => typeof l.t === 'number');
  const segOf = (i: number) => (timed ? { start: text.lines[i].t as number, end: text.lines[i + 1]?.t as number | undefined } : undefined);

  const playAll = async () => {
    setRole(null);
    setPlaying(true);
    // ưu tiên mp3 cả đoạn; highlight theo mốc thời gian "t" nếu có
    if (text.audio) {
      const timings = text.lines.map((l) => l.t);
      const ok = await playSrc(text.audio, prefs.speed / 0.75 > 1 ? 1 : prefs.speed / 0.75, (t) => {
        if (timings.every((x) => x !== undefined)) {
          let idx = 0;
          timings.forEach((x, i) => { if (t >= (x as number)) idx = i; });
          setActive(idx);
        }
      });
      if (ok) { setActive(-1); setPlaying(false); return; }
    }
    await speakSequence(text.lines.map((l) => l.zh), prefs.speed, setActive);
    setPlaying(false);
  };
  const stop = () => { stopAll(); setPlaying(false); setActive(-1); setRpIndex(-1); setListening(false); };

  // ===== Đóng vai =====
  const startRole = (r: string) => {
    stopAll();
    setRole(r);
    setScores({});
    setRpIndex(0);
  };
  useEffect(() => {
    if (!role || rpIndex < 0) return;
    if (rpIndex >= text.lines.length) { setActive(-1); return; }
    setActive(rpIndex);
    const line = text.lines[rpIndex];
    if (line.speaker !== role) {
      let cancelled = false;
      (timed ? say(line.zh, prefs.speed, text.audio, segOf(rpIndex)) : speak(line.zh, prefs.speed)).then(() => { if (!cancelled) setRpIndex((i) => i + 1); });
      return () => { cancelled = true; };
    }
  }, [role, rpIndex, text.lines, prefs.speed]); // eslint-disable-line react-hooks/exhaustive-deps

  const myTurn = role && rpIndex >= 0 && rpIndex < text.lines.length && text.lines[rpIndex].speaker === role;
  const rpDone = role && rpIndex >= text.lines.length;

  const recordMine = async () => {
    setListening(true);
    const heard = await recognize();
    setListening(false);
    const target = compareKey(text.lines[rpIndex].zh);
    const score = heard ? Math.round(similarity(compareKey(heard), target) * 100) : 0;
    setScores((s) => ({ ...s, [rpIndex]: score }));
    setTimeout(() => setRpIndex((i) => i + 1), 900);
  };

  const rpScores = Object.values(scores).filter((x): x is number => typeof x === 'number');
  const avg = rpScores.length ? Math.round(rpScores.reduce((a, b) => a + b, 0) / rpScores.length) : null;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {!playing ? (
          <button className="btn-primary" onClick={playAll}>▶ Nghe cả đoạn</button>
        ) : (
          <button className="btn-ghost" onClick={stop}>⏹ Dừng</button>
        )}
        <SpeedPicker value={prefs.speed} onChange={(v) => setSettings({ speed: v })} />
        <button className="chip" onClick={() => setTrans(trans === 'shown' ? 'tap' : 'shown')} aria-pressed={trans === 'shown'}>
          {trans === 'shown' ? '🙈 Ẩn bản dịch' : '👀 Hiện bản dịch'}
        </button>
      </div>

      {speakers.length > 1 && !text.passage && (
      <div className="rounded-2xl border-2 border-dashed border-line p-3">
        <p className="mb-2 font-bold">🎭 Đóng vai</p>
        <p className="mb-2 text-sm text-muted">
          Chọn một nhân vật. Máy sẽ đọc lời nhân vật còn lại, đến lượt bạn thì nói theo.
          {!recognitionSupported() && ' Trình duyệt này chưa hỗ trợ nhận dạng giọng nói, nên bạn tự đọc rồi bấm “Tiếp”.'}
        </p>
        <div className="flex flex-wrap gap-2">
          {speakers.map((s) => {
            const c = getCharacter(s);
            return (
              <button key={s} className={cls('chip', role === s && 'chip-on')} onClick={() => startRole(s)}>
                <Avatar id={s} size={24} /> {c?.zh} <span className="text-muted">{c?.vi_name}</span>
              </button>
            );
          })}
          {role && <button className="chip" onClick={stop}>✕ Thoát</button>}
        </div>
        {rpDone && (
          <p className="pop mt-2 font-semibold" aria-live="polite">
            🎉 Xong vai! {avg !== null ? `Điểm phát âm trung bình: ${avg}/100.` : 'Bạn đã luyện hết lượt của mình.'}
            <button className="chip ml-2" onClick={() => startRole(role!)}>Làm lại</button>
          </p>
        )}
      </div>

      )}

      {text.passage && (
        <div className="rounded-2xl border-2 border-line bg-bg p-4">
          <div className="mb-2 flex items-center gap-2">
            <Avatar id={text.lines[0].speaker} size={32} />
            <span className="font-semibold"><span className="font-han">{getCharacter(text.lines[0].speaker)?.zh}</span> {getCharacter(text.lines[0].speaker)?.vi_name}</span>
          </div>
          <p className="leading-[2.5]">
            {text.lines.map((l, i) => (
              <span key={i} className={cls('rounded-lg px-0.5', active === i && 'karaoke')}>
                <ZhText text={l.zh} levelId={levelId} pinyin={prefs.pinyin} upTo={lessonId} size="lg" />
              </span>
            ))}
          </p>
          {trans !== 'hidden' && (trans === 'shown' || shownTrans[-1] ? (
            <p className="mt-3 border-t border-line pt-3 text-muted">{text.lines.map((l) => l.vi).join(' ')}</p>
          ) : (
            <button className="mt-2 text-sm font-semibold text-accent underline" onClick={() => setShownTrans((s) => ({ ...s, [-1]: true }))}>Xem bản dịch</button>
          ))}
        </div>
      )}

      {!text.passage && <ol className="space-y-3" aria-label="Hội thoại">
        {text.lines.map((line, i) => {
          const c = getCharacter(line.speaker);
          const isLeft = line.speaker === left;
          const showT = trans === 'shown' || shownTrans[i];
          const tip = line.tipRef !== undefined ? text.tips?.[line.tipRef] : undefined;
          return (
            <li key={i} ref={(el) => (lineRefs.current[i] = el)} className={cls('flex gap-2', !isLeft && 'flex-row-reverse')}>
              <div className="flex w-16 shrink-0 flex-col items-center text-center">
                <Avatar id={line.speaker} />
                <span className="mt-1 whitespace-nowrap font-han text-xs leading-tight">{c?.zh}</span>
              </div>
              <div className={cls('min-w-0 max-w-[85%]', !isLeft && 'items-end text-right')}>
                <div
                  className={cls(
                    'inline-block rounded-2xl border-2 border-line bg-bg px-3 py-2 text-left shadow-sm',
                    isLeft ? 'rounded-tl-sm' : 'rounded-tr-sm',
                    active === i && 'karaoke',
                    myTurn && rpIndex === i && 'border-primary',
                  )}
                >
                  <div className="flex items-start gap-2">
                    <ZhText text={line.zh} levelId={levelId} pinyin={prefs.pinyin} upTo={lessonId} size="lg" />
                    <SpeakButton text={line.zh} rate={prefs.speed} size="sm" label={`Nghe câu ${i + 1}`} src={timed ? text.audio : undefined} seg={segOf(i)} />
                  </div>
                  {trans !== 'hidden' && (showT ? (
                    <p className="mt-1 text-sm text-muted">{line.vi}</p>
                  ) : (
                    <button className="mt-1 text-sm font-semibold text-accent underline" onClick={() => setShownTrans((s) => ({ ...s, [i]: true }))}>
                      Xem nghĩa
                    </button>
                  ))}
                  {myTurn && rpIndex === i && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {recognitionSupported() ? (
                        <button className="btn-primary !py-1.5 !text-base" onClick={recordMine} disabled={listening}>
                          {listening ? '🎙️ Đang nghe…' : '🎤 Đến lượt bạn – nói đi!'}
                        </button>
                      ) : null}
                      <button className="chip" onClick={() => { setScores((s) => ({ ...s, [i]: 'skip' })); setRpIndex(i + 1); }}>Tiếp ⏭</button>
                    </div>
                  )}
                  {typeof scores[i] === 'number' && (
                    <p className={cls('mt-1 text-sm font-bold', (scores[i] as number) >= 70 ? 'text-good' : 'text-bad')}>
                      Phát âm: {scores[i]}/100 {(scores[i] as number) >= 70 ? '👍' : '– thử nói chậm và rõ hơn nhé'}
                    </p>
                  )}
                </div>
                {tip && (
                  <p className="mt-2 rounded-xl bg-primary/10 px-3 py-2 text-left text-sm">
                    🐼 <b>Pàngdá nhắc:</b> {tip.vi}
                  </p>
                )}
              </div>
            </li>
          );
        })}
      </ol>}
    </div>
  );
}
