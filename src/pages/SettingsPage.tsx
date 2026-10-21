import { useRef, useState } from 'react';
import { PandaMascot } from '../components/panda/PandaMascot';
import { cls } from '../lib/util';
import { useProgress } from '../store/ProgressStore';
import { useCloud } from '../store/CloudSync';
import { Link } from 'react-router-dom';
import { THEMES, useTheme, type ModePref } from '../theme/ThemeProvider';
import { SceneArt, useScenes } from '../components/Backdrop';

function Radio<T extends string | number | null>({ label, value, options, onChange }: { label: string; value: T; options: [T, string][]; onChange: (v: T) => void }) {
  return (
    <fieldset>
      <legend className="mb-2 font-bold">{label}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map(([v, l]) => (
          <button key={String(v)} role="radio" aria-checked={value === v} className={cls('chip', value === v && 'chip-on')} onClick={() => onChange(v)}>{l}</button>
        ))}
      </div>
    </fieldset>
  );
}

export default function SettingsPage() {
  const { theme, setTheme, modePref, setModePref, mode } = useTheme();
  const scenes = useScenes();
  const { settings, setSettings, exportAll, importAll, resetAll } = useProgress();
  const fileRef = useRef<HTMLInputElement>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const cloud = useCloud();

  const download = () => {
    const blob = new Blob([exportAll()], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `pangda-hsk-tien-do-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
    setMsg('Đã xuất file sao lưu.');
  };

  return (
    <div className="space-y-5">
      <h1 className="text-3xl font-extrabold">⚙️ Cài đặt</h1>

      <section className="card space-y-5">
        <div className="flex flex-wrap items-center gap-4">
          <PandaMascot mood="wave" size={90} />
          <p className="text-muted">Khăn quàng của Pàngdá đổi màu theo theme bạn chọn.</p>
        </div>
        <fieldset>
          <legend className="mb-2 font-bold">Theme màu</legend>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
            {THEMES.map((t) => (
              <button key={t.id} role="radio" aria-checked={theme === t.id} onClick={() => setTheme(t.id)} className={cls('opt flex flex-col items-center gap-1 text-center', theme === t.id && 'opt-on')}>
                <span className="h-8 w-full rounded-full" style={{ background: `linear-gradient(90deg, ${t.colors[0]}, ${t.colors[1]})` }} aria-hidden />
                <span className="text-sm font-semibold">{t.emoji} {t.name}</span>
              </button>
            ))}
          </div>
        </fieldset>
        <Radio<ModePref> label="Sáng / Tối" value={modePref} onChange={setModePref} options={[['system', '🖥️ Theo hệ thống'], ['light', '☀️ Sáng'], ['dark', '🌙 Tối']]} />
      </section>

      <section className="card space-y-3">
        <h2 className="font-bold">Phông nền</h2>
        <p className="text-sm text-muted">Mỗi cấp HSK có một vùng đất riêng. Hoàn thành bài đầu tiên của một cấp để mở khoá vùng đất đó.</p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <button role="radio" aria-checked={settings.scene === 'auto'} onClick={() => setSettings({ scene: 'auto' })} className={cls('opt flex flex-col items-center justify-center gap-1 text-center', settings.scene === 'auto' && 'opt-on')}>
            <span className="font-display text-lg font-bold">Tự động</span>
            <span className="text-xs text-muted">Vùng đất mới nhất: {scenes.highest.name}</span>
          </button>
          {scenes.list.map((s) => (
            <button key={s.id} role="radio" aria-checked={settings.scene === s.id} disabled={!s.unlocked}
              onClick={() => setSettings({ scene: s.id })}
              className={cls('opt flex flex-col gap-1 !p-2 text-left', settings.scene === s.id && 'opt-on', !s.unlocked && 'opacity-60')}>
              <span className="relative block h-20 overflow-hidden rounded-xl">
                <SceneArt id={s.id} dark={mode === 'dark'} className="absolute inset-0 h-full w-full" style={s.unlocked ? undefined : { filter: 'grayscale(1)' }} />
                {!s.unlocked && <span className="absolute inset-0 flex items-center justify-center text-2xl" aria-hidden>🔒</span>}
              </span>
              <span className="px-1 text-sm font-bold">{s.name}</span>
              <span className="px-1 text-xs text-muted">{s.unlocked ? s.desc : `Học bài đầu tiên ${s.level.name.split(' – ')[0]}`}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="card space-y-5">
        <Radio label="Pinyin" value={settings.pinyin} onChange={(v) => setSettings({ pinyin: v })} options={[['level', 'Theo cấp độ'], ['always', 'Luôn hiện'], ['tap', 'Chạm để hiện'], ['hidden', 'Ẩn']]} />
        <Radio label="Bản dịch tiếng Việt" value={settings.translation} onChange={(v) => setSettings({ translation: v })} options={[['level', 'Theo cấp độ'], ['shown', 'Hiện'], ['tap', 'Bấm để xem'], ['hidden', 'Ẩn']]} />
        <Radio label="Tốc độ đọc" value={settings.speed} onChange={(v) => setSettings({ speed: v })} options={[[null, 'Theo cấp độ'], [0.5, '0.5x'], [0.75, '0.75x'], [1, '1x']]} />
      </section>

      <section className="card space-y-3">
        <h2 className="font-bold">Sao lưu & khôi phục tiến độ</h2>
        {cloud.configured && <p className="text-sm">☁️ Muốn tự đồng bộ giữa các thiết bị? <Link to="/tai-khoan" className="font-semibold text-accent underline">{cloud.session ? 'Xem trạng thái đồng bộ' : 'Đăng nhập'}</Link>{cloud.session && ' – xoá tiến độ sẽ xoá cả bản trên tài khoản.'}</p>}
        <p className="text-sm text-muted">Tiến độ được lưu trong trình duyệt này. Xuất file JSON để chuyển sang máy khác hoặc phòng khi xoá dữ liệu trình duyệt.</p>
        <div className="flex flex-wrap gap-2">
          <button className="btn-primary" onClick={download}>⬇️ Xuất file sao lưu</button>
          <button className="btn-ghost" onClick={() => fileRef.current?.click()}>⬆️ Nhập file sao lưu</button>
          <input ref={fileRef} type="file" accept="application/json,.json" className="sr-only" aria-label="Chọn file sao lưu"
            onChange={async (e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              try { importAll(await f.text()); } catch (err) { setMsg(err instanceof Error ? err.message : 'Không đọc được file.'); }
            }} />
          <button className="btn-ghost border-bad/60 text-bad" onClick={async () => { if (!confirmReset) { setConfirmReset(true); return; } if (cloud.session) await cloud.wipeRemote(); resetAll(); }}>
            {confirmReset ? '⚠️ Bấm lần nữa để xoá vĩnh viễn' : '🗑️ Xoá tiến độ'}
          </button>
        </div>
        {msg && <p role="status" className="font-semibold">{msg}</p>}
      </section>
    </div>
  );
}
