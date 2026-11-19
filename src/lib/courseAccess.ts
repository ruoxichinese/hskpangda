import { classGateOn } from '../components/ClassGate';
import { useCloud } from '../store/CloudSync';
import { useProgress } from '../store/ProgressStore';
import { levels } from './data';

/**
 * Gộp quyền học từ các lớp của một học sinh.
 * Giáo viên → tất cả (null). Không có dữ liệu lớp → tất cả. Có lớp nào để trống (null) → tất cả. Còn lại → hợp các khoá.
 */
export function mergeCourses(isTeacher: boolean, classCourses: (string[] | null)[]): string[] | null {
  if (isTeacher || !classCourses.length || classCourses.some((c) => !Array.isArray(c))) return null;
  return [...new Set(classCourses.flat() as string[])];
}
export const canStudyWith = (allowed: string[] | null, id: string | undefined) => !id || !allowed || allowed.includes(id);

/** Kiểm tra học sinh có được học một khoá không (giáo viên cấp quyền theo lớp) */
export function useCanStudy(): (levelId: string | undefined) => boolean {
  const cloud = useCloud();
  const allowed = classGateOn ? cloud.allowedLevels : null;
  return (id) => canStudyWith(allowed, id);
}

/** Các khoá đang mở và học sinh được học */
export function useStudyLevels() {
  const can = useCanStudy();
  return levels.filter((l) => l.available && can(l.id));
}

/** Khoá hiện trên trang chủ: khoá học gần nhất nếu được học, không thì khoá đầu tiên được học */
export function useHomeLevel(): string {
  const { global } = useProgress();
  const can = useCanStudy();
  const list = useStudyLevels();
  return can(global.lastLevel) && global.lastLevel ? global.lastLevel : list[0]?.id ?? 'hsk1';
}
