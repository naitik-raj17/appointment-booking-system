import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { homePathFor, useAuth } from '../../context/AuthContext';
import type { Role } from '../../types';
import { PageLoader } from '../ui';

/** Renders children only for authenticated users with one of the allowed roles. */
export function RequireAuth({ roles, children }: { roles?: Role[]; children: ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <PageLoader />;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  if (roles && !roles.includes(user.role)) return <Navigate to={homePathFor(user.role)} replace />;
  return <>{children}</>;
}

/** Redirects signed-in users away from login/register. */
export function GuestOnly({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <PageLoader />;
  if (user) return <Navigate to={homePathFor(user.role)} replace />;
  return <>{children}</>;
}
