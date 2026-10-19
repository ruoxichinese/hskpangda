/**
 * Chấm điểm câu dịch Việt → Trung và câu sắp xếp.
 * Quy trình (theo đặc tả):
 *  1) Chuẩn hoá: bỏ khoảng trắng, đồng nhất dấu câu (。，？！ ↔ . , ? !), bỏ dấu câu cuối.
 *  2) So với acceptedAnswers → khớp là đúng.
 *  3) Không khớp: kiểm tra requiredKeywords + độ giống ký tự (Levenshtein).
 *     Đạt ngưỡng → "close" (Gần đúng); người học có thể tự xác nhận để được 1/2 điểm.
 *  4) Còn lại → "wrong".
 */

const PUNCT_MAP: Record<string, string> = {
  '。': '.', '．': '.', '，': ',', '、': ',', '？': '?', '！': '!', '：': ':', '；': ';',
  '“': '"', '”': '"', '‘': "'", '’': "'", '（': '(', '）': ')', '…': '.', '—': '-', '～': '~',
};
const PUNCT_RE = /[.,?!:;"'()\-~]/g;
const TRAILING_RE = /[.,?!:;"'()\-~]+$/;

export function normalize(s: string): string {
  let out = (s ?? '').replace(/\{([^|{}]+)\|[^{}]+\}/g, '$1').normalize('NFKC').replace(/\s+/g, '');
  out = [...out].map((c) => PUNCT_MAP[c] ?? c).join('');
  out = out.replace(/\.{2,}/g, '.');
  return out.replace(TRAILING_RE, '');
}

/** Khoá so sánh: chuẩn hoá rồi bỏ cả dấu câu bên trong (老师，再见 ≡ 老师再见) */
export function compareKey(s: string): string {
  return normalize(s).replace(PUNCT_RE, '');
}

export function levenshtein(a: string, b: string): number {
  const A = [...a];
  const B = [...b];
  if (!A.length) return B.length;
  if (!B.length) return A.length;
  let prev = Array.from({ length: B.length + 1 }, (_, i) => i);
  for (let i = 1; i <= A.length; i++) {
    const cur = [i];
    for (let j = 1; j <= B.length; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (A[i - 1] === B[j - 1] ? 0 : 1));
    }
    prev = cur;
  }
  return prev[B.length];
}

export function similarity(a: string, b: string): number {
  const max = Math.max([...a].length, [...b].length);
  if (max === 0) return 1;
  return 1 - levenshtein(a, b) / max;
}

export type DiffPart = { text: string; type: 'same' | 'missing' | 'extra' };

/** Diff theo ký tự (LCS) giữa câu người học và đáp án mẫu, dùng để highlight chỗ khác */
export function charDiff(user: string, target: string): DiffPart[] {
  const U = [...user];
  const T = [...target];
  const dp: number[][] = Array.from({ length: U.length + 1 }, () => Array(T.length + 1).fill(0));
  for (let i = U.length - 1; i >= 0; i--)
    for (let j = T.length - 1; j >= 0; j--)
      dp[i][j] = U[i] === T[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
  const parts: DiffPart[] = [];
  const push = (text: string, type: DiffPart['type']) => {
    const last = parts[parts.length - 1];
    if (last && last.type === type) last.text += text;
    else parts.push({ text, type });
  };
  let i = 0, j = 0;
  while (i < U.length && j < T.length) {
    if (U[i] === T[j]) { push(U[i], 'same'); i++; j++; }
    else if (dp[i + 1][j] >= dp[i][j + 1]) { push(U[i], 'extra'); i++; }
    else { push(T[j], 'missing'); j++; }
  }
  while (i < U.length) push(U[i++], 'extra');
  while (j < T.length) push(T[j++], 'missing');
  return parts;
}

export type GradeStatus = 'correct' | 'close' | 'wrong' | 'empty';

export interface TranslateResult {
  status: GradeStatus;
  best: string; // đáp án mẫu gần nhất
  similarity: number;
  missingKeywords: string[];
  diff: DiffPart[];
}

export interface TranslateSpec {
  acceptedAnswers: string[];
  requiredKeywords?: string[];
}

export const CLOSE_THRESHOLD = 0.6;

export function gradeTranslation(input: string, spec: TranslateSpec, threshold = CLOSE_THRESHOLD): TranslateResult {
  const user = compareKey(input);
  const answers = spec.acceptedAnswers.map((a) => ({ raw: a, key: compareKey(a) }));
  if (!user) {
    return { status: 'empty', best: spec.acceptedAnswers[0] ?? '', similarity: 0, missingKeywords: spec.requiredKeywords ?? [], diff: [] };
  }
  const exact = answers.find((a) => a.key === user);
  if (exact) return { status: 'correct', best: exact.raw, similarity: 1, missingKeywords: [], diff: [{ text: user, type: 'same' }] };

  let best = answers[0];
  let bestSim = -1;
  for (const a of answers) {
    const s = similarity(user, a.key);
    if (s > bestSim) { bestSim = s; best = a; }
  }
  const missingKeywords = (spec.requiredKeywords ?? []).filter((k) => !user.includes(compareKey(k)));
  const status: GradeStatus = missingKeywords.length === 0 && bestSim >= threshold ? 'close' : 'wrong';
  return { status, best: best?.raw ?? '', similarity: bestSim, missingKeywords, diff: charDiff(user, best?.key ?? '') };
}

/** Câu sắp xếp: chấp nhận nhiều thứ tự đúng (answers là mảng) */
export function gradeReorder(tilesInOrder: string[], answers: string[]): boolean {
  const user = compareKey(tilesInOrder.join(''));
  return answers.some((a) => compareKey(a) === user);
}

/** Điểm của một câu dịch: đúng = 1, gần đúng + người học tự xác nhận = 0.5 */
export function translationPoints(status: GradeStatus, selfConfirmed: boolean): number {
  if (status === 'correct') return 1;
  if (status === 'close' && selfConfirmed) return 0.5;
  return 0;
}
