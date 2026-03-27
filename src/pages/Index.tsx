import { Navigate } from "react-router-dom";
import { getCurrentUser } from "@/lib/auth";

const Index = () => {
  const user = getCurrentUser();
  
  if (user) {
    return <Navigate to={`/${user.role}`} replace />;
  }
  
  return <Navigate to="/" replace />;
};

export default Index;
