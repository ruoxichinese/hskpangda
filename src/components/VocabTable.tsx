import { useState } from 'react';
import { useLevelPrefs, useProgress } from '../store/ProgressStore';
import type { VocabItem } from '../types';
import { HanziBox } from './HanziBox';
import { SpeakButton, Modal } from './ui';
import { ZhText } from './ZhText';
import { cls, isHan } from '../lib/util';

const POS_VI: Record<string, string> = {
  'n.': 'danh từ', 'v.': 'động từ', 'adj.': 'tính từ', 'pron.': 'đại từ', 'adv.': 'phó từ', 'part.': 'trợ từ',
  'suf.': 'hậu tố', 'int.': 'thán từ', phrase: 'cụm từ', proper: 'tên riêng',
};
export const posLabel = (p?: string) => (p ? POS_VI[p] ?? p : '');

export function WordPopup({ word, levelId, upTo, onClose }: { word: VocabItem | null; levelId: string; upTo: number; onClose: () => void }) {
  const { speed, pinyin } = useLevelPrefs(levelId);
  const { level, toggleKnown } = useProgress();
  if (!word) return null;
  const known = level(levelId).known.includes(word.zh);
  const chars = [...word.zh].filter(isHan);
  return (
    <Modal open onClose={onClose} title={`Từ mới: ${word.zh}`}>
      <div className="flex items-center gap-3">
        <p className="han text-5xl font-bold" lang="zh-CN">{word.zh}</p>
        <SpeakButton text={word.zh} rate={speed} size="lg" />
      </div>
      <p className="mt-1 text-lg font-semibold text-accent">{word.pinyin}</p>
      <p className="text-muted">{posLabel(word.pos)}</p>
      <p className="mt-1 text-lg">{word.vi}</p>
      {word.note_vi && <p className="mt-1 text-sm text-muted">{word.note_vi}</p>}
      <h3 className="mt-4 font-bold">Thứ tự nét</h3>
      <div className="mt-2 flex flex-wrap gap-3">
        {chars.map((c, i) => <HanziBox key={c + i} char={c} size={120} autoPlay={i === 0} />)}
      </div>
      {word.example && (
        <div className="mt-4 rounded-2xl bg-surface p-3">
          <h3 className="label">Câu ví dụ</h3>
          <div className="flex items-start gap-2">
            <ZhText text={word.example.zh} levelId={levelId} pinyin={pinyin} upTo={upTo} size="lg" />
            <SpeakButton text={word.example.zh} rate={speed} size="sm" />
          </div>
          <p className="text-muted">{word.example.vi}</p>
        </div>
      )}
      <button className={cls('mt-4 w-full', known ? 'btn-ghost' : 'btn-primary')} onClick={() => toggleKnown(levelId, word.zh)}>
        {known ? '✓ Đã thuộc (bấm để bỏ)' : 'Đánh dấu đã thuộc'}
      </button>
    </Modal>
  );
}

export function VocabTable({ vocab, levelId, lessonId, audio }: { vocab: VocabItem[]; levelId: string; lessonId: number; audio?: string }) {
  const [open, setOpen] = useState<VocabItem | null>(null);
  const { speed } = useLevelPrefs(levelId);
  const { level } = useProgress();
  const known = level(levelId).known;
  const common = vocab.filter((v) => !v.proper);
  const proper = vocab.filter((v) => v.proper);

  const rows = (list: VocabItem[]) =>
    list.map((v) => (
      <tr key={v.zh} className="border-t border-line">
        <td className="py-2 pr-2">
          <button className="han rounded-lg px-1 text-2xl font-semibold hover:bg-primary/10" onClick={() => setOpen(v)} aria-label={`Mở chi tiết từ ${v.zh}`}>
            {v.zh}
          </button>
          {known.includes(v.zh) && <span className="ml-1 text-xs text-good" aria-label="đã thuộc">✓</span>}
        </td>
        <td className="py-2 pr-2 font-medium text-accent">{v.pinyin}</td>
        <td className="hidden py-2 pr-2 text-sm text-muted sm:table-cell">{posLabel(v.pos)}</td>
        <td className="py-2 pr-2">{v.vi}</td>
        <td className="py-2 text-right"><SpeakButton text={v.zh} rate={speed} size="sm" /></td>
      </tr>
    ));

  return (
    <section aria-labelledby={`vocab-${lessonId}-${vocab[0]?.zh}`}>
      <div className="mb-2 flex items-center justify-between gap-2">
        <h3 id={`vocab-${lessonId}-${vocab[0]?.zh}`} className="text-lg font-extrabold">
          <span className="han">生词</span> Từ mới
        </h3>
        <SpeakButton text={vocab.map((v) => v.zh).join('，')} rate={speed} src={audio} label="Nghe cả bảng từ" />
      </div>
      <p className="mb-2 text-sm text-muted">Chạm vào chữ Hán để xem thứ tự nét và câu ví dụ.</p>
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <tbody>{rows(common)}</tbody>
          {proper.length > 0 && (
            <tbody>
              <tr><td colSpan={5} className="pt-3 text-sm font-bold text-accent"><span className="han">专有名词</span> Tên riêng</td></tr>
              {rows(proper)}
            </tbody>
          )}
        </table>
      </div>
      <WordPopup word={open} levelId={levelId} upTo={lessonId} onClose={() => setOpen(null)} />
    </section>
  );
}
