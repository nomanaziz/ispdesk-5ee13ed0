import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex min-h-screen items-center justify-center"><span className="text-muted-foreground">Loading...</span></div>;
  if (!user) return <Navigate to="/landing" replace />;
  return <>{children}</>;
};

export default ProtectedRoute;
