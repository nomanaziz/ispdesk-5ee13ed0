import { Navigate } from "react-router-dom";

// Deprecated — unified login at /login handles all user types
const PortalLogin = () => <Navigate to="/login" replace />;

export default PortalLogin;
