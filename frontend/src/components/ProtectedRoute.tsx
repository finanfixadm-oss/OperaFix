import type { PropsWithChildren } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { defaultPathForUser, getCurrentUser, hasRole, type UserRole } from "../auth";

export default function ProtectedRoute({
  roles,
  children,
}: PropsWithChildren<{ roles?: UserRole[] }>) {
  const user = getCurrentUser();
  const location = useLocation();
  const token = localStorage.getItem("token");

  if (!token || !user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (roles && !hasRole(user, roles)) {
    return <Navigate to={defaultPathForUser(user)} replace />;
  }

  return <>{children}</>;
}
