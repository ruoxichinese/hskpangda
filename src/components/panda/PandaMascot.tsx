import type { ReactNode } from 'react';
import { cls } from '../../lib/util';

/**
 * Pàngdá 胖达 – kiểu "Bánh Bao": đầu và thân liền một khối tròn, tay chân nhỏ xíu,
 * quầng mắt rủ xuống phía ngoài, mắt to có đốm sáng, má hồng, nơ trên tai màu --primary (đổi theo theme).
 * Mỗi trạng thái là một component riêng; PandaMascot chọn theo prop "mood".
 */

export type Mood = 'wave' | 'explain' | 'think' | 'celebrate' | 'cheer' | 'sleepy' | 'eat' | 'bag' | 'sign';

const INK = '#2B2730';
const FUR = '#FFFFFF';
const PAD = '#9A93A1';
const PRIMARY = 'rgb(var(--c-primary))';
const SECONDARY = 'rgb(var(--c-secondary))';

interface BaseProps {
  eyes?: 'open' | 'closed' | 'happy';
  mouth?: 'smile' | 'open' | 'o' | 'chew';
  arms?: ReactNode; // vẽ sau thân
  front?: ReactNode; // vẽ trên cùng
  back?: ReactNode; // vẽ sau cùng (bảng, biển…)
  bodyClass?: string;
  stage?: number;
}

/** Tay nhỏ; pad = lòng bàn tay lộ đệm thịt */
function Paw({ x, y, r = 0, pad, rx = 14, ry = 20 }: { x: number; y: number; r?: number; pad?: boolean; rx?: number; ry?: number }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${r})`}>
      <ellipse cx="0" cy="0" rx={rx} ry={ry} fill={INK} />
      {pad && <ellipse cx="0" cy={-ry + 9} rx="6" ry="5" fill={PAD} />}
    </g>
  );
}

const restArms = (
  <>
    <Paw x={36} y={180} r={18} />
    <Paw x={204} y={180} r={-18} />
  </>
);

function Accessory({ stage }: { stage: number }) {
  if (stage === 1)
    return (
      <g>
        <path d="M120 62 q-2 -14 4 -22" stroke="#4E9A3E" strokeWidth="4" fill="none" strokeLinecap="round" />
        <path d="M123 44 q16 -14 30 -6 q-12 16 -30 6z" fill="#7CC36A" stroke={INK} strokeWidth="2.5" strokeLinejoin="round" />
        <path d="M121 48 q-16 -12 -28 -2 q14 12 28 2z" fill="#9AD78A" stroke={INK} strokeWidth="2.5" strokeLinejoin="round" />
      </g>
    );
  if (stage === 2)
    return (
      <g stroke={INK} strokeWidth="3.5" fill="rgba(255,255,255,.15)">
        <circle cx="88" cy="131" r="20" />
        <circle cx="152" cy="131" r="20" />
        <path d="M108 129 h24" />
      </g>
    );
  if (stage >= 3)
    return (
      <g>
        <path d="M70 70 L120 48 L170 70 L120 92 Z" fill={INK} />
        <rect x="96" y="72" width="48" height="14" rx="4" fill={INK} />
        <path d="M170 70 v26" stroke={SECONDARY} strokeWidth="3" />
        <circle cx="170" cy="99" r="5" fill={SECONDARY} />
      </g>
    );
  return null;
}

function PandaBase({ eyes = 'open', mouth = 'smile', arms = restArms, front, back, bodyClass, stage = 0 }: BaseProps) {
  return (
    <g className={bodyClass}>
      {back}
      {/* tai */}
      <circle cx="62" cy="80" r="23" fill={INK} />
      <circle cx="178" cy="80" r="23" fill={INK} />
      {/* chân */}
      <ellipse cx="94" cy="222" rx="21" ry="12" fill={INK} />
      <ellipse cx="146" cy="222" rx="21" ry="12" fill={INK} />
      {/* thân bánh bao */}
      <path d="M28 150 C28 86 68 60 120 60 C172 60 212 86 212 150 C212 200 176 216 120 216 C64 216 28 200 28 150 Z" fill={FUR} stroke={INK} strokeWidth="4" />
      {/* quầng mắt rủ ra ngoài */}
      <ellipse cx="84" cy="134" rx="19" ry="24" fill={INK} transform="rotate(32 84 134)" />
      <ellipse cx="156" cy="134" rx="19" ry="24" fill={INK} transform="rotate(-32 156 134)" />
      {eyes === 'open' && (
        <g>
          <circle cx="88" cy="130" r="10" fill="#0E0B10" />
          <circle cx="152" cy="130" r="10" fill="#0E0B10" />
          <circle cx="92" cy="125" r="4.5" fill={FUR} />
          <circle cx="156" cy="125" r="4.5" fill={FUR} />
          <circle cx="85" cy="135" r="2" fill={FUR} />
          <circle cx="149" cy="135" r="2" fill={FUR} />
        </g>
      )}
      {eyes === 'closed' && (
        <g stroke={FUR} strokeWidth="3" fill="none" strokeLinecap="round">
          <path d="M79 133 q9 6 18 0" />
          <path d="M143 133 q9 6 18 0" />
        </g>
      )}
      {eyes === 'happy' && (
        <g stroke={FUR} strokeWidth="3.4" fill="none" strokeLinecap="round">
          <path d="M79 135 q9 -11 18 0" />
          <path d="M143 135 q9 -11 18 0" />
        </g>
      )}
      {/* má hồng */}
      <ellipse cx="62" cy="164" rx="15" ry="9" fill="#FF9DB8" opacity="0.72" />
      <ellipse cx="178" cy="164" rx="15" ry="9" fill="#FF9DB8" opacity="0.72" />
      <path d="M57 162 l-2 4 M63 162 l-2 4 M175 162 l-2 4 M181 162 l-2 4" stroke="#F06A93" strokeWidth="2" strokeLinecap="round" />
      {/* mũi + miệng */}
      <path d="M114 150 q6 -4 12 0 q-2 6 -6 6 q-4 0 -6 -6 z" fill={INK} />
      {mouth === 'smile' && <path d="M112 160 q4 5 8 0 q4 5 8 0" stroke={INK} strokeWidth="2.6" fill="none" strokeLinecap="round" />}
      {mouth === 'open' && (
        <g>
          <path d="M110 158 q10 17 20 0 z" fill="#8A2A3E" stroke={INK} strokeWidth="2.4" strokeLinejoin="round" />
          <path d="M114 165 q6 -4 12 0 q-6 5 -12 0 z" fill="#FF8FA8" />
        </g>
      )}
      {mouth === 'o' && <ellipse cx="120" cy="163" rx="4" ry="4.6" fill="#8A2A3E" stroke={INK} strokeWidth="1.8" />}
      {mouth === 'chew' && <path className="p-chew" d="M112 159 q8 9 16 0" fill="#FF8FA8" stroke={INK} strokeWidth="2.4" />}
      {/* nơ trên tai – màu theo theme */}
      <g transform="translate(184 62)">
        <path d="M0 0 l-15 -10 l-1 18 z M0 0 l15 -10 l1 18 z" fill={PRIMARY} stroke={INK} strokeWidth="2.6" strokeLinejoin="round" />
        <circle cx="0" cy="0" r="5" fill={PRIMARY} stroke={INK} strokeWidth="2.6" />
      </g>
      <Accessory stage={stage} />
      {arms}
      {front}
    </g>
  );
}

// ===== Các trạng thái =====
type MoodProps = { stage?: number };

export const PandaWave = ({ stage }: MoodProps) => (
  <PandaBase
    stage={stage}
    bodyClass="p-bob"
    arms={
      <>
        <Paw x={36} y={180} r={18} />
        <g className="p-wave"><Paw x={214} y={126} r={28} pad /></g>
      </>
    }
  />
);

export const PandaExplain = ({ stage }: MoodProps) => (
  <PandaBase
    stage={stage}
    back={
      <g>
        <rect x="236" y="96" width="76" height="58" rx="8" fill="#2F4F3E" stroke="#8B5E34" strokeWidth="5" />
        <text x="274" y="134" textAnchor="middle" fontSize="24" fill="#fff" fontFamily="Noto Sans SC, sans-serif">好</text>
        <path d="M254 156 l-7 30 M294 156 l7 30" stroke="#8B5E34" strokeWidth="5" strokeLinecap="round" />
      </g>
    }
    arms={
      <>
        <Paw x={36} y={180} r={18} />
        <g className="p-point">
          <Paw x={222} y={160} r={70} pad rx={13} ry={22} />
          <path d="M240 150 L256 136" stroke="#8B5E34" strokeWidth="4" strokeLinecap="round" />
          <path d="M256 136 l6 -5 l-2 6 z" fill={INK} />
        </g>
      </>
    }
  />
);

export const PandaThink = ({ stage }: MoodProps) => (
  <PandaBase
    stage={stage}
    mouth="o"
    arms={
      <>
        <Paw x={36} y={180} r={18} />
        <g className="p-scratch"><Paw x={206} y={98} r={-30} pad /></g>
      </>
    }
    front={<text x="226" y="58" fontSize="40" fontWeight="800" fill={PRIMARY} fontFamily="Quicksand, sans-serif">?</text>}
  />
);

export const PandaCelebrate = ({ stage }: MoodProps) => (
  <PandaBase
    stage={stage}
    eyes="happy"
    mouth="open"
    bodyClass="p-jump"
    arms={
      <>
        <Paw x={30} y={112} r={-28} pad />
        <Paw x={210} y={112} r={28} pad />
      </>
    }
    front={
      <g>
        <path d="M10 46 l4 8 9 1 -7 6 2 9 -8 -5 -8 5 2 -9 -7 -6 9 -1z" fill={PRIMARY} stroke={INK} strokeWidth="1.5" />
        <path d="M226 30 l3 6 7 1 -5 4 1 7 -6 -4 -6 4 1 -7 -5 -4 7 -1z" fill={SECONDARY} stroke={INK} strokeWidth="1.5" />
      </g>
    }
  />
);

export const PandaCheer = ({ stage }: MoodProps) => (
  <PandaBase
    stage={stage}
    eyes="happy"
    bodyClass="p-nod"
    arms={
      <>
        <Paw x={36} y={180} r={18} />
        <Paw x={214} y={150} r={20} rx={14} ry={18} />
        <ellipse cx="220" cy="128" rx="6.5" ry="11" fill={INK} transform="rotate(15 220 128)" />
      </>
    }
  />
);

export const PandaSleepy = ({ stage }: MoodProps) => (
  <PandaBase
    stage={stage}
    eyes="closed"
    mouth="o"
    bodyClass="p-breathe"
    front={
      <g fill={PRIMARY} fontWeight="800" fontFamily="Quicksand, sans-serif">
        <text className="p-z" x="206" y="56" fontSize="22">z</text>
        <text className="p-z" x="222" y="38" fontSize="30" style={{ animationDelay: '.7s' }}>Z</text>
      </g>
    }
  />
);

export const PandaEat = ({ stage }: MoodProps) => (
  <PandaBase
    stage={stage}
    eyes="happy"
    mouth="chew"
    arms={
      <g>
        <g transform="rotate(-12 120 178)">
          <rect x="44" y="171" width="152" height="14" rx="7" fill="#6DBE58" stroke={INK} strokeWidth="2.5" />
          <path d="M90 171 v14 M150 171 v14" stroke={INK} strokeWidth="2.5" />
        </g>
        <path d="M196 158 q14 -16 28 -14" stroke="#4E9A3E" strokeWidth="3.5" fill="none" strokeLinecap="round" />
        <ellipse cx="226" cy="142" rx="11" ry="5" fill="#8FCB7A" stroke={INK} strokeWidth="2" transform="rotate(-20 226 142)" />
        <Paw x={62} y={186} r={-30} pad rx={13} ry={17} />
        <Paw x={178} y={170} r={30} pad rx={13} ry={17} />
      </g>
    }
  />
);

export const PandaBag = ({ stage }: MoodProps) => (
  <PandaBase
    stage={stage}
    eyes="happy"
    bodyClass="p-bob"
    arms={
      <>
        <Paw x={36} y={180} r={18} />
        <path d="M206 186 q12 -18 24 0" stroke={INK} strokeWidth="4.5" fill="none" />
        <rect x="194" y="186" width="50" height="40" rx="10" fill={PRIMARY} stroke={INK} strokeWidth="3" />
        <rect x="206" y="200" width="26" height="11" rx="3" fill={SECONDARY} stroke={INK} strokeWidth="2" />
        <Paw x={208} y={180} r={-10} rx={13} ry={16} />
      </>
    }
  />
);

export const PandaSign = ({ stage, text = 'Sắp ra mắt' }: MoodProps & { text?: string }) => (
  <PandaBase
    stage={stage}
    bodyClass="p-bob"
    arms={
      <g>
        <rect x="36" y="168" width="168" height="46" rx="10" fill="#FBD38D" stroke={INK} strokeWidth="3" />
        <text x="120" y="198" textAnchor="middle" fontSize="18" fontWeight="800" fill="#5A3A12" fontFamily="Quicksand, Be Vietnam Pro, sans-serif">{text}</text>
        <Paw x={40} y={168} r={30} rx={13} ry={17} />
        <Paw x={200} y={168} r={-30} rx={13} ry={17} />
      </g>
    }
  />
);

const MOODS: Record<Mood, (p: MoodProps) => JSX.Element> = {
  wave: PandaWave, explain: PandaExplain, think: PandaThink, celebrate: PandaCelebrate,
  cheer: PandaCheer, sleepy: PandaSleepy, eat: PandaEat, bag: PandaBag, sign: PandaSign,
};

const LABELS: Record<Mood, string> = {
  wave: 'Pàngdá vẫy tay chào', explain: 'Pàngdá đang giảng bài', think: 'Pàngdá đang suy nghĩ',
  celebrate: 'Pàngdá nhảy lên vui mừng', cheer: 'Pàngdá giơ ngón cái cổ vũ', sleepy: 'Pàngdá đang buồn ngủ',
  eat: 'Pàngdá đang ăn tre', bag: 'Pàngdá cầm cặp sách', sign: 'Pàngdá ôm biển báo',
};

/** size = chiều cao hình (px) */
export function PandaMascot({ mood = 'wave', size = 120, stage = 0, message, className, signText }: {
  mood?: Mood; size?: number; stage?: number; message?: ReactNode; className?: string; signText?: string;
}) {
  const Comp = MOODS[mood];
  const viewBox = mood === 'explain' ? '-14 24 334 214' : '-14 24 268 214';
  const [, , vw, vh] = viewBox.split(' ').map(Number);
  return (
    <div className={cls('inline-flex items-end gap-2', className)}>
      <svg className="panda shrink-0" width={(size * vw) / vh} height={size} viewBox={viewBox} role="img" aria-label={LABELS[mood]} style={{ overflow: 'visible' }}>
        {mood === 'sign' ? <PandaSign stage={stage} text={signText} /> : <Comp stage={stage} />}
      </svg>
      {message && (
        <div className="pop sticker relative mb-6 max-w-xs rounded-2xl rounded-bl-sm bg-bg px-3 py-2 text-sm font-semibold">
          {message}
        </div>
      )}
    </div>
  );
}
