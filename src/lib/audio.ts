/**
 * Âm thanh: ưu tiên mp3 thật trong /public (vd. "audio/hsk1/2-1.mp3").
 * Nếu file chưa có → dùng Web Speech API (zh-CN).
 */
const missing = new Set<string>();
let current: HTMLAudioElement | null = null;
let token = 0;

export function stopAll() {
  token++;
  if (typeof speechSynthesis !== 'undefined') speechSynthesis.cancel();
  if (current) { current.pause(); current = null; }
}

function zhVoice(): SpeechSynthesisVoice | undefined {
  if (typeof speechSynthesis === 'undefined') return undefined;
  const vs = speechSynthesis.getVoices();
  return vs.find((v) => v.lang === 'zh-CN') ?? vs.find((v) => v.lang.startsWith('zh'));
}
if (typeof speechSynthesis !== 'undefined') speechSynthesis.onvoiceschanged = () => zhVoice();

export const ttsSupported = () => typeof speechSynthesis !== 'undefined';

/** Đọc bằng TTS. Resolve khi đọc xong. */
export function speak(text: string, rate = 0.75): Promise<void> {
  return new Promise((resolve) => {
    if (!ttsSupported()) return resolve();
    const clean = text.replace(/\{([^|{}]+)\|[^{}]+\}/g, '$1').replace(/[A-Z]：/g, '').replace(/……/g, '，');
    const u = new SpeechSynthesisUtterance(clean);
    u.lang = 'zh-CN';
    const v = zhVoice();
    if (v) u.voice = v;
    u.rate = rate;
    const done = () => resolve();
    u.onend = done;
    u.onerror = done;
    speechSynthesis.speak(u);
    // một số trình duyệt không gọi onend → chốt chặn
    setTimeout(done, 1500 + clean.length * 600 / rate);
  });
}

/** Phát file mp3. Trả về false nếu file không tồn tại. */
export function playSrc(src: string, rate = 1, onTime?: (t: number) => void): Promise<boolean> {
  if (missing.has(src)) return Promise.resolve(false);
  return new Promise((resolve) => {
    const a = new Audio(import.meta.env.BASE_URL + src.replace(/^\//, ''));
    a.playbackRate = rate;
    current = a;
    a.onended = () => resolve(true);
    a.onerror = () => { missing.add(src); resolve(false); };
    if (onTime) a.ontimeupdate = () => onTime(a.currentTime);
    a.play().catch(() => { missing.add(src); resolve(false); });
  });
}

/** Đọc một câu: thử mp3 trước, không có thì TTS */
export async function say(text: string, rate = 0.75, src?: string) {
  stopAll();
  if (src && (await playSrc(src, rate / 0.75 > 1 ? 1 : rate / 0.75))) return;
  await speak(text, rate);
}

/** Đọc lần lượt nhiều câu, gọi onLine(i) để highlight kiểu karaoke. Có thể huỷ bằng stopAll(). */
export async function speakSequence(texts: string[], rate: number, onLine: (i: number) => void) {
  stopAll();
  const my = token;
  for (let i = 0; i < texts.length; i++) {
    if (my !== token) return;
    onLine(i);
    await speak(texts[i], rate);
    await new Promise((r) => setTimeout(r, 250));
  }
  if (my === token) onLine(-1);
}
export const currentToken = () => token;

// ===== Nhận dạng giọng nói (chấm phát âm đơn giản) =====
type SR = { lang: string; interimResults: boolean; maxAlternatives: number; start(): void; abort(): void; onresult: ((e: { results: { 0: { transcript: string } }[] }) => void) | null; onerror: (() => void) | null; onend: (() => void) | null };
export function recognitionSupported() {
  const w = window as unknown as Record<string, unknown>;
  return !!(w.SpeechRecognition || w.webkitSpeechRecognition);
}
export function recognize(): Promise<string | null> {
  return new Promise((resolve) => {
    const w = window as unknown as Record<string, new () => SR>;
    const Ctor = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!Ctor) return resolve(null);
    const r = new Ctor();
    r.lang = 'zh-CN';
    r.interimResults = false;
    r.maxAlternatives = 1;
    let got: string | null = null;
    r.onresult = (e) => { got = e.results[0][0].transcript; };
    r.onerror = () => resolve(null);
    r.onend = () => resolve(got);
    r.start();
  });
}
