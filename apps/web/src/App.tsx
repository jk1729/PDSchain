import { Route, Routes } from 'react-router-dom';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { AppShell } from './components/layout/AppShell';
import { ErrorBoundary } from './components/ui/ErrorBoundary';
import { AuthProvider } from './context/AuthContext';
import { ForgotPasswordPage } from './pages/auth/ForgotPasswordPage';
import { LoginPage } from './pages/auth/LoginPage';
import { RegisterPage } from './pages/auth/RegisterPage';
import { ResendVerificationPage } from './pages/auth/ResendVerificationPage';
import { ResetPasswordPage } from './pages/auth/ResetPasswordPage';
import { VerifyEmailPage } from './pages/auth/VerifyEmailPage';
import { AdminAuditEventsPage } from './pages/admin/AdminAuditEventsPage';
import { AdminStaffRequestsPage } from './pages/admin/AdminStaffRequestsPage';
import { AdminUsersPage } from './pages/admin/AdminUsersPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { ProfilePage } from './pages/ProfilePage';
import { ServiceStatusPage } from './pages/ServiceStatusPage';
import { StaffRequestCreatePage } from './pages/StaffRequestCreatePage';
import { UnauthorizedPage } from './pages/UnauthorizedPage';
import { WelcomePage } from './pages/WelcomePage';
import { WarehouseInventoryPage } from './pages/WarehouseInventoryPage';
import { FpsDistributionPage } from './pages/FpsDistributionPage';
import { BeneficiaryEntitlementsPage } from './pages/BeneficiaryEntitlementsPage';
import { DistributionLedgerPage } from './pages/DistributionLedgerPage';

export function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <Routes>
          <Route element={<AppShell />}>
            {/* Public routes */}
            <Route index element={<WelcomePage />} />
            <Route path="status" element={<ServiceStatusPage />} />
            <Route path="login" element={<LoginPage />} />
            <Route path="register" element={<RegisterPage />} />
            <Route path="verify-email" element={<VerifyEmailPage />} />
            <Route path="resend-verification" element={<ResendVerificationPage />} />
            <Route path="forgot-password" element={<ForgotPasswordPage />} />
            <Route path="reset-password" element={<ResetPasswordPage />} />
            <Route path="unauthorized" element={<UnauthorizedPage />} />

            {/* Protected routes: Any authenticated user */}
            <Route element={<ProtectedRoute />}>
              <Route path="profile" element={<ProfilePage />} />
              <Route path="staff-requests/new" element={<StaffRequestCreatePage />} />
              <Route path="beneficiary-entitlements" element={<BeneficiaryEntitlementsPage />} />
              <Route path="distribution-ledger" element={<DistributionLedgerPage />} />
            </Route>

            {/* Protected routes: Warehouse Managers & Admins */}
            <Route element={<ProtectedRoute allowedRoles={['ADMIN', 'WAREHOUSE_MANAGER']} />}>
              <Route path="warehouse-inventory" element={<WarehouseInventoryPage />} />
            </Route>

            {/* Protected routes: FPS Operators & Admins */}
            <Route element={<ProtectedRoute allowedRoles={['ADMIN', 'FPS_OPERATOR']} />}>
              <Route path="fps-distribution" element={<FpsDistributionPage />} />
            </Route>

            {/* Protected routes: Administrator only */}
            <Route element={<ProtectedRoute allowedRoles={['ADMIN']} />}>
              <Route path="admin/staff-requests" element={<AdminStaffRequestsPage />} />
              <Route path="admin/users" element={<AdminUsersPage />} />
              <Route path="admin/audit-events" element={<AdminAuditEventsPage />} />
            </Route>

            {/* Catch-all 404 */}
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
      </AuthProvider>
    </ErrorBoundary>
  );
}
