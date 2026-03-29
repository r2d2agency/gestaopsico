import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Skeleton } from "@/components/ui/skeleton";

interface Props {
  children: React.ReactNode;
  requiredRole?: string;
  allowedRoles?: string[];
}

export default function ProtectedRoute({ children, requiredRole, allowedRoles }: Props) {
  const { user, isLoading, token } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="space-y-4 w-80">
          <Skeleton className="h-8 w-48 mx-auto" />
          <Skeleton className="h-4 w-64 mx-auto" />
          <Skeleton className="h-32 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  if (!token || !user) {
    return <Navigate to="/login" replace />;
  }

  // Check required role
  if (requiredRole && user.role !== requiredRole && user.role !== "superadmin") {
    const fallback = user.role === "patient" ? "/login" : "/dashboard";
    return <Navigate to={fallback} replace />;
  }

  // Check allowed roles list (secretary_financial matches both secretary and financial)
  if (allowedRoles && allowedRoles.length > 0) {
    const userRoles = user.role === "secretary_financial" ? ["secretary_financial", "secretary", "financial"] : [user.role];
    const hasAccess = userRoles.some(r => allowedRoles.includes(r)) || user.role === "superadmin";
    if (!hasAccess) {
      const fallback = user.role === "patient" ? "/login" : "/dashboard";
      return <Navigate to={fallback} replace />;
    }
  }

  return <>{children}</>;
}
