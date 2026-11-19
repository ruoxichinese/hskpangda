import { UpdateBoundary } from './components/UpdateBoundary';
import { reloadOnce } from './lib/staleReload';
import { CourseLocked } from './components/CourseLocked';
import { useCanStudy } from './lib/courseAccess';
import { useParams } from 'react-router-dom';
import { useLevelData } from './lib/useLevelData';
import { LevelLoading } from './components/LevelLoading';
import { lazy, Suspense } from 'react';
import { BrowserRouter, HashRouter, Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { ClassGate } from './components/ClassGate';
import { PandaMascot } from './components/panda/PandaMascot';
import { ProgressProvider } from './store/ProgressStore';
import { CloudProvider } from './store/CloudSync';
import { ThemeProvider } from './theme/ThemeProvider';

const HomePage = lazy(() => withReload(import('./pages/HomePage')));
const LevelsPage = lazy(() => withReload(import('./pages/LevelsPage')));
const LevelMapPage = lazy(() => withReload(import('./pages/LevelMapPage')));
const LessonPage = lazy(() => withReload(import('./pages/LessonPage')));
const HomeworkPage = lazy(() => withReload(import('./pages/HomeworkPage')));
const ReviewPage = lazy(() => withReload(import('./pages/ReviewPage')));
const VocabPage = lazy(() => withReload(import('./pages/VocabPage')));
const GrammarPage = lazy(() => withReload(import('./pages/GrammarPage')));
const CharactersPage = lazy(() => withReload(import('./pages/CharactersPage')));
const SettingsPage = lazy(() => withReload(import('./pages/SettingsPage')));
const NotFound = lazy(() => withReload(import('./pages/NotFound')));
const AccountPage = lazy(() => withReload(import('./pages/AccountPage')));
const TeacherPage = lazy(() => withReload(import('./pages/TeacherPage')));
const ExamPage = lazy(() => withReload(import('./pages/ExamPage')));

function Loading() {
  return (
    <div className="flex flex-col items-center gap-2 py-20" role="status">
      <PandaMascot mood="eat" size={120} />
      <p className="font-semibold text-muted">Pàngdá đang nhai tre… chờ chút nhé</p>
    </div>
  );
}

// VITE_HASH_ROUTER=1 khi triển khai lên host tĩnh không hỗ trợ rewrite URL
/** trang tải dần: không tải được (bản cũ đã bị thay) → tải lại trang một lần */
function withReload<T>(p: Promise<T>): Promise<T> {
  return p.catch((err) => { reloadOnce(); throw err; });
}

const Router = import.meta.env.VITE_HASH_ROUTER === '1' ? HashRouter : BrowserRouter;

/** Phòng thi nằm ngoài Layout → tự tải dữ liệu khoá trước khi hiện đề */
function ExamRoom() {
  const { level } = useParams();
  const can = useCanStudy();
  const ready = useLevelData([can(level) ? level : undefined]);
  if (!can(level)) return <CourseLocked levelId={level} />;
  return ready ? <ExamPage /> : <LevelLoading />;
}

export default function App() {
  return (
    <ThemeProvider>
      <ProgressProvider>
       <CloudProvider>
        <Router basename={import.meta.env.VITE_HASH_ROUTER === '1' ? undefined : import.meta.env.BASE_URL}>
          <UpdateBoundary>
          <Suspense fallback={<Loading />}>
            <Routes>
              {/* phòng thi: toàn màn hình, không có menu – giống thi trên máy */}
              <Route path="hsk/:level/thi-thu/:examId" element={<ClassGate><ExamRoom /></ClassGate>} />
              <Route element={<Layout />}>
                <Route index element={<HomePage />} />
                <Route path="cap-do" element={<LevelsPage />} />
                <Route path="hsk/:level" element={<LevelMapPage />} />
                <Route path="hsk/:level/bai/:id" element={<LessonPage />} />
                <Route path="hsk/:level/bai/:id/bai-tap-ve-nha" element={<HomeworkPage />} />
                <Route path="hsk/:level/on-tap/:id" element={<ReviewPage />} />
                <Route path="tu-vung" element={<VocabPage />} />
                <Route path="ngu-phap" element={<GrammarPage />} />
                <Route path="nhan-vat" element={<CharactersPage />} />
                <Route path="cai-dat" element={<SettingsPage />} />
                <Route path="tai-khoan" element={<AccountPage />} />
                <Route path="giao-vien" element={<TeacherPage />} />
                <Route path="*" element={<NotFound />} />
              </Route>
            </Routes>
          </Suspense>
          </UpdateBoundary>
        </Router>
       </CloudProvider>
      </ProgressProvider>
    </ThemeProvider>
  );
}
