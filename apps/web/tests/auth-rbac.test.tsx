import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { App } from '../src/App';
import { ApiClientError, apiClient } from '../src/lib/api-client';
import { AuthenticatedPrincipal } from '../src/types/auth';

const routerFutureFlags = {
  v7_startTransition: true,
  v7_relativeSplatPath: true,
};

const mockCitizenUser: AuthenticatedPrincipal = {
  userId: 'usr-cit-001',
  sessionId: 'sess-001',
  email: 'citizen@pdschain.local',
  fullName: 'Priya Sharma',
  status: 'ACTIVE',
  emailVerified: true,
  emailVerifiedAt: '2026-10-13T00:00:00.000Z',
  roles: ['CITIZEN'],
  assignments: [],
};

const mockAdminUser: AuthenticatedPrincipal = {
  userId: 'usr-adm-001',
  sessionId: 'sess-adm-001',
  email: 'admin@pdschain.local',
  fullName: 'System Administrator',
  status: 'ACTIVE',
  emailVerified: true,
  emailVerifiedAt: '2026-10-13T00:00:00.000Z',
  roles: ['ADMIN'],
  assignments: [],
};

describe('PDSChain v2 Auth & RBAC Frontend Unit Tests', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it('renders login page and allows signing in with valid credentials', async () => {
    vi.spyOn(apiClient, 'getCurrentUser').mockRejectedValue(new Error('unauthenticated'));
    vi.spyOn(apiClient, 'login').mockResolvedValue({
      status: 'success',
      user: mockCitizenUser,
      csrfToken: 'mock-csrf-token',
      expiresAt: new Date(Date.now() + 3600000).toISOString(),
    });

    const user = userEvent.setup();

    render(
      <MemoryRouter initialEntries={['/login']} future={routerFutureFlags}>
        <App />
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { name: /Sign In to PDSChain v2/i })).toBeInTheDocument();

    const emailInput = screen.getByLabelText(/Email Address/i);
    const passwordInput = screen.getByLabelText(/Password/i);
    const submitBtn = screen.getByRole('button', { name: /^Sign In$/i });

    await user.type(emailInput, 'citizen@pdschain.local');
    await user.type(passwordInput, 'PriyaSecure2026!');
    await user.click(submitBtn);

    expect(apiClient.login).toHaveBeenCalledWith({
      email: 'citizen@pdschain.local',
      password: 'PriyaSecure2026!',
    });
  });

  it('displays API error message on invalid credentials login attempt', async () => {
    vi.spyOn(apiClient, 'getCurrentUser').mockRejectedValue(new Error('unauthenticated'));
    vi.spyOn(apiClient, 'login').mockRejectedValue(
      new ApiClientError({
        message: 'Invalid email or password credentials provided.',
        statusCode: 401,
        code: 'INVALID_CREDENTIALS',
      }),
    );

    const user = userEvent.setup();

    render(
      <MemoryRouter initialEntries={['/login']} future={routerFutureFlags}>
        <App />
      </MemoryRouter>,
    );

    const emailInput = screen.getByLabelText(/Email Address/i);
    const passwordInput = screen.getByLabelText(/Password/i);
    const submitBtn = screen.getByRole('button', { name: /^Sign In$/i });

    await user.type(emailInput, 'wrong@example.com');
    await user.type(passwordInput, 'WrongPass123!');
    await user.click(submitBtn);

    await waitFor(() => {
      expect(
        screen.getByText(/Invalid email or password credentials provided/i),
      ).toBeInTheDocument();
    });
  });

  it('redirects unauthenticated users trying to access protected /profile to /login', async () => {
    vi.spyOn(apiClient, 'getCurrentUser').mockRejectedValue(new Error('unauthenticated'));

    render(
      <MemoryRouter initialEntries={['/profile']} future={routerFutureFlags}>
        <App />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Sign In to PDSChain v2/i })).toBeInTheDocument();
    });
  });

  it('redirects non-admin citizen attempting to access /admin/users to /unauthorized (403)', async () => {
    localStorage.setItem('pdschain_auth_active', 'true');
    vi.spyOn(apiClient, 'getCurrentUser').mockResolvedValue({
      status: 'success',
      user: mockCitizenUser,
      csrfToken: 'csrf-123',
    });

    render(
      <MemoryRouter initialEntries={['/admin/users']} future={routerFutureFlags}>
        <App />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText(/403 — Access Denied/i)).toBeInTheDocument();
      expect(screen.getByText(/Role-Based Access Policy Enforced/i)).toBeInTheDocument();
    });
  });

  it('allows authenticated ADMIN to view /admin/users management dashboard', async () => {
    localStorage.setItem('pdschain_auth_active', 'true');
    vi.spyOn(apiClient, 'getCurrentUser').mockResolvedValue({
      status: 'success',
      user: mockAdminUser,
      csrfToken: 'csrf-123',
    });
    vi.spyOn(apiClient, 'listUsers').mockResolvedValue([
      {
        id: 'usr-cit-001',
        email: 'citizen@pdschain.local',
        fullName: 'Priya Sharma',
        status: 'ACTIVE',
        emailVerified: true,
        roles: ['CITIZEN'],
        assignmentsCount: 0,
        createdAt: '2026-10-13T00:00:00.000Z',
      },
      {
        id: 'usr-adm-001',
        email: 'admin@pdschain.local',
        fullName: 'System Administrator',
        status: 'ACTIVE',
        emailVerified: true,
        roles: ['ADMIN'],
        assignmentsCount: 1,
        createdAt: '2026-10-13T00:00:00.000Z',
      },
    ]);

    render(
      <MemoryRouter initialEntries={['/admin/users']} future={routerFutureFlags}>
        <App />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: /User & Access Management/i }),
      ).toBeInTheDocument();
    });

    expect(screen.getByText('citizen@pdschain.local')).toBeInTheDocument();
    expect(screen.getAllByText('admin@pdschain.local').length).toBeGreaterThanOrEqual(1);
  });

  it('validates registration form client-side: password mismatch prevent submission', async () => {
    vi.spyOn(apiClient, 'getCurrentUser').mockRejectedValue(new Error('unauthenticated'));
    const registerSpy = vi.spyOn(apiClient, 'registerCitizen');

    const user = userEvent.setup();

    render(
      <MemoryRouter initialEntries={['/register']} future={routerFutureFlags}>
        <App />
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { name: /Citizen Registration/i })).toBeInTheDocument();

    await user.type(screen.getByLabelText(/Full Name/i), 'Ramesh Kumar');
    await user.type(screen.getByLabelText(/Email Address/i), 'ramesh@example.com');
    await user.type(screen.getByLabelText(/Password \(min 10/i), 'SuperSecurePass123!');
    await user.type(screen.getByLabelText(/Confirm Password/i), 'DifferentPassword456!');
    await user.click(screen.getByRole('checkbox'));

    await user.click(screen.getByRole('button', { name: /Register as Citizen/i }));

    expect(registerSpy).not.toHaveBeenCalled();
    expect(screen.getByText(/Passwords do not match/i)).toBeInTheDocument();
  });

  it('renders verify email page and submits verification token', async () => {
    vi.spyOn(apiClient, 'getCurrentUser').mockRejectedValue(new Error('unauthenticated'));
    vi.spyOn(apiClient, 'verifyEmail').mockResolvedValue({
      status: 'success',
      message: 'Email address has been successfully verified.',
    });

    render(
      <MemoryRouter
        initialEntries={['/verify-email?token=test-verify-token-123']}
        future={routerFutureFlags}
      >
        <App />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(apiClient.verifyEmail).toHaveBeenCalledWith('test-verify-token-123');
      expect(screen.getByText(/Email Verified Successfully/i)).toBeInTheDocument();
    });
  });

  it('renders forgot password page and sends reset email instruction', async () => {
    vi.spyOn(apiClient, 'getCurrentUser').mockRejectedValue(new Error('unauthenticated'));
    vi.spyOn(apiClient, 'forgotPassword').mockResolvedValue({
      status: 'success',
      message: 'If an account exists with that email, a password reset link has been dispatched.',
    });

    const user = userEvent.setup();

    render(
      <MemoryRouter initialEntries={['/forgot-password']} future={routerFutureFlags}>
        <App />
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { name: /Reset Password/i })).toBeInTheDocument();

    await user.type(screen.getByLabelText(/Account Email Address/i), 'user@example.com');
    await user.click(screen.getByRole('button', { name: /Send Reset Link/i }));

    expect(apiClient.forgotPassword).toHaveBeenCalledWith('user@example.com');
  });
});
