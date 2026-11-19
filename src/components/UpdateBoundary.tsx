import { Component, type ReactNode } from 'react';
import { hardReload } from '../lib/staleReload';

/** Lưới an toàn: lỗi khi tải trang (thường do website vừa cập nhật) → báo và cho tải lại, không để màn hình trắng */
export class UpdateBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center" role="alert">
        <p className="text-5xl" aria-hidden>🐼</p>
        <h1 className="mt-3 font-display text-2xl font-extrabold">Website vừa được cập nhật</h1>
        <p className="mt-2 text-muted">Bấm nút bên dưới để tải bản mới. Tiến độ và bài làm dở của bạn vẫn được giữ nguyên.</p>
        <button className="btn-primary mt-5" onClick={hardReload}>🔄 Tải lại trang</button>
      </div>
    );
  }
}
