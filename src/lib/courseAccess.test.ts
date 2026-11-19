import { describe, expect, it } from 'vitest';
import { canStudyWith, mergeCourses } from './courseAccess';

describe('Cấp quyền học theo khoá', () => {
  it('lớp chỉ mở khoá Giao tiếp → không vào được HSK', () => {
    const allowed = mergeCourses(false, [['giaotiep']]);
    expect(canStudyWith(allowed, 'giaotiep')).toBe(true);
    expect(canStudyWith(allowed, 'hsk1')).toBe(false);
    expect(canStudyWith(allowed, 'hsk3')).toBe(false);
    expect(canStudyWith(allowed, 'business')).toBe(false);
  });
  it('học sinh ở hai lớp → được học tổng các khoá', () => {
    const allowed = mergeCourses(false, [['giaotiep'], ['hsk1', 'hsk2']]);
    expect(allowed?.sort()).toEqual(['giaotiep', 'hsk1', 'hsk2']);
    expect(canStudyWith(allowed, 'hsk3')).toBe(false);
  });
  it('có một lớp để trống (tất cả) → được học mọi khoá', () => {
    expect(mergeCourses(false, [['giaotiep'], null])).toBeNull();
  });
  it('giáo viên và trường hợp chưa có dữ liệu lớp → mọi khoá', () => {
    expect(mergeCourses(true, [['giaotiep']])).toBeNull();
    expect(mergeCourses(false, [])).toBeNull();
    expect(canStudyWith(null, 'hsk3')).toBe(true);
  });
  it('trang không thuộc khoá nào (cài đặt, tài khoản) luôn vào được', () => {
    expect(canStudyWith(['giaotiep'], undefined)).toBe(true);
  });
});
