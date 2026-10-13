import { useState } from 'react';
import {
  Activity,
  Award,
  Boxes,
  FileCheck2,
  FileText,
  History,
  Home,
  LogIn,
  LogOut,
  Menu,
  Package,
  ShieldCheck,
  Store,
  User,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { StatusBadge } from '../ui/StatusBadge';

export function AppShell() {
  const { user, isAuthenticated, logout, isAdmin, hasRole } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isWarehouseManager = hasRole('WAREHOUSE_MANAGER') || isAdmin;
  const isFpsOperator = hasRole('FPS_OPERATOR') || isAdmin;

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 text-slate-900">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <Link to="/" className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-md bg-slate-900 text-sky-400">
                <Boxes className="h-5 w-5" aria-hidden="true" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-base font-bold tracking-tight text-slate-900">
                    PDSChain v2
                  </span>
                  <StatusBadge status="neutral" label="Phase 2 RBAC" />
                </div>
                <p className="text-xs text-slate-600 hidden sm:block">
                  Blockchain Public Distribution System & Access Governance
                </p>
              </div>
            </Link>
          </div>

          {/* Desktop Nav */}
          <nav aria-label="Primary navigation" className="hidden items-center gap-1 lg:flex">
            <NavLink
              to="/"
              end
              className={({ isActive }) =>
                `inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                  isActive ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-slate-100'
                }`
              }
            >
              <Home className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Overview</span>
            </NavLink>

            <NavLink
              to="/status"
              className={({ isActive }) =>
                `inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                  isActive ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-slate-100'
                }`
              }
            >
              <Activity className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Service Status</span>
            </NavLink>

            {isAuthenticated ? (
              <>
                <NavLink
                  to="/profile"
                  className={({ isActive }) =>
                    `inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                      isActive ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-slate-100'
                    }`
                  }
                >
                  <User className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>My Profile</span>
                </NavLink>

                <NavLink
                  to="/staff-requests/new"
                  className={({ isActive }) =>
                    `inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                      isActive ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-slate-100'
                    }`
                  }
                >
                  <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Request Staff Access</span>
                </NavLink>

                {isWarehouseManager ? (
                  <NavLink
                    to="/warehouse-inventory"
                    className={({ isActive }) =>
                      `inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                        isActive ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-slate-100'
                      }`
                    }
                  >
                    <Package className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Warehouse</span>
                  </NavLink>
                ) : null}

                {isFpsOperator ? (
                  <NavLink
                    to="/fps-distribution"
                    className={({ isActive }) =>
                      `inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                        isActive ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-slate-100'
                      }`
                    }
                  >
                    <Store className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>FPS Dispense</span>
                  </NavLink>
                ) : null}

                <NavLink
                  to="/beneficiary-entitlements"
                  className={({ isActive }) =>
                    `inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                      isActive ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-slate-100'
                    }`
                  }
                >
                  <Award className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Ration Quota</span>
                </NavLink>

                <NavLink
                  to="/distribution-ledger"
                  className={({ isActive }) =>
                    `inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                      isActive ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-slate-100'
                    }`
                  }
                >
                  <History className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Ledger</span>
                </NavLink>

                {isAdmin ? (
                  <>
                    <NavLink
                      to="/admin/staff-requests"
                      className={({ isActive }) =>
                        `inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                          isActive ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-slate-100'
                        }`
                      }
                    >
                      <FileCheck2 className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>Review Queue</span>
                    </NavLink>

                    <NavLink
                      to="/admin/users"
                      className={({ isActive }) =>
                        `inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                          isActive ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-slate-100'
                        }`
                      }
                    >
                      <Users className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>User Management</span>
                    </NavLink>

                    <NavLink
                      to="/admin/audit-events"
                      className={({ isActive }) =>
                        `inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                          isActive ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-slate-100'
                        }`
                      }
                    >
                      <FileText className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>Audit Trail</span>
                    </NavLink>
                  </>
                ) : null}
              </>
            ) : null}
          </nav>

          {/* User Section / Auth Buttons */}
          <div className="hidden items-center gap-2 sm:flex">
            {isAuthenticated && user ? (
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <div className="flex items-center gap-1.5 justify-end">
                    <span className="text-xs font-bold text-slate-900">{user.fullName}</span>
                    <span className="rounded bg-slate-900 px-1.5 py-0.5 text-[10px] font-bold text-white">
                      {user.roles[0]}
                    </span>
                  </div>
                  <span className="text-[11px] font-mono text-slate-500">{user.email}</span>
                </div>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-slate-900"
                >
                  <LogOut className="h-3.5 w-3.5 text-slate-500" aria-hidden="true" />
                  Sign Out
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  to="/login"
                  className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  <LogIn className="h-3.5 w-3.5 text-slate-500" aria-hidden="true" />
                  Sign In
                </Link>
                <Link
                  to="/register"
                  className="inline-flex items-center gap-1.5 rounded-md bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800"
                >
                  <UserPlus className="h-3.5 w-3.5" aria-hidden="true" />
                  Register Citizen
                </Link>
              </div>
            )}
          </div>

          {/* Mobile menu trigger */}
          <div className="flex items-center lg:hidden">
            <button
              type="button"
              aria-expanded={mobileMenuOpen}
              aria-label="Toggle navigation menu"
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              className="inline-flex items-center justify-center rounded-md border border-slate-300 p-2 text-slate-700 hover:bg-slate-100"
            >
              {mobileMenuOpen ? (
                <X className="h-5 w-5" aria-hidden="true" />
              ) : (
                <Menu className="h-5 w-5" aria-hidden="true" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen ? (
          <nav
            aria-label="Mobile navigation"
            className="border-t border-slate-200 bg-white px-4 py-3 lg:hidden space-y-2"
          >
            <div className="flex flex-col space-y-1">
              <NavLink
                to="/"
                end
                onClick={() => setMobileMenuOpen(false)}
                className="rounded px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100"
              >
                Overview
              </NavLink>
              <NavLink
                to="/status"
                onClick={() => setMobileMenuOpen(false)}
                className="rounded px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100"
              >
                Service Status
              </NavLink>

              {isAuthenticated ? (
                <>
                  <NavLink
                    to="/profile"
                    onClick={() => setMobileMenuOpen(false)}
                    className="rounded px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                  >
                    My Profile
                  </NavLink>
                  <NavLink
                    to="/staff-requests/new"
                    onClick={() => setMobileMenuOpen(false)}
                    className="rounded px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                  >
                    Request Staff Access
                  </NavLink>
                  {isWarehouseManager ? (
                    <NavLink
                      to="/warehouse-inventory"
                      onClick={() => setMobileMenuOpen(false)}
                      className="rounded px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                    >
                      Warehouse Inventory
                    </NavLink>
                  ) : null}
                  {isFpsOperator ? (
                    <NavLink
                      to="/fps-distribution"
                      onClick={() => setMobileMenuOpen(false)}
                      className="rounded px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                    >
                      FPS Distribution
                    </NavLink>
                  ) : null}
                  <NavLink
                    to="/beneficiary-entitlements"
                    onClick={() => setMobileMenuOpen(false)}
                    className="rounded px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                  >
                    Ration Quota
                  </NavLink>
                  <NavLink
                    to="/distribution-ledger"
                    onClick={() => setMobileMenuOpen(false)}
                    className="rounded px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                  >
                    On-Chain Ledger
                  </NavLink>
                  {isAdmin ? (
                    <>
                      <NavLink
                        to="/admin/staff-requests"
                        onClick={() => setMobileMenuOpen(false)}
                        className="rounded px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                      >
                        Review Queue
                      </NavLink>
                      <NavLink
                        to="/admin/users"
                        onClick={() => setMobileMenuOpen(false)}
                        className="rounded px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                      >
                        User Management
                      </NavLink>
                      <NavLink
                        to="/admin/audit-events"
                        onClick={() => setMobileMenuOpen(false)}
                        className="rounded px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                      >
                        Audit Trail
                      </NavLink>
                    </>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      void handleLogout();
                    }}
                    className="text-left rounded px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50"
                  >
                    Sign Out
                  </button>
                </>
              ) : (
                <>
                  <Link
                    to="/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="rounded px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                  >
                    Sign In
                  </Link>
                  <Link
                    to="/register"
                    onClick={() => setMobileMenuOpen(false)}
                    className="rounded px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                  >
                    Register Citizen
                  </Link>
                </>
              )}
            </div>
          </nav>
        ) : null}
      </header>

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 lg:px-8">
        <Outlet />
      </main>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-2 px-4 py-4 text-xs text-slate-600 sm:flex-row sm:items-center sm:px-6 lg:px-8">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-slate-700" aria-hidden="true" />
            <span>
              PDSChain v2 — Blockchain-Assisted Public Distribution System with Strict Role-Based
              Access Control.
            </span>
          </div>
          <span className="font-mono text-slate-500">v0.2.0 • Phase 2 Verified</span>
        </div>
      </footer>
    </div>
  );
}
