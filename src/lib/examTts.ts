import type { Exam } from '../types';

/**
 * Phần Nghe bằng giọng đọc của trình duyệt (khi đề không có file nghe):
 * đọc theo bản ghi lời nghe, mỗi câu hai lần, sau đó chờ để học sinh chọn đáp án.
 */
export interface TtsLine { who?: string; text?: string; pause?: number }
export interface TtsStep { lines: TtsLine[]; q: number | null; part: number; pause?: number }

export function buildTtsSteps(exam: Exam): TtsStep[] {
  const sec = exam.sections.find((s) => s.id === 'listening');
  if (!sec) return [];
  const steps: TtsStep[] = [];
  let qi = 0;
  if (exam.listeningIntro?.length) steps.push({ lines: exam.listeningIntro.map((text) => ({ text })), q: null, part: 0, pause: 1 });
  sec.parts.forEach((p, pi) => {
    if (p.intro_zh) steps.push({ lines: [{ text: p.intro_zh }], q: null, part: pi, pause: 1 });
    if (p.example?.say) {
      steps.push({ lines: [{ text: '例如：' }, ...p.example.say, ...(p.example.ask ? [{ text: `问：${p.example.ask}` }] : [])], q: null, part: pi, pause: 3 });
    }
    if (p.startCue) steps.push({ lines: [{ text: p.startCue }], q: null, part: pi, pause: 2 });
    for (const q of p.questions) {
      const body: TtsLine[] = [...(q.say ?? []), ...(q.ask ? [{ text: `问：${q.ask}` }] : [])];
      steps.push({ lines: [{ text: `${q.id}.` }, ...body, { pause: 1.5 }, ...body], q: qi, part: pi, pause: p.pauseSeconds ?? 10 });
      qi++;
    }
  });
  steps.push({ lines: [{ text: exam.listeningOutro ?? '听力考试现在结束。' }], q: null, part: sec.parts.length - 1 });
  return steps;
}

let voicesCache: SpeechSynthesisVoice[] = [];
function zhVoices() {
  if (typeof speechSynthesis === 'undefined') return [];
  const v = speechSynthesis.getVoices();
  if (v.length) voicesCache = v;
  return voicesCache.filter((x) => /^zh(-|_)?(CN|Hans)?/i.test(x.lang) && !/HK|TW|yue/i.test(x.lang));
}
export const hasChineseVoice = () => zhVoices().length > 0;
if (typeof speechSynthesis !== 'undefined') { speechSynthesis.getVoices(); speechSynthesis.addEventListener?.('voiceschanged', () => zhVoices()); }

/** Đọc một dòng; luôn kết thúc (kể cả khi máy không có giọng đọc) sau khoảng thời gian ước tính */
export function speakLine(line: TtsLine, cancelled: () => boolean): Promise<void> {
  return new Promise((resolve) => {
    if (line.pause) { setTimeout(resolve, line.pause * 1000); return; }
    const text = line.text ?? '';
    const est = 0.32 * [...text].length + 0.6;
    const t0 = performance.now();
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      const rest = Math.max(0, est * 0.7 - (performance.now() - t0) / 1000); // máy không có giọng: vẫn giữ nhịp
      setTimeout(resolve, cancelled() ? 0 : rest * 1000);
    };
    const canSpeak = typeof speechSynthesis !== 'undefined' && hasChineseVoice();
    if (canSpeak) {
      try {
        const u = new SpeechSynthesisUtterance(text);
        u.lang = 'zh-CN';
        const vs = zhVoices();
        u.voice = line.who === '男' && vs.length > 1 ? vs[1] : vs[0];
        u.rate = 0.85;
        u.pitch = line.who === '女' ? 1.25 : line.who === '男' ? 0.75 : 1;
        u.onend = finish;
        u.onerror = finish;
        speechSynthesis.speak(u);
        // trình duyệt không thật sự đọc → không chờ vô ích
        setTimeout(() => { if (!done && !speechSynthesis.speaking && !speechSynthesis.pending) finish(); }, 1500);
      } catch { finish(); }
      setTimeout(finish, (est * 1.8 + 2) * 1000);
    } else {
      // máy không có giọng tiếng Trung: giữ đúng nhịp thời gian (im lặng)
      setTimeout(finish, est * 1000);
    }
  });
}
