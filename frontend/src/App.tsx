import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ToastProvider } from './contexts/ToastContext';
import { WorkspaceProvider } from './contexts/WorkspaceContext';
import ProtectedRoute from './components/ProtectedRoute';
import AppLayout from './components/AppLayout';
import RedirectToDefaultWorkspace from './components/RedirectToDefaultWorkspace';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import ClientsPage from './pages/ClientsPage';
import UserTypesPage from './pages/UserTypesPage';
import TeamsPage from './pages/TeamsPage';
import ProjectsPage from './pages/ProjectsPage';
import PlanningPage from './pages/PlanningPage';
import PlansPage from './pages/PlansPage';
import HolidaysPage from './pages/HolidaysPage';
import TimesheetsPage from './pages/TimesheetsPage';
import GanttSettingsPage from './pages/GanttSettingsPage';
import CalendarSettingsPage from './pages/CalendarSettingsPage';
import EmailSettingsPage from './pages/EmailSettingsPage';
import PlatformLimitsPage from './pages/PlatformLimitsPage';
import SignUpPage from './pages/SignUpPage';
import TranslationsPage from './pages/TranslationsPage';
import ProjectPermissionsPage from './pages/ProjectPermissionsPage';
import SessionsPage from './pages/SessionsPage';
import NotificationPreferencesPage from './pages/NotificationPreferencesPage';
import UserSettingsPage from './pages/UserSettingsPage';
import WorkspaceUsersPage from './pages/WorkspaceUsersPage';
import TokenExpiredPage from './errors/pages/TokenExpiredPage';
import TokenUsedPage from './errors/pages/TokenUsedPage';
import ConfirmEmailPage from './pages/ConfirmEmailPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import CreatePasswordPage from './pages/CreatePasswordPage';

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
      <Routes>
        {/* ── Públicas / auth — sem workspace ───────────────────────────── */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignUpPage />} />
        <Route path="/confirm-email" element={<ConfirmEmailPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/create-account" element={<CreatePasswordPage />} />
        <Route path="/error/token-expired" element={<TokenExpiredPage />} />
        <Route path="/error/token-used" element={<TokenUsedPage />} />

        {/* ── Protegidas workspace-agnostic (platform admin / user-self) ─ */}
        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            <Route path="/clients" element={<ClientsPage />} />
            <Route path="/plans" element={<PlansPage />} />
            <Route path="/translations" element={<TranslationsPage />} />
            <Route path="/settings/limits" element={<PlatformLimitsPage />} />
            <Route path="/settings/email" element={<EmailSettingsPage />} />
            <Route path="/settings/account" element={<UserSettingsPage />} />
            <Route path="/settings/sessions" element={<SessionsPage />} />
            <Route path="/settings/notifications" element={<NotificationPreferencesPage />} />
          </Route>
        </Route>

        {/* ── Protegidas workspace-scoped — todas sob /:workspacePublicId/* */}
        <Route element={<ProtectedRoute />}>
          <Route
            path="/:workspacePublicId"
            element={
              <WorkspaceProvider>
                <AppLayout />
              </WorkspaceProvider>
            }
          >
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="user-types" element={<UserTypesPage />} />
            <Route path="teams" element={<TeamsPage />} />
            <Route path="projects" element={<ProjectsPage />} />
            <Route path="projects/:id/planning" element={<PlanningPage />} />
            <Route path="projects/:id/planning/tasks/:taskId" element={<PlanningPage />} />
            <Route path="projects/:id/permissions" element={<ProjectPermissionsPage />} />
            <Route path="holidays" element={<HolidaysPage />} />
            <Route path="timesheets" element={<TimesheetsPage />} />
            <Route path="settings/gantt" element={<GanttSettingsPage />} />
            <Route path="settings/calendar" element={<CalendarSettingsPage />} />
            <Route path="users" element={<WorkspaceUsersPage />} />
          </Route>
        </Route>

        {/* ── Raiz e fallback — redirect para o workspace default ───────── */}
        <Route path="/" element={<RedirectToDefaultWorkspace />} />
        <Route path="*" element={<RedirectToDefaultWorkspace />} />
      </Routes>
      </ToastProvider>
    </AuthProvider>
  );
}
