import { Navigate, Outlet } from "react-router-dom";
import { useAuthStore } from "../../stores/authStore";

export default function ProtectedRoute({ allowedRoles }) {
  const { user, profile, loading } = useAuthStore();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  if (allowedRoles && !allowedRoles.includes(profile?.role)) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}