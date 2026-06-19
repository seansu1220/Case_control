/** 應用程式路由設定。 */
import { Navigate, Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { ProtectedRoute } from './components/ProtectedRoute';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { CaseListPage } from './pages/CaseListPage';
import { NewCasePage } from './pages/NewCasePage';
import { CaseDetailPage } from './pages/CaseDetailPage';
import { UsersPage } from './pages/UsersPage';
import { ProfilePage } from './pages/ProfilePage';
import { VocabularyAdminPage } from './pages/VocabularyAdminPage';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      <Route
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<CaseListPage />} />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="cases/new" element={<NewCasePage />} />
        <Route path="cases/:caseId" element={<CaseDetailPage />} />
        <Route
          path="users"
          element={
            <ProtectedRoute requireAdmin>
              <UsersPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="vocabularies"
          element={
            <ProtectedRoute requireAdmin>
              <VocabularyAdminPage />
            </ProtectedRoute>
          }
        />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
