import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import AppLayout from '@/components/layout/AppLayout';
import ImportPage from '@/pages/ImportPage';
import PlaybackPage from '@/pages/PlaybackPage';
import ReportPage from '@/pages/ReportPage';

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<AppLayout />}>
          <Route index element={<Navigate to="/import" replace />} />
          <Route path="import" element={<ImportPage />} />
          <Route path="playback" element={<PlaybackPage />} />
          <Route path="report" element={<ReportPage />} />
        </Route>
      </Routes>
    </Router>
  );
}
