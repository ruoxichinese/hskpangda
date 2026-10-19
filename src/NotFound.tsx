import { Link } from 'react-router-dom';
import { PandaMascot } from '../components/panda/PandaMascot';

export function NotFound() {
  return (
    <div className="flex flex-col items-center gap-4 py-16 text-center">
      <PandaMascot mood="think" size={130} />
      <h1 className="text-2xl font-extrabold">Pàngdá không tìm thấy trang này</h1>
      <p className="text-muted">Đường dẫn có thể đã thay đổi. Quay về trang chủ để học tiếp nhé.</p>
      <Link to="/" className="btn-primary">Về trang chủ</Link>
    </div>
  );
}
export default NotFound;
