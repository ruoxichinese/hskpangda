import type { ReactNode } from 'react';
import { cls } from '../../lib/util';

/**
 * Pàngdá 胖达 – linh vật nguyên bản của site.
 * Đặc điểm nhận dạng: đầu tròn kiểu bánh mochi, mắt to long lanh, thân mũm mĩm có đệm thịt ở bàn chân,
 * lọn tóc xoăn trên đỉnh đầu, khăn quàng màu --primary (đổi theo theme), má hồng.
 * Mỗi trạng thái là một component riêng; PandaMascot chọn theo prop "mood".
 */

export type Mood = 'wave' | 'explain' | 'think' | 'celebrate' | 'cheer' | 'sleepy' | 'eat' | 'bag' | 'sign';

const INK = '#232026';
const FUR = '#FFFFFF';
const LINE = '#1F1C22';
const PAD = '#8F8794';
const PRIMARY = 'rgb(var(--c-primary))';
const SECONDARY = 'rgb(var(--c-secondary))';

interface BaseProps {
  eyes?: 'open' | 'closed' | 'happy';
  mouth?: 'smile' | 'open' | 'o' | 'chew';
  leftArm?: ReactNode;
  rightArm?: ReactNode;
  front?: ReactNode; // vẽ đè lên trên thân (tre, cặp sách…)
  back?: ReactNode; // vẽ phía sau (bảng, biển báo…)
  bodyClass?: string;
  headClass?: string;
  stage?: number;
}

/** Cánh tay mũm mĩm. pad = giơ lên, lộ đệm thịt ở lòng bàn tay */
function Arm({ x, y, r = 0, pad, len = 25 }: { x: number; y: number; r?: number; pad?: boolean; len?: number }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${r})`}>
      <ellipse cx="0" cy="0" rx="15" ry={len} fill={INK} />
      {pad && (
        <g fill={PAD}>
          <ellipse cx="0" cy={-len + 13} rx="7" ry="5.5" />
          <circle cx="-6.5" cy={-len + 5} r="2.4" />
          <circle cx="0" cy={-len + 3} r="2.4" />
          <circle cx="6.5" cy={-len + 5} r="2.4" />
        </g>
      )}
    </g>
  );
}

const restLeft = <Arm x={44} y={156} r={28} />;
const restRight = <Arm x={156} y={156} r={-28} />;

function Accessory({ stage }: { stage: number }) {
  if (stage === 1)
    return <path d="M44 56 Q100 14 156 56" stroke={SECONDARY} strokeWidth="8" fill="none" strokeLinecap="round" />;
  if (stage === 2)
    return (
      <g stroke={INK} strokeWidth="3" fill="rgba(255,255,255,.12)">
        <circle cx="75" cy="85" r="19" />
        <circle cx="125" cy="85" r="19" />
        <path d="M94 84 h12" />
      </g>
    );
  if (stage >= 3)
    return (
      <g>
        <path d="M56 34 L100 14 L144 34 L100 52 Z" fill={INK} />
        <rect x="78" y="34" width="44" height="13" rx="3" fill={INK} />
        <path d="M144 34 v22" stroke={PRIMARY} strokeWidth="3" />
        <circle cx="144" cy="58" r="4.5" fill={PRIMARY} />
      </g>
    );
  return null;
}

/** Mắt long lanh: quầng đen hình giọt nước + hai đốm sáng */
function Eye({ cx, flip, kind }: { cx: number; flip: boolean; kind: 'open' | 'closed' | 'happy' }) {
  const rot = flip ? 24 : -24;
  return (
    <g>
      <ellipse cx={cx} cy="88" rx="18" ry="21" fill={INK} transform={`rotate(${rot} ${cx} 88)`} />
      {kind === 'open' && (
        <g>
          {/* tròng mắt có chiều sâu + đốm sáng long lanh */}
          <circle cx={cx + (flip ? -1.5 : 1.5)} cy="86" r="11" fill="#4A3646" />
          <circle cx={cx + (flip ? -1.5 : 1.5)} cy="87" r="7.5" fill="#0B090C" />
          <path d={`M${cx + (flip ? -10 : -7)} 91 a11 11 0 0 0 ${17} 1`} stroke="#8C6E86" strokeWidth="1.6" fill="none" opacity=".8" />
          <circle cx={cx + (flip ? 2.5 : 5.5)} cy="81" r="5" fill={FUR} />
          <circle cx={cx + (flip ? -4.5 : -1.5)} cy="91.5" r="2.4" fill={FUR} />
          <circle cx={cx + (flip ? 4.5 : 7.5)} cy="90.5" r="1.2" fill={FUR} opacity=".9" />
        </g>
      )}
      {kind === 'closed' && <path d={`M${cx - 8} 89 q8 6 16 0`} stroke={FUR} strokeWidth="2.8" fill="none" strokeLinecap="round" />}
      {kind === 'happy' && <path d={`M${cx - 8} 91 q8 -11 16 0`} stroke={FUR} strokeWidth="3" fill="none" strokeLinecap="round" />}
    </g>
  );
}

function PandaBase({ eyes = 'open', mouth = 'smile', leftArm = restLeft, rightArm = restRight, front, back, bodyClass, headClass, stage = 0 }: BaseProps) {
  return (
    <g className={bodyClass}>
      <defs>
        <radialGradient id="pd-blush">
          <stop offset="0" stopColor="#FF7FA6" stopOpacity=".9" />
          <stop offset="1" stopColor="#FF8FB1" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="pd-belly" cx=".5" cy=".4">
          <stop offset="0" stopColor="#FFFFFF" />
          <stop offset="1" stopColor="#EEEAF2" />
        </radialGradient>
      </defs>
      {back}
      {/* thân tròn mập */}
      <ellipse cx="100" cy="161" rx="67" ry="50" fill="url(#pd-belly)" stroke={LINE} strokeWidth="3" />
      {/* bàn chân với đệm thịt */}
      {[68, 132].map((x) => (
        <g key={x}>
          <ellipse cx={x} cy="198" rx="25" ry="16" fill={INK} />
          <ellipse cx={x} cy="200" rx="9" ry="6.5" fill={PAD} />
          <circle cx={x - 8} cy="191" r="2.6" fill={PAD} />
          <circle cx={x} cy="189" r="2.6" fill={PAD} />
          <circle cx={x + 8} cy="191" r="2.6" fill={PAD} />
        </g>
      ))}
      {leftArm}
      {/* khăn quàng – màu theo theme */}
      <path d="M48 121 Q100 147 152 121 L153 134 Q100 162 47 134 Z" fill={PRIMARY} stroke={LINE} strokeWidth="2" />
      <path d="M118 141 L127 171 L142 165 L131 137 Z" fill={SECONDARY} stroke={LINE} strokeWidth="2" strokeLinejoin="round" />
      <g className={headClass}>
        {/* tai */}
        <circle cx="45" cy="44" r="20" fill={INK} />
        <circle cx="155" cy="44" r="20" fill={INK} />
        {/* đầu tròn kiểu bánh mochi */}
        <ellipse cx="100" cy="84" rx="70" ry="52" fill={FUR} stroke={LINE} strokeWidth="3" />
        {/* lọn tóc xoăn đặc trưng */}
        <path d="M97 31 q-10 -13 2 -20 q-3 10 7 11" fill="none" stroke={INK} strokeWidth="4" strokeLinecap="round" />
        <Eye cx={72} flip={false} kind={eyes} />
        <Eye cx={128} flip kind={eyes} />
        {/* má hồng + chấm nhỏ */}
        <ellipse cx="52" cy="110" rx="17" ry="10" fill="url(#pd-blush)" />
        <ellipse cx="148" cy="110" rx="17" ry="10" fill="url(#pd-blush)" />
        <g stroke="#EC5F8A" strokeWidth="1.8" strokeLinecap="round">
          <path d="M48 108 l-1.6 3.4 M54 108 l-1.6 3.4" />
          <path d="M146 108 l-1.6 3.4 M152 108 l-1.6 3.4" />
        </g>
        {/* mũi */}
        <path d="M95 101 q5 -3.5 10 0 q-1.5 5 -5 5 q-3.5 0 -5 -5 z" fill={INK} />
        {mouth === 'smile' && <path d="M92 109 q4 5 8 0 q4 5 8 0" stroke={INK} strokeWidth="2.4" fill="none" strokeLinecap="round" />}
        {mouth === 'open' && (
          <g>
            <path d="M90 108 q10 17 20 0 z" fill="#7A2236" stroke={INK} strokeWidth="2.2" strokeLinejoin="round" />
            <path d="M94.5 115 q5.5 -4 11 0 q-5.5 5 -11 0 z" fill="#FF8FA8" />
          </g>
        )}
        {mouth === 'o' && <ellipse cx="100" cy="113" rx="3.6" ry="4.2" fill="#7A2236" stroke={INK} strokeWidth="1.6" />}
        {mouth === 'chew' && (
          <g className="p-chew">
            <path d="M92 108 q8 9 16 0" fill="#FF8FA8" stroke={INK} strokeWidth="2.2" />
          </g>
        )}
        <Accessory stage={stage} />
      </g>
      {rightArm}
      {front}
    </g>
  );
}

// ===== Các trạng thái =====
type MoodProps = { stage?: number };

export const PandaWave = ({ stage }: MoodProps) => (
  <PandaBase stage={stage} bodyClass="p-bob" rightArm={<g className="p-wave"><Arm x={164} y={116} r={22} pad /></g>} />
);

export const PandaExplain = ({ stage }: MoodProps) => (
  <PandaBase
    stage={stage}
    back={
      <g>
        <rect x="170" y="68" width="62" height="48" rx="7" fill="#2F4F3E" stroke="#8B5E34" strokeWidth="5" />
        <text x="201" y="100" textAnchor="middle" fontSize="20" fill="#fff" fontFamily="Noto Sans SC, sans-serif">好</text>
        <path d="M186 118 l-6 26 M216 118 l6 26" stroke="#8B5E34" strokeWidth="4" />
      </g>
    }
    rightArm={
      <g className="p-point">
        <Arm x={164} y={130} r={62} pad len={23} />
        <path d="M182 118 L198 104" stroke="#8B5E34" strokeWidth="4" strokeLinecap="round" />
        <path d="M198 104 l6 -5 l-2 6 z" fill={INK} />
      </g>
    }
  />
);

export const PandaThink = ({ stage }: MoodProps) => (
  <PandaBase
    stage={stage}
    mouth="o"
    rightArm={<g className="p-scratch"><Arm x={152} y={66} r={-24} pad len={24} /></g>}
    front={<text x="170" y="36" fontSize="30" fontWeight="800" fill={PRIMARY}>?</text>}
  />
);

export const PandaCelebrate = ({ stage }: MoodProps) => (
  <PandaBase
    stage={stage}
    eyes="happy"
    mouth="open"
    bodyClass="p-jump"
    leftArm={<Arm x={38} y={112} r={-30} pad />}
    rightArm={<Arm x={162} y={112} r={30} pad />}
    front={
      <g>
        <path d="M24 34 l4 8 9 1 -7 6 2 9 -8 -5 -8 5 2 -9 -7 -6 9 -1z" fill={PRIMARY} />
        <path d="M172 22 l3 6 7 1 -5 4 1 7 -6 -4 -6 4 1 -7 -5 -4 7 -1z" fill={SECONDARY} />
      </g>
    }
  />
);

export const PandaCheer = ({ stage }: MoodProps) => (
  <PandaBase
    stage={stage}
    eyes="happy"
    bodyClass="p-nod"
    rightArm={
      <g>
        <Arm x={156} y={128} r={30} pad len={22} />
        <ellipse cx="166" cy="102" rx="6" ry="10" fill={INK} transform="rotate(20 166 102)" />
      </g>
    }
  />
);

export const PandaSleepy = ({ stage }: MoodProps) => (
  <PandaBase
    stage={stage}
    eyes="closed"
    mouth="o"
    bodyClass="p-breathe"
    headClass="p-nod"
    front={
      <g fill={PRIMARY} fontWeight="800" fontFamily="Be Vietnam Pro, sans-serif">
        <text className="p-z" x="152" y="36" fontSize="18">z</text>
        <text className="p-z" x="164" y="22" fontSize="24" style={{ animationDelay: '.7s' }}>Z</text>
      </g>
    }
  />
);

export const PandaEat = ({ stage }: MoodProps) => (
  <PandaBase
    stage={stage}
    eyes="happy"
    mouth="chew"
    leftArm={<g />}
    rightArm={<g />}
    front={
      <g>
        {/* cây tre ngang miệng, hai tay ôm hai đầu */}
        <g transform="rotate(-14 100 124)">
          <rect x="58" y="118" width="84" height="12" rx="6" fill="#6DBE58" stroke="#3E7F32" strokeWidth="2" />
          <path d="M84 118 v12 M116 118 v12" stroke="#3E7F32" strokeWidth="2" />
          <ellipse cx="144" cy="124" rx="3" ry="6" fill="#B9E3A5" stroke="#3E7F32" strokeWidth="1.5" />
        </g>
        <path d="M150 112 q10 -12 20 -10" stroke="#4E9A3E" strokeWidth="3" fill="none" strokeLinecap="round" />
        <ellipse cx="172" cy="100" rx="9" ry="4.5" fill="#7CC36A" transform="rotate(-20 172 100)" />
        <ellipse cx="166" cy="92" rx="8" ry="4" fill="#7CC36A" transform="rotate(-60 166 92)" />
        <Arm x={58} y={146} r={-14} pad len={22} />
        <Arm x={142} y={136} r={10} pad len={22} />
      </g>
    }
  />
);

export const PandaBag = ({ stage }: MoodProps) => (
  <PandaBase
    stage={stage}
    eyes="happy"
    bodyClass="p-bob"
    rightArm={<Arm x={150} y={150} r={-20} len={21} />}
    front={
      <g>
        <path d="M152 170 q10 -16 20 0" stroke={INK} strokeWidth="4" fill="none" />
        <rect x="140" y="168" width="44" height="35" rx="9" fill={PRIMARY} stroke={INK} strokeWidth="2.5" />
        <rect x="150" y="180" width="24" height="10" rx="3" fill={SECONDARY} />
      </g>
    }
  />
);

export const PandaSign = ({ stage, text = 'Sắp ra mắt' }: MoodProps & { text?: string }) => (
  <PandaBase
    stage={stage}
    bodyClass="p-bob"
    leftArm={<Arm x={60} y={130} r={42} />}
    rightArm={<Arm x={140} y={130} r={-42} />}
    front={
      <g>
        <rect x="38" y="134" width="124" height="40" rx="9" fill="#FBD38D" stroke="#8B5E34" strokeWidth="3" />
        <text x="100" y="160" textAnchor="middle" fontSize="15" fontWeight="800" fill="#5A3A12" fontFamily="Be Vietnam Pro, sans-serif">{text}</text>
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

export function PandaMascot({ mood = 'wave', size = 120, stage = 0, message, className, signText }: {
  mood?: Mood; size?: number; stage?: number; message?: ReactNode; className?: string; signText?: string;
}) {
  const Comp = MOODS[mood];
  const viewBox = mood === 'explain' ? '14 0 226 218' : '14 0 172 218';
  const width = mood === 'explain' ? size * 1.28 : size;
  return (
    <div className={cls('inline-flex items-end gap-2', className)}>
      <svg className="panda shrink-0" width={width} height={size * 1.19} viewBox={viewBox} role="img" aria-label={LABELS[mood]}>
        {mood === 'sign' ? <PandaSign stage={stage} text={signText} /> : <Comp stage={stage} />}
      </svg>
      {message && (
        <div className="pop relative mb-6 max-w-xs rounded-2xl rounded-bl-sm border-2 border-primary/50 bg-bg px-3 py-2 text-sm font-medium shadow-sm">
          {message}
        </div>
      )}
    </div>
  );
}
