import { LevelSelector } from '../components/LevelSelector';

export default function LevelsPage() {
  return (
    <div>
      <h1 className="text-3xl font-extrabold">Chọn cấp HSK 3.0</h1>
      <p className="mb-5 mt-1 max-w-prose text-muted">HSK 3.0 có 9 cấp. Mỗi cấp mới mở ra, Pàngdá cũng “lớn lên” với phụ kiện mới – phần thưởng cho sự chăm chỉ của bạn.</p>
      <LevelSelector />
    </div>
  );
}
