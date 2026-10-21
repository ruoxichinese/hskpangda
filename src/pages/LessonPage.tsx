import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { DialoguePlayer } from '../components/DialoguePlayer';
import { ExerciseEngine } from '../components/ExerciseEngine';
import { GameHub } from '../components/games/GameHub';
import { GrammarCard, QuickCheck } from '../components/GrammarCard';
import { ActivityPanel, CulturePanel, HanziIntroPanel, PinyinIntroPanel, TongueTwister, Warmup } from '../components/LessonSections';
import { PandaMascot } from '../components/panda/PandaMascot';
import { Confetti, PangdaTip } from '../components/ui';
import { VocabTable } from '../components/VocabTable';
import { getLesson, getLessons, getLevel, isReady, isReviewPoint } from '../lib/data';
import { cls } from '../lib/util';
import { hwStatus, useLevelPrefs, useProgress } from '../store/ProgressStore';
import type { Lesson } from '../types';
import { NotFound } from './NotFound';

interface Step { key: string; label: string; short: string }

function buildSteps(l: Lesson): Step[] {
  const s: Step[] = [{ key: 'goals', label: '🎯 Mục tiêu', short: '🎯' }];
  if (l.pinyinIntro) s.push({ key: 'pinyin', label: '🔤 Pinyin & thanh điệu', short: '🔤' });
  if (l.hanziIntro) s.push({ key: 'hanzi', label: '✍️ Hệ thống chữ Hán', short: '✍️' });
  if (l.warmup && l.warmup.length) s.push({ key: 'warmup', label: '🔥 Khởi động', short: '🔥' });
  l.texts.forEach((t, i) => s.push({ key: t.id, label: `${t.passage ? '📄 Bài đọc' : '📖 Bài khoá'} ${i + 1}`, short: `📖${i + 1}` }));
  if (l.exercises.length) s.push({ key: 'exercises', label: '✏️ Luyện tập', short: '✏️' });
  if (l.texts.some((t) => t.vocab.length)) s.push({ key: 'games', label: '🎮 Game', short: '🎮' });
  if (l.activity) s.push({ key: 'activity', label: '👥 Hoạt động lớp', short: '👥' });
  if (l.tongueTwister && l.id <= 3) s.push({ key: 'twister', label: '👅 Nói nhịu', short: '👅' });
  if (l.culture) s.push({ key: 'culture', label: '🎁 Văn hoá', short: '🎁' });
  s.push({ key: 'finish', label: '📝 Bài tập về nhà', short: '📝' });
  return s;
}

export function requiredSections(l: Lesson) {
  return [...(l.pinyinIntro ? ['pinyin'] : []), ...l.texts.map((t) => t.id), ...(l.exercises.length ? ['exercises'] : [])];
}

export default function LessonPage() {
  const { level: levelId = 'hsk1', id } = useParams();
  const lessonId = Number(id);
  const lv = getLevel(levelId);
  const lesson = lv ? getLesson(levelId, lessonId) : undefined;
  const [params, setParams] = useSearchParams();
  const { level, markSection, updateLevel, addXP, award, touch } = useProgress();
  const prefs = useLevelPrefs(levelId);
  const [fire, setFire] = useState(0);
  const [newScene, setNewScene] = useState<string | null>(null);
  const stepperRef = useRef<HTMLDivElement>(null);

  const steps = useMemo(() => (lesson ? buildSteps(lesson) : []), [lesson]);
  const current = params.get('buoc') ?? 'goals';
  const stepIdx = Math.max(0, steps.findIndex((s) => s.key === current));
  const step = steps[stepIdx];
  const lp = level(levelId).lessons[lessonId] ?? { sections: [] };
  const done = new Set(lp.sections);

  useEffect(() => { touch(levelId); }, [levelId, touch]);
  useEffect(() => {
    stepperRef.current?.querySelector(`[data-step="${step?.key}"]`)?.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' });
    // nhảy tới ô ngữ pháp nếu có #id
    const hash = window.location.hash.slice(1);
    if (hash) setTimeout(() => document.getElementById(hash)?.scrollIntoView({ behavior: 'smooth' }), 200);
    else window.scrollTo({ top: 0 });
  }, [step?.key]);

  const go = useCallback((key: string) => setParams({ buoc: key }), [setParams]);
  const finishSection = (key: string) => {
    markSection(levelId, lessonId, key);
    const next = steps[stepIdx + 1];
    if (next) go(next.key);
  };
  const onExercises = useCallback((score: number) => {
    updateLevel(levelId, (p) => {
      const l = (p.lessons[lessonId] ??= { sections: [] });
      l.exScore = Math.max(l.exScore ?? 0, score);
      if (!l.sections.includes('exercises')) l.sections.push('exercises');
    });
    addXP(Math.round(score / 5));
  }, [levelId, lessonId, updateLevel, addXP]);

  if (!lv || !lesson) return <NotFound />;

  const required = requiredSections(lesson);
  const missing = required.filter((r) => !done.has(r));
  const ready = isReady(lesson);
  const allVocab = lesson.texts.flatMap((t) => t.vocab);
  const nextLesson = getLessons(levelId).find((l) => l.id === lessonId + 1);
  const hs = hwStatus(level(levelId), lessonId);

  const completeLesson = () => {
    if (lp.completed) return;
    const firstInLevel = !getLessons(levelId).some((l) => level(levelId).lessons[l.id]?.completed);
    if (firstInLevel && lv.id !== 'hsk1') setNewScene(lv.scene.name);
    updateLevel(levelId, (p) => { (p.lessons[lessonId] ??= { sections: [] }).completed = true; });
    addXP(50);
    award('first-lesson');
    setFire((f) => f + 1);
  };

  const DoneButton = ({ k }: { k: string }) => (
    <div className="mt-6 flex justify-end">
      <button className="btn-primary" onClick={() => finishSection(k)}>
        {done.has(k) ? 'Tiếp tục →' : '✓ Xong phần này'}
      </button>
    </div>
  );

  let content: React.ReactNode = null;
  const text = lesson.texts.find((t) => t.id === step.key);
  if (step.key === 'goals') {
    content = (
      <div className="space-y-5">
        <div className="card flex flex-col gap-4 sm:flex-row sm:items-center">
          <PandaMascot mood="wave" size={110} stage={lv.pandaStage} message={<>Chào bạn! Hôm nay mình học bài {lesson.id} nhé. Bấm từng mục trên thanh bước để đi tới phần bất kỳ.</>} />
        </div>
        <section className="card">
          <h2 className="h-section mb-3">🎯 Mục tiêu <span className="han text-base text-muted">目标</span></h2>
          <ul className="space-y-2">
            {lesson.objectives.map((o) => {
              const ok = o.doneWhen.length > 0 && o.doneWhen.every((k) => done.has(k));
              return (
                <li key={o.id} className="flex items-start gap-3">
                  <span className={cls('mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md border-2', ok ? 'border-good bg-good text-white' : 'border-line')} aria-hidden>{ok ? '✓' : ''}</span>
                  <span className={cls(ok && 'text-muted line-through decoration-good/60')}>{o.vi}<span className="sr-only">{ok ? ' – đã đạt' : ' – chưa đạt'}</span></span>
                </li>
              );
            })}
          </ul>
          <h3 className="label mt-4">Điểm ngữ pháp trong bài</h3>
          <ul className="mt-1 flex flex-wrap gap-2">{lesson.grammarTopics_vi.map((g) => <li key={g} className="chip !cursor-default">{g}</li>)}</ul>
        </section>
        {!ready && (
          <PangdaTip title="🚧 Bài đang được soạn">
            Bài này mới có khung nội dung. Xem file <code>src/data/{levelId}/lesson-{String(lessonId).padStart(2, '0')}.json</code> và README để bổ sung bài khoá, từ vựng và bài tập.
          </PangdaTip>
        )}
        <DoneButton k="goals" />
      </div>
    );
  } else if (step.key === 'pinyin' && lesson.pinyinIntro) {
    content = <><PinyinIntroPanel data={lesson.pinyinIntro} speed={prefs.speed} /><DoneButton k="pinyin" /></>;
  } else if (step.key === 'hanzi' && lesson.hanziIntro) {
    content = <><HanziIntroPanel data={lesson.hanziIntro} /><DoneButton k="hanzi" /></>;
  } else if (step.key === 'warmup' && lesson.warmup) {
    content = <><Warmup items={lesson.warmup} levelId={levelId} onDone={() => markSection(levelId, lessonId, 'warmup')} /><DoneButton k="warmup" /></>;
  } else if (text) {
    content = (
      <div className="space-y-5">
        <div className="card flex items-start gap-3">
          <span className="text-4xl" aria-hidden>{text.scene}</span>
          <div>
            <p className="label">Bối cảnh</p>
            <p className="text-lg">{text.context_vi}</p>
          </div>
        </div>
        {text.listenQuiz && text.listenQuiz.length > 0 && (
          <section className="card space-y-3">
            <h3 className="font-bold">🎧 Nghe hai lần rồi chọn đáp án</h3>
            <p className="text-sm text-muted">Bấm “Nghe cả đoạn” ở phần bên dưới, cố gắng chưa nhìn chữ, rồi quay lại trả lời.</p>
            {text.listenQuiz.map((q, i) => <QuickCheck key={i} q={q} levelId={levelId} upTo={lessonId} n={i + 1} label="Câu" />)}
          </section>
        )}
        <section className="card" aria-label="Hội thoại">
          <DialoguePlayer text={text} levelId={levelId} lessonId={lessonId} />
        </section>
        <section className="card"><VocabTable vocab={text.vocab} levelId={levelId} lessonId={lessonId} audio={text.vocabAudio} /></section>
        {text.grammar?.map((g) => <GrammarCard key={g.id} g={g} levelId={levelId} lessonId={lessonId} />)}
        {text.pangdaTip && <PangdaTip>{text.pangdaTip}</PangdaTip>}
        <DoneButton k={text.id} />
      </div>
    );
  } else if (step.key === 'exercises') {
    content = (
      <>
        <div className="mb-4 flex items-center gap-3">
          <PandaMascot mood="think" size={70} />
          <p><b className="han">综合练习</b> – Mỗi câu có phản hồi ngay. Đúng ngay lần đầu từ 80% trở lên sẽ được thêm 1 sao.</p>
        </div>
        <ExerciseEngine key={lessonId} items={lesson.exercises} levelId={levelId} upTo={lessonId} onComplete={onExercises} />
        <DoneButton k="exercises" />
      </>
    );
  } else if (step.key === 'games') {
    content = (
      <>
        <GameHub words={allVocab} lines={lesson.texts.flatMap((t) => t.lines.map((l) => l.zh))} levelId={levelId} lessonId={lessonId} />
        <p className="mt-3 text-sm text-muted">Chơi đủ 3 game khác nhau để bài học được thêm 1 sao ⭐</p>
        <DoneButton k="games" />
      </>
    );
  } else if (step.key === 'activity' && lesson.activity) {
    content = <><ActivityPanel data={lesson.activity} levelId={levelId} upTo={lessonId} /><DoneButton k="activity" /></>;
  } else if (step.key === 'twister' && lesson.tongueTwister) {
    content = (
      <>
        <h2 className="h-section mb-3"><span className="han">跟读绕口令</span> Luyện nói nhịu</h2>
        <TongueTwister data={lesson.tongueTwister} levelId={levelId} />
        <DoneButton k="twister" />
      </>
    );
  } else if (step.key === 'culture' && lesson.culture) {
    content = <><CulturePanel data={lesson.culture} /><DoneButton k="culture" /></>;
  } else if (step.key === 'finish') {
    const labelOf = (k: string) => steps.find((s) => s.key === k)?.label ?? k;
    content = (
      <div className="space-y-5">
        <Confetti fire={fire} />
        {lp.completed ? (
          <div className="card flex flex-col items-center gap-4 text-center">
            <PandaMascot mood="bag" size={130} stage={lv.pandaStage} />
            <h2 className="text-2xl font-extrabold">Học xong bài {lesson.id}! Bài tập về nhà đã mở 🎒</h2>
            {newScene && <p className="pop sticker rounded-full bg-primary/20 px-4 py-1.5 font-bold">🗺️ Mở khoá vùng đất mới: {newScene}</p>}
            <p className="text-muted">15–20 câu đọc hiểu và viết. Đạt từ {lv.difficulty.homeworkPassScore}% để nhận ✅ và huy hiệu.</p>
            <Link to={`/hsk/${levelId}/bai/${lessonId}/bai-tap-ve-nha`} className="btn-primary !px-8 !py-4 !text-xl">
              📝 {hs === 'passed' ? 'Xem lại bài tập về nhà' : hs === 'draft' ? 'Làm tiếp bài tập về nhà' : 'Làm bài tập về nhà'}
            </Link>
            <div className="flex flex-wrap justify-center gap-2">
              {isReviewPoint(lv, lessonId) && (
                <Link to={`/hsk/${levelId}/on-tap/${lessonId}`} className="btn-ghost">📚 学习小结 – Ôn tập bài {lessonId - lv.reviewEvery + 1}–{lessonId}</Link>
              )}
              {nextLesson && <Link to={`/hsk/${levelId}/bai/${nextLesson.id}`} className="btn-ghost">Sang bài {nextLesson.id} →</Link>}
            </div>
          </div>
        ) : (
          <div className="card flex flex-col items-center gap-4 text-center">
            <PandaMascot mood={missing.length ? 'think' : 'celebrate'} size={110} stage={lv.pandaStage} />
            {!ready ? (
              <p className="text-muted">Bài này đang được soạn nên chưa thể hoàn thành.</p>
            ) : missing.length ? (
              <>
                <p className="text-lg font-semibold">Còn {missing.length} phần nữa là mở khoá bài tập về nhà:</p>
                <div className="flex flex-wrap justify-center gap-2">
                  {missing.map((m) => <button key={m} className="chip" onClick={() => go(m)}>{labelOf(m)}</button>)}
                </div>
              </>
            ) : (
              <>
                <p className="text-lg font-semibold">Bạn đã học đủ các phần chính. Hoàn thành bài để mở khoá bài tập về nhà!</p>
                <button className="btn-primary !px-8 !py-4 !text-xl" onClick={completeLesson}>🎉 Hoàn thành bài học</button>
              </>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      <nav aria-label="Đường dẫn" className="mb-2 text-sm text-muted">
        <Link to={`/hsk/${levelId}`} className="hover:underline">{lv.name}</Link> / Bài {lesson.id}
      </nav>
      <header className="mb-3 flex items-end gap-3">
        <span className="tianzi han inline-flex h-16 w-16 shrink-0 items-center justify-center rounded-xl text-3xl font-black">{lesson.id}</span>
        <div className="min-w-0">
          <p className="text-sm font-medium text-muted">{lesson.title.pinyin}</p>
          <h1 className="font-hanfun text-4xl leading-tight sm:text-5xl" lang="zh-CN">{lesson.title.zh}</h1>
          <p className="font-semibold">{lesson.title.vi}</p>
        </div>
      </header>

      <div ref={stepperRef} className="no-print sticky top-[57px] z-30 -mx-4 mb-5 overflow-x-auto border-b border-line bg-bg/95 px-4 py-2 backdrop-blur">
        <ol className="flex w-max gap-1.5" aria-label="Các phần của bài học">
          {steps.map((s, i) => (
            <li key={s.key}>
              <button
                data-step={s.key}
                onClick={() => go(s.key)}
                aria-current={i === stepIdx ? 'step' : undefined}
                className={cls('chip whitespace-nowrap', i === stepIdx && 'chip-on', done.has(s.key) && i !== stepIdx && 'border-good/60')}
              >
                {done.has(s.key) && <span className="text-good" aria-label="đã xong">✓</span>}
                {s.label}
              </button>
            </li>
          ))}
        </ol>
      </div>

      <h2 className="sr-only">{step.label}</h2>
      {content}

      <div className="no-print mt-8 flex justify-between gap-2">
        <button className="btn-ghost" disabled={stepIdx === 0} onClick={() => go(steps[stepIdx - 1].key)}>← Phần trước</button>
        {stepIdx < steps.length - 1 && <button className="btn-ghost" onClick={() => go(steps[stepIdx + 1].key)}>Phần sau →</button>}
      </div>
    </div>
  );
}
