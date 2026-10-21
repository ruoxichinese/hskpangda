import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { useTheme } from '../theme/ThemeProvider';
import { useProgress } from '../store/ProgressStore';
import { cls } from '../lib/util';
import { BadgeToast } from './ui';
import { Backdrop } from './Backdrop';
import { stopAll } from '../lib/audio';
import { useCloud } from '../store/CloudSync';
import { SyncBadge } from '../pages/AccountPage';

const NAV = [
  { to: '/', label: 'Trang chủ', icon: '🏠', end: true },
  { to: '/hsk/hsk1', label: 'Lộ trình', icon: '🗺️' },
  { to: '/tu-vung', label: 'Từ vựng', icon: '📒' },
  { to: '/ngu-phap', label: 'Ngữ pháp', icon: '🧩' },
  { to: '/nhan-vat', label: 'Nhân vật', icon: '👥' },
  { to: '/cai-dat', label: 'Cài đặt', icon: '⚙️' },
];

export function ModeToggle() {
  const { modePref, mode, cycleMode } = useTheme();
  const icon = modePref === 'system' ? '🖥️' : mode === 'dark' ? '🌙' : '☀️';
  const label = modePref === 'system' ? 'Theo hệ thống' : mode === 'dark' ? 'Tối' : 'Sáng';
  return (
    <button className="chip" onClick={cycleMode} aria-label={`Chế độ hiển thị: ${label}. Bấm để đổi`} title={`Chế độ: ${label}`}>
      <span aria-hidden>{icon}</span>
      <span className="hidden whitespace-nowrap xl:inline">{label}</span>
    </button>
  );
}

export function Layout() {
  const { global } = useProgress();
  const { pathname } = useLocation();
  const lastLevel = global.lastLevel || 'hsk1';
  const cloud = useCloud();
  useEffect(() => { window.scrollTo(0, 0); stopAll(); }, [pathname]);

  const nav = NAV.map((n) => (n.to === '/hsk/hsk1' ? { ...n, to: `/hsk/${lastLevel}` } : n));
  if (cloud.isTeacher) nav.splice(5, 0, { to: '/giao-vien', label: 'Giáo viên', icon: '👩‍🏫', end: false });

  return (
    <div className="min-h-screen pb-24 lg:pb-8">
      <Backdrop />
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[60] focus:rounded-full focus:bg-bg focus:px-4 focus:py-2">Bỏ qua, tới nội dung chính</a>
      <header className="no-print sticky top-0 z-40 border-b-[2.5px] border-outline bg-card/90 backdrop-blur" style={{ top: 'env(safe-area-inset-top, 0px)' }}>
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-2.5">
          <NavLink to="/" className="flex items-center gap-2 font-extrabold" aria-label="Pàngdá HSK – Trang chủ">
            <span className="text-2xl" aria-hidden>🐼</span>
            <span className="whitespace-nowrap font-display text-xl font-bold leading-none">Pàngdá<span className="ml-1 font-hanfun text-lg text-accent">胖达</span></span>
          </NavLink>
          <nav aria-label="Điều hướng chính" className="ml-4 hidden gap-1 lg:flex">
            {nav.map((n) => (
              <NavLink key={n.label} to={n.to} end={n.end} className={({ isActive }) => cls('whitespace-nowrap rounded-full px-3 py-2 text-sm font-semibold hover:bg-primary/10', isActive && 'bg-primary/15 text-accent')}>
                {n.label}
              </NavLink>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <span className="chip whitespace-nowrap !cursor-default" title="Chuỗi ngày học" aria-label={`Chuỗi ${global.streak.count} ngày học`}>🔥 {global.streak.count}</span>
            <span className="chip hidden whitespace-nowrap !cursor-default sm:inline-flex" aria-label={`${global.xp} điểm kinh nghiệm`}>⚡ {global.xp} XP</span>
            {cloud.configured && (
              <NavLink to="/tai-khoan" className="chip whitespace-nowrap" aria-label="Tài khoản và đồng bộ">
                <SyncBadge withText={false} />
                <span className="hidden md:inline">{cloud.session ? 'Tài khoản' : 'Đăng nhập'}</span>
              </NavLink>
            )}
            <ModeToggle />
          </div>
        </div>
      </header>

      <main id="main" className="mx-auto max-w-6xl px-4 py-5">
        <Outlet />
      </main>

      <nav aria-label="Điều hướng nhanh" className="no-print fixed inset-x-0 bottom-0 z-40 border-t-[2.5px] border-outline bg-card/95 backdrop-blur lg:hidden" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
        <ul className="grid grid-cols-5">
          {nav.filter((n) => n.label !== 'Nhân vật' && n.label !== 'Giáo viên').map((n) => (
            <li key={n.label}>
              <NavLink to={n.to} end={n.end} className={({ isActive }) => cls('flex flex-col items-center py-2 text-[11px] font-semibold', isActive ? 'text-accent' : 'text-muted')}>
                <span className="text-xl" aria-hidden>{n.icon}</span>
                {n.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
      <BadgeToast />
    </div>
  );
}
