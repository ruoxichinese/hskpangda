import { lazy, Suspense } from 'react';
import { BrowserRouter, HashRouter, Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { PandaMascot } from './components/panda/PandaMascot';
import { ProgressProvider } from './store/ProgressStore';
import { CloudProvider } from './store/CloudSync';
import { ThemeProvider } from './theme/ThemeProvider';

const HomePage = lazy(() => import('./pages/HomePage'));
const LevelsPage = lazy(() => import('./pages/LevelsPage'));
const LevelMapPage = lazy(() => import('./pages/LevelMapPage'));
const LessonPage = lazy(() => import('./pages/LessonPage'));
const HomeworkPage = lazy(() => import('./pages/HomeworkPage'));
const ReviewPage = lazy(() => import('./pages/ReviewPage'));
const VocabPage = lazy(() => import('./pages/VocabPage'));
const GrammarPage = lazy(() => import('./pages/GrammarPage'));
const CharactersPage = lazy(() => import('./pages/CharactersPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
const NotFound = lazy(() => import('./pages/NotFound'));
const AccountPage = lazy(() => import('./pages/AccountPage'));
const TeacherPage = lazy(() => import('./pages/TeacherPage'));

function Loading() {
  return (
    <div className="flex flex-col items-center gap-2 py-20" role="status">
      <PandaMascot mood="eat" size={120} />
      <p className="font-semibold text-muted">Pàngdá đang nhai tre… chờ chút nhé</p>
    </div>
  );
}

// VITE_HASH_ROUTER=1 khi triển khai lên host tĩnh không hỗ trợ rewrite URL
const Router = import.meta.env.VITE_HASH_ROUTER === '1' ? HashRouter : BrowserRouter;

export default function App() {
  return (
    <ThemeProvider>
      <ProgressProvider>
       <CloudProvider>
        <Router basename={import.meta.env.VITE_HASH_ROUTER === '1' ? undefined : import.meta.env.BASE_URL}>
          <Suspense fallback={<Loading />}>
            <Routes>
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
        </Router>
       </CloudProvider>
      </ProgressProvider>
    </ThemeProvider>
  );
}
