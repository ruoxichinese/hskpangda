export function LevelLoading() {
  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 text-muted" role="status" aria-live="polite">
      <span className="animate-bounce text-5xl" aria-hidden>🐼</span>
      <p className="font-semibold">Đang tải bài học…</p>
    </div>
  );
}
