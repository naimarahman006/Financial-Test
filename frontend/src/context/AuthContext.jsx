import { useAuthState } from "react-firebase-hooks/auth";
import { Navigate, useLocation } from "react-router-dom";
import auth from "../firebase/firebase.init";

export default function ProtectedRoute({ children }) {
  const [user, loading] = useAuthState(auth);
  const location = useLocation();

  if (loading) return <p>Loading...</p>;

  // If no user → send to landing page '/'
  if (!user) return <Navigate to="/" replace state={{ from: location }} />;

  return children;
}
