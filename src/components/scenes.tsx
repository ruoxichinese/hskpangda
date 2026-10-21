
/**
 * Phông nền theo cấp: học sinh hoàn thành bài đầu tiên của một cấp thì mở khoá phông nền của cấp đó.
 * Các cảnh vẽ phẳng, màu nhạt (chế độ sáng) hoặc trầm (chế độ tối) để chữ trên nền luôn dễ đọc.
 */

type P = { d: boolean };
const W = 1440;
const H = 520;
// số giả ngẫu nhiên cố định theo chỉ số → cảnh không "nhảy" mỗi lần vẽ lại
const rnd = (i: number, s = 1) => {
  const x = Math.sin(i * 12.9898 + s * 78.233) * 43758.5453;
  return x - Math.floor(x);
};

function Bamboo({ d }: P) {
  const back = Array.from({ length: 19 }, (_, i) => ({ x: i * 78 + rnd(i) * 30, h: 300 + rnd(i, 2) * 180 }));
  const front = Array.from({ length: 8 }, (_, i) => ({ x: 40 + i * 190 + rnd(i, 3) * 60, h: 360 + rnd(i, 4) * 150 }));
  return (
    <g>
      {d ? <circle cx="1220" cy="120" r="44" fill="#F3EBC8" opacity="0.9" /> : (
        <g fill="#FFFFFF" opacity="0.9">
          <ellipse cx="260" cy="110" rx="70" ry="22" /><ellipse cx="300" cy="96" rx="44" ry="22" />
          <ellipse cx="1100" cy="80" rx="80" ry="22" /><ellipse cx="1060" cy="68" rx="40" ry="20" />
        </g>
      )}
      <path d="M0 380 Q240 300 480 360 T960 340 T1440 350 V520 H0 Z" fill={d ? '#13281B' : '#CBE8C0'} />
      {back.map((s, i) => (
        <g key={`b${i}`}>
          <rect x={s.x} y={H - s.h} width="14" height={s.h} rx="6" fill={d ? '#1C3726' : '#A9D69A'} />
          {Array.from({ length: Math.floor(s.h / 70) }, (_, k) => (
            <rect key={k} x={s.x - 1} y={H - s.h + 50 + k * 70} width="16" height="4" rx="2" fill={d ? '#163020' : '#93C784'} />
          ))}
        </g>
      ))}
      {front.map((s, i) => (
        <g key={`f${i}`}>
          <rect x={s.x} y={H - s.h} width="24" height={s.h} rx="10" fill={d ? '#2A5236' : '#6CB35A'} />
          {Array.from({ length: Math.floor(s.h / 90) }, (_, k) => (
            <rect key={k} x={s.x - 2} y={H - s.h + 70 + k * 90} width="28" height="6" rx="3" fill={d ? '#22452D' : '#58A048'} />
          ))}
          {[0, 1, 2].map((k) => (
            <ellipse key={k} cx={s.x + (k % 2 ? 46 : -22)} cy={H - s.h + 40 + k * 70} rx="34" ry="9" fill={d ? '#2F6040' : '#8FCB7A'}
              transform={`rotate(${k % 2 ? -24 : 24} ${s.x + (k % 2 ? 46 : -22)} ${H - s.h + 40 + k * 70})`} />
          ))}
        </g>
      ))}
      <path d="M0 488 q60 -18 120 0 t120 0 t120 0 t120 0 t120 0 t120 0 t120 0 t120 0 t120 0 t120 0 t120 0 t120 0 V520 H0 Z" fill={d ? '#10241A' : '#B8DFA8'} />
    </g>
  );
}

function WaterTown({ d }: P) {
  const houses = Array.from({ length: 10 }, (_, i) => ({ x: i * 150 - 20 + rnd(i) * 20, w: 120 + rnd(i, 2) * 30, h: 110 + rnd(i, 3) * 60 }));
  return (
    <g>
      {d && <circle cx="1180" cy="110" r="40" fill="#F3EBC8" opacity="0.9" />}
      {houses.map((h, i) => (
        <g key={i}>
          <rect x={h.x} y={420 - h.h} width={h.w} height={h.h} fill={d ? '#273041' : '#FFFFFF'} stroke={d ? '#1A2130' : '#D7DDE2'} strokeWidth="2" />
          <path d={`M${h.x - 14} ${420 - h.h} Q${h.x + h.w / 2} ${420 - h.h - 40} ${h.x + h.w + 14} ${420 - h.h} L${h.x + h.w + 22} ${420 - h.h - 12} L${h.x - 22} ${420 - h.h - 12} Z`} fill={d ? '#11161F' : '#4A515C'} />
          <rect x={h.x + h.w * 0.2} y={420 - h.h + 30} width={h.w * 0.22} height="28" fill={d ? '#E8B35A' : '#5B6470'} opacity={d ? 0.8 : 1} />
          <rect x={h.x + h.w * 0.58} y={420 - 56} width={h.w * 0.24} height="56" fill={d ? '#141A24' : '#7A5A44'} />
          {i % 3 === 1 && (
            <g>
              <line x1={h.x + h.w - 10} y1={420 - h.h} x2={h.x + h.w - 10} y2={420 - h.h + 22} stroke={d ? '#11161F' : '#4A515C'} strokeWidth="2" />
              <ellipse cx={h.x + h.w - 10} cy={420 - h.h + 34} rx="11" ry="13" fill={d ? '#FF8A5C' : '#E8524F'} />
              {d && <circle cx={h.x + h.w - 10} cy={420 - h.h + 34} r="26" fill="#FF8A5C" opacity="0.18" />}
            </g>
          )}
        </g>
      ))}
      <rect x="0" y="420" width={W} height="100" fill={d ? '#12263A' : '#BFE0EA'} />
      <path d="M520 420 Q720 300 920 420 L900 420 Q720 330 540 420 Z" fill={d ? '#3A3F4A' : '#CFC7B8'} />
      <path d="M540 420 Q720 330 900 420 Z" fill={d ? '#12263A' : '#BFE0EA'} opacity="0.001" />
      <path d="M520 420 Q720 300 920 420" stroke={d ? '#2A2E36' : '#B5AC9B'} strokeWidth="6" fill="none" />
      {Array.from({ length: 12 }, (_, i) => (
        <path key={i} d={`M${60 + i * 120 + rnd(i) * 40} ${450 + (i % 3) * 22} h${40 + rnd(i, 5) * 40}`} stroke={d ? '#1E3A55' : '#E6F4F8'} strokeWidth="3" strokeLinecap="round" />
      ))}
    </g>
  );
}

function Hutong({ d }: P) {
  return (
    <g>
      {d && <circle cx="220" cy="110" r="38" fill="#F3EBC8" opacity="0.9" />}
      <g fill={d ? '#2A2530' : '#DCD2C6'}>
        <rect x="640" y="190" width="160" height="200" />
        <path d="M600 200 Q720 150 840 200 L850 188 L590 188 Z" />
        <rect x="670" y="130" width="100" height="60" />
        <path d="M640 140 Q720 100 800 140 L808 128 L632 128 Z" />
      </g>
      <rect x="0" y="470" width={W} height="50" fill={d ? '#19161B' : '#E7DCCD'} />
      {Array.from({ length: 6 }, (_, i) => {
        const x = i * 250 - 30;
        return (
          <g key={i}>
            <rect x={x} y="380" width="230" height="92" fill={d ? '#2E2A31' : '#BDB6AE'} />
            <rect x={x - 6} y="368" width="242" height="16" rx="4" fill={d ? '#1B181D' : '#7E7770'} />
            {i % 2 === 0 && (
              <g>
                <rect x={x + 90} y="402" width="50" height="70" rx="3" fill={d ? '#8E2A22' : '#C0392B'} />
                <circle cx={x + 104} cy="436" r="3" fill="#E8B33A" /><circle cx={x + 126} cy="436" r="3" fill="#E8B33A" />
              </g>
            )}
            {i % 2 === 1 && (
              <g>
                <rect x={x + 110} y="300" width="10" height="80" fill={d ? '#2A2024' : '#8A6A55'} />
                <circle cx={x + 115} cy="290" r="46" fill={d ? '#1E3A2A' : '#9CCB8C'} />
                {[0, 1, 2, 3].map((k) => <circle key={k} cx={x + 90 + k * 16} cy={280 + (k % 2) * 18} r="6" fill={d ? '#B8642E' : '#F2994A'} />)}
              </g>
            )}
          </g>
        );
      })}
    </g>
  );
}

function GreatWall({ d }: P) {
  const ridge = 'M0 400 Q180 300 360 350 T720 300 T1080 330 T1440 290';
  return (
    <g>
      {d && <circle cx="1240" cy="100" r="40" fill="#F3EBC8" opacity="0.9" />}
      <path d="M0 330 Q240 200 480 280 T960 230 T1440 250 V520 H0 Z" fill={d ? '#1A2A30' : '#D6E8DD'} />
      <path d="M0 380 Q200 280 420 330 T860 280 T1440 300 V520 H0 Z" fill={d ? '#203640' : '#B3D3C1'} />
      <path d={`${ridge} V520 H0 Z`} fill={d ? '#26424C' : '#8FBCA6'} />
      <path d={ridge} stroke={d ? '#4A4334' : '#D8C7A2'} strokeWidth="20" fill="none" strokeLinecap="round" transform="translate(0 6)" />
      <path d={ridge} stroke={d ? '#5A5240' : '#E7DABB'} strokeWidth="8" strokeDasharray="10 8" fill="none" transform="translate(0 -8)" />
      {[[330, 336], [760, 296], [1180, 316]].map(([x, y], i) => (
        <g key={i}>
          <rect x={x - 26} y={y - 54} width="52" height="56" fill={d ? '#5A5240' : '#E2D3B2'} stroke={d ? '#3A3428' : '#B9A783'} strokeWidth="3" />
          <rect x={x - 8} y={y - 36} width="16" height="18" rx="8" fill={d ? '#2A2620' : '#8E7B58'} />
        </g>
      ))}
    </g>
  );
}

function Palace({ d }: P) {
  const roof = (x: number, y: number, w: number, c: string) => (
    <path d={`M${x - 30} ${y} Q${x + w / 2} ${y - 30} ${x + w + 30} ${y} L${x + w + 40} ${y - 14} Q${x + w / 2} ${y - 46} ${x - 40} ${y - 14} Z`} fill={c} />
  );
  const gold = d ? '#8A6A1E' : '#E8B33A';
  const red = d ? '#6E2621' : '#C8463A';
  return (
    <g>
      {d && <circle cx="200" cy="100" r="40" fill="#F3EBC8" opacity="0.9" />}
      <rect x="0" y="400" width={W} height="40" fill={red} />
      <rect x="0" y="392" width={W} height="10" fill={gold} />
      <rect x="0" y="440" width={W} height="80" fill={d ? '#2C2A30' : '#F2EEE6'} />
      <path d="M0 446 H1440" stroke={d ? '#3A373F' : '#DCD6CB'} strokeWidth="8" strokeDasharray="6 14" />
      <rect x="520" y="250" width="400" height="150" fill={red} />
      {Array.from({ length: 9 }, (_, i) => <rect key={i} x={540 + i * 44} y="270" width="10" height="130" fill={d ? '#5A1E1A' : '#A8362C'} />)}
      {roof(520, 250, 400, gold)}
      <rect x="600" y="196" width="240" height="40" fill={red} />
      {roof(600, 200, 240, gold)}
      {[[150, 300], [1150, 300]].map(([x, y], i) => (
        <g key={i}>
          <rect x={x} y={y} width="160" height="100" fill={red} />
          {roof(x, y, 160, gold)}
        </g>
      ))}
    </g>
  );
}

function Huangshan({ d }: P) {
  const pine = (x: number, y: number, s: number) => (
    <g transform={`translate(${x} ${y}) scale(${s})`} fill={d ? '#0F1A14' : '#3F5E4A'}>
      <rect x="-2" y="-30" width="4" height="34" />
      <ellipse cx="0" cy="-30" rx="26" ry="6" /><ellipse cx="4" cy="-40" rx="20" ry="5" /><ellipse cx="-2" cy="-48" rx="13" ry="4" />
    </g>
  );
  return (
    <g>
      {d && <circle cx="1200" cy="100" r="40" fill="#F3EBC8" opacity="0.9" />}
      <path d="M0 360 L120 200 L200 290 L320 140 L420 300 L560 180 L680 330 L800 210 L930 300 L1060 160 L1180 290 L1300 190 L1440 320 V520 H0 Z" fill={d ? '#1B2228' : '#C4D0D4'} />
      <ellipse cx="400" cy="330" rx="420" ry="40" fill={d ? '#1E2A33' : '#FFFFFF'} opacity="0.7" />
      <ellipse cx="1100" cy="350" rx="420" ry="44" fill={d ? '#1E2A33' : '#FFFFFF'} opacity="0.7" />
      <path d="M0 440 L160 300 L260 380 L380 260 L500 400 L640 320 L760 420 L900 290 L1040 400 L1180 300 L1320 410 L1440 360 V520 H0 Z" fill={d ? '#2A3640' : '#8FA2A9'} />
      {pine(380, 262, 1.6)}{pine(900, 292, 1.4)}{pine(1180, 302, 1.2)}{pine(160, 302, 1.1)}
      <ellipse cx="720" cy="500" rx="900" ry="50" fill={d ? '#1E2A33' : '#FFFFFF'} opacity="0.8" />
    </g>
  );
}

function Moon({ d }: P) {
  const cloud = (x: number, y: number, s: number) => (
    <g transform={`translate(${x} ${y}) scale(${s})`} fill={d ? '#2A2560' : '#FFFFFF'} opacity="0.9">
      <ellipse cx="0" cy="0" rx="80" ry="22" /><ellipse cx="-30" cy="-14" rx="34" ry="20" /><ellipse cx="26" cy="-18" rx="40" ry="24" />
    </g>
  );
  return (
    <g>
      <circle cx="1100" cy="190" r="140" fill={d ? '#F6EFC9' : '#FFF6D2'} />
      <circle cx="1050" cy="160" r="22" fill={d ? '#E6DDB0' : '#F3E8B8'} /><circle cx="1140" cy="230" r="14" fill={d ? '#E6DDB0' : '#F3E8B8'} />
      {d && Array.from({ length: 30 }, (_, i) => <circle key={i} cx={rnd(i) * W} cy={rnd(i, 7) * 300} r={1 + rnd(i, 3) * 1.8} fill="#FFFFFF" opacity="0.8" />)}
      <g fill={d ? '#3B347A' : '#D9D0F5'}>
        <rect x="560" y="330" width="320" height="110" />
        <path d="M520 336 Q720 296 920 336 L930 322 Q720 270 510 322 Z" />
        <rect x="640" y="280" width="160" height="44" />
        <path d="M610 286 Q720 256 830 286 L838 274 Q720 236 602 274 Z" />
      </g>
      {cloud(720, 450, 3.2)}{cloud(200, 420, 1.8)}{cloud(1300, 430, 2)}
      <rect x="0" y="470" width={W} height="50" fill={d ? '#2A2560' : '#FFFFFF'} opacity="0.9" />
    </g>
  );
}

export const SCENES: Record<string, { sky: [string, string]; C: (p: P) => JSX.Element }> = {
  bamboo: { sky: ['#EAF7E4', '#0B1710'], C: Bamboo },
  watertown: { sky: ['#E8F3F8', '#0C1420'], C: WaterTown },
  hutong: { sky: ['#FDF3E6', '#141018'], C: Hutong },
  greatwall: { sky: ['#EAF3FB', '#0F1A20'], C: GreatWall },
  palace: { sky: ['#FFF4E0', '#17110F'], C: Palace },
  huangshan: { sky: ['#EEF4F7', '#11171C'], C: Huangshan },
  moon: { sky: ['#EFEAFB', '#14113A'], C: Moon },
};

/** Vẽ một cảnh (dùng cho phông nền toàn trang và ô xem trước trong Cài đặt) */
export function SceneArt({ id, dark, className, style }: { id: string; dark: boolean; className?: string; style?: React.CSSProperties }) {
  const s = SCENES[id] ?? SCENES.bamboo;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMax slice" className={className} style={{ background: s.sky[dark ? 1 : 0], ...style }} aria-hidden="true">
      <s.C d={dark} />
    </svg>
  );
}

