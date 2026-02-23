import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { getCurrentUser } from "@/lib/auth";
import Login from "./pages/Login";
import AdminDashboard from "./pages/admin/Dashboard";
import Departments from "./pages/admin/Departments";
import RegisterPI from "./pages/admin/RegisterPI";
import CreateProject from "./pages/pi/CreateProject";
import Projects from "./pages/admin/Projects";

import ProjectHeads from "./pages/admin/ProjectHeads";

import PIDashboard from "./pages/pi/Dashboard";
import BookBudget from "./pages/pi/BookBudget";
import ARDashboard from "./pages/approvals/ARDashboard";
import DRDashboard from "./pages/approvals/DRDashboard";
import DADashboard from "./pages/approvals/DADashboard";

import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const ProtectedRoute = ({ children, allowedRoles }: { children: React.ReactNode; allowedRoles: string[] }) => {
  const user = getCurrentUser();

  if (!user) {
    return <Navigate to="/" replace />;
  }

  if (!allowedRoles.includes(user.role)) {
    return <Navigate to={`/${user.role}`} replace />;
  }

  return <>{children}</>;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Login />} />
          <Route
            path="/admin"
            element={
              <ProtectedRoute allowedRoles={["admin"]}>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/departments"
            element={
              <ProtectedRoute allowedRoles={["admin"]}>
                <Departments />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/register-pi"
            element={
              <ProtectedRoute allowedRoles={["admin"]}>
                <RegisterPI />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/create-project"
            element={
              <ProtectedRoute allowedRoles={["admin"]}>
                <CreateProject />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/projects"
            element={
              <ProtectedRoute allowedRoles={["admin"]}>
                <Projects />
              </ProtectedRoute>
            }
          />
         
          <Route
            path="/admin/project-heads"
            element={
              <ProtectedRoute allowedRoles={["admin"]}>
                <ProjectHeads />
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/pi"
            element={
              <ProtectedRoute allowedRoles={["pi"]}>
                <PIDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/pi/book-budget"
            element={
              <ProtectedRoute allowedRoles={["pi"]}>
                <BookBudget />
              </ProtectedRoute>
            }
          />
          <Route
            path="/ar"
            element={
              <ProtectedRoute allowedRoles={["ar"]}>
                <ARDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dr"
            element={
              <ProtectedRoute allowedRoles={["dr"]}>
                <DRDashboard />
              </ProtectedRoute>
            }
          />
         <Route
  path="/da"
  element={
    <ProtectedRoute allowedRoles={["da"]}>
      <DADashboard />
    </ProtectedRoute>
  }
/>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
