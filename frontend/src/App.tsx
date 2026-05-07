import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ToastProvider } from './contexts/ToastContext';
import ProtectedRoute from './components/ProtectedRoute';
import AppLayout from './components/AppLayout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import UsersPage from './pages/UsersPage';
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
        {/* Public */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignUpPage />} />
        <Route path="/confirm-email" element={<ConfirmEmailPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/create-account" element={<CreatePasswordPage />} />
        <Route path="/error/token-expired" element={<TokenExpiredPage />} />
        <Route path="/error/token-used" element={<TokenUsedPage />} />

        {/* Protected – PLATFORM_ADMIN only */}
        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/users" element={<UsersPage />} />
            <Route path="/user-types" element={<UserTypesPage />} />
            <Route path="/teams" element={<TeamsPage />} />
            <Route path="/projects" element={<ProjectsPage />} />
            <Route path="/projects/:id/planning" element={<PlanningPage />} />
            <Route path="/projects/:id/planning/tasks/:taskId" element={<PlanningPage />} />
            <Route path="/projects/:id/permissions" element={<ProjectPermissionsPage />} />
            <Route path="/plans" element={<PlansPage />} />
            <Route path="/holidays" element={<HolidaysPage />} />
            <Route path="/timesheets" element={<TimesheetsPage />} />
            <Route path="/settings/gantt" element={<GanttSettingsPage />} />
            <Route path="/settings/calendar" element={<CalendarSettingsPage />} />
            <Route path="/settings/email" element={<EmailSettingsPage />} />
            <Route path="/settings/limits" element={<PlatformLimitsPage />} />
            <Route path="/settings/account" element={<UserSettingsPage />} />
            <Route path="/settings/sessions" element={<SessionsPage />} />
            <Route path="/settings/notifications" element={<NotificationPreferencesPage />} />
            <Route path="/workspace/users" element={<WorkspaceUsersPage />} />
            <Route path="/translations" element={<TranslationsPage />} />
          </Route>
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
      </ToastProvider>
    </AuthProvider>
  );
}
