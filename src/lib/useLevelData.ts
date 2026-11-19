import { reloadOnce } from './staleReload';
import { useEffect, useReducer, useState } from 'react';
import { ensureLevel, levelReady } from './data';

/** Tải dữ liệu các khoá cần dùng; trả về true khi đã sẵn sàng (tự vẽ lại khi tải xong) */
export function useLevelData(ids: (string | undefined)[]): boolean {
  const list = ids.filter((x): x is string => !!x);
  const key = list.join(',');
  const [, bump] = useReducer((x: number) => x + 1, 0);
  const [failed, setFailed] = useState(false);
  if (failed) throw new Error('Không tải được dữ liệu khoá học');
  const ready = list.every(levelReady);
  useEffect(() => {
    if (list.every(levelReady)) return;
    let alive = true;
    Promise.all(list.map(ensureLevel)).then(() => { if (alive) bump(); }, () => { if (alive && !reloadOnce()) setFailed(true); });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return ready;
}
