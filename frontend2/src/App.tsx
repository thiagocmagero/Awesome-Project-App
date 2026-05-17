import { Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from './shell/AppShell';
import { Placeholder } from './views/Placeholder';
import { WorkspacePeoplePage } from './pages/WorkspacePeoplePage';
import { ProtectedRoute } from './components/ProtectedRoute';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { ResetPasswordPage } from './pages/ResetPasswordPage';
import { ConfirmEmailPage } from './pages/ConfirmEmailPage';
import { ResendConfirmationPage } from './pages/ResendConfirmationPage';
import { CreateAccountFromInvitePage } from './pages/CreateAccountFromInvitePage';
import { TokenExpiredPage } from './errors/TokenExpiredPage';
import { TokenUsedPage } from './errors/TokenUsedPage';
import LocaleGuard from './components/LocaleGuard';
import RedirectWithLocale from './components/RedirectWithLocale';

/** Fase 2.0.1 (Maio 2026): toda a app vive sob `/:locale/*` — alinhado com
 *  o frontend antigo. URLs canónicas em lowercase (ex.: `/pt-pt/login`).
 *  `LocaleGuard` valida o segmento contra a lista activa de locales e
 *  monta `<LocaleProvider>`. URLs sem locale são redireccionadas pelo
 *  catch-all `<RedirectWithLocale>` para `/<userLocale>/...`. */
export default function App() {
  return (
    <Routes>
      <Route path="/:locale" element={<LocaleGuard />}>
        {/* Public auth pages */}
        <Route path="login"                element={<LoginPage />} />
        <Route path="register"             element={<RegisterPage />} />
        <Route path="forgot-password"      element={<ForgotPasswordPage />} />
        <Route path="reset-password"       element={<ResetPasswordPage />} />
        <Route path="confirm-email"        element={<ConfirmEmailPage />} />
        <Route path="resend-confirmation"  element={<ResendConfirmationPage />} />
        <Route path="create-account"       element={<CreateAccountFromInvitePage />} />

        {/* Token error pages */}
        <Route path="error/token-expired"  element={<TokenExpiredPage />} />
        <Route path="error/token-used"     element={<TokenUsedPage />} />

        {/* Authenticated app.
            URL pattern alinhado com `frontend/src/App.tsx` — workspace é o
            primeiro segmento (sem `/w/`), e cada secção usa o mesmo nome
            que no frontend antigo (regra obrigatória `feedback_url_paths_match_legacy`). */}
        <Route element={<ProtectedRoute><AppShell /></ProtectedRoute>}>
          <Route index element={<Navigate to="home" replace />} />
          <Route path="home"    element={<Placeholder titleKey="nav.home" />} />
          <Route path="account" element={<Placeholder titleKey="nav.account_settings" />} />

          <Route path=":workspaceId/dashboard"  element={<Placeholder titleKey="nav.workspace_overview" />} />
          <Route path=":workspaceId/users"      element={<WorkspacePeoplePage />} />
          <Route path=":workspaceId/user-types" element={<Placeholder titleKey="nav.member_types" />} />
          <Route path=":workspaceId/holidays"   element={<Placeholder titleKey="nav.calendars" />} />
          <Route path=":workspaceId/teams"      element={<Placeholder titleKey="nav.teams" />} />
          <Route path=":workspaceId/projects"   element={<Placeholder titleKey="nav.projects" />} />

          {/* Projecto — frontend antigo usa `projects/:id/planning` como
              página única com tabs internas; aqui mantemos esse path para
              o overview e portamos as outras tabs no futuro. */}
          <Route path=":workspaceId/projects/:projectId/planning"    element={<Placeholder titleKey="nav.project_overview" />} />
          <Route path=":workspaceId/projects/:projectId/permissions" element={<Placeholder titleKey="nav.project_permissions" />} />
        </Route>
      </Route>

      {/* Catch-all sem locale → inject default */}
      <Route path="/" element={<RedirectWithLocale />} />
      <Route path="*" element={<RedirectWithLocale />} />
    </Routes>
  );
}
