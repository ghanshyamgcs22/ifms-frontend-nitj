// App.tsx — full routing with corrected DRC chain
//
// ≤ ₹25k:  DA → AR → DR (final approve)
// > ₹25k:  DA → AR → DR → DRC Office → DRC (R&C) → DRC → Director (final approve)

import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { getCurrentUser } from "@/lib/auth";

// ── Pages ──────────────────────────────────────────────────────────────────────
import Login                from "./pages/Login";
import AdminDashboard       from "./pages/admin/Dashboard";
import Departments          from "./pages/admin/Departments";
import RegisterPI           from "./pages/admin/RegisterPI";
import CreateProject        from "./pages/pi/CreateProject";
import Projects             from "./pages/admin/Projects";
import ProjectHeads         from "./pages/admin/ProjectHeads";
import PIDashboard          from "./pages/pi/Dashboard";
import BookBudget           from "./pages/pi/BookBudget";
import QueryResponsePage    from "./pages/pi/QueryResponsePage";

// Approval chain — ≤ ₹25k
import DADashboard          from "./pages/approvals/DADashboard";
import ARDashboard          from "./pages/approvals/ARDashboard";
import DRDashboard          from "./pages/approvals/DRDashboard";

// Approval chain — > ₹25k (DRC chain)
import DRCOfficeDashboard   from "./pages/approvals/DRCOfficeDashboard";
import DRCRCDashboard       from "./pages/approvals/DRCRCDashboard";
import DRCDashboard         from "./pages/approvals/DRCDashboard";
import DirectorDashboard    from "./pages/approvals/DirectorDashboard";

// Approval Certificate (accessible to all approval roles)
import ApprovalCertificate  from "./pages/approvals/ApprovalCertificate";

import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const ROLE_HOME: Record<string, string> = {
  admin:      "/admin",
  pi:         "/pi",
  da:         "/da",
  ar:         "/ar",
  dr:         "/dr",
  drc_office: "/drc-office",
  drc_rc:     "/drc-rc",
  drc:        "/drc",
  director:   "/director",
};

const APPROVAL_ROLES = ["da", "ar", "dr", "drc_office", "drc_rc", "drc", "director"];

const ProtectedRoute = ({
  children,
  allowedRoles,
}: {
  children: React.ReactNode;
  allowedRoles: string[];
}) => {
  const user = getCurrentUser();
  if (!user) return <Navigate to="/" replace />;
  if (!allowedRoles.includes(user.role)) {
    return <Navigate to={ROLE_HOME[user.role] ?? "/"} replace />;
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

          {/* ── Admin ──────────────────────────────────────────────────────── */}
          <Route path="/admin"                element={<ProtectedRoute allowedRoles={["admin"]}><AdminDashboard /></ProtectedRoute>} />
          <Route path="/admin/departments"    element={<ProtectedRoute allowedRoles={["admin"]}><Departments /></ProtectedRoute>} />
          <Route path="/admin/register-pi"    element={<ProtectedRoute allowedRoles={["admin"]}><RegisterPI /></ProtectedRoute>} />
          <Route path="/admin/create-project" element={<ProtectedRoute allowedRoles={["admin"]}><CreateProject /></ProtectedRoute>} />
          <Route path="/admin/projects"       element={<ProtectedRoute allowedRoles={["admin"]}><Projects /></ProtectedRoute>} />
          <Route path="/admin/project-heads"  element={<ProtectedRoute allowedRoles={["admin"]}><ProjectHeads /></ProtectedRoute>} />

          {/* ── PI ─────────────────────────────────────────────────────────── */}
          <Route path="/pi"                   element={<ProtectedRoute allowedRoles={["pi"]}><PIDashboard /></ProtectedRoute>} />
          <Route path="/pi/book-budget"       element={<ProtectedRoute allowedRoles={["pi"]}><BookBudget /></ProtectedRoute>} />
          <Route path="/pi/query/:requestId"  element={<ProtectedRoute allowedRoles={["pi"]}><QueryResponsePage /></ProtectedRoute>} />

          {/* ── Approval chain ≤ ₹25k ──────────────────────────────────────── */}
          <Route path="/da" element={<ProtectedRoute allowedRoles={["da"]}><DADashboard /></ProtectedRoute>} />
          <Route path="/ar" element={<ProtectedRoute allowedRoles={["ar"]}><ARDashboard /></ProtectedRoute>} />
          <Route path="/dr" element={<ProtectedRoute allowedRoles={["dr"]}><DRDashboard /></ProtectedRoute>} />

          {/* ── Approval chain > ₹25k (DRC chain) ─────────────────────────── */}
          <Route path="/drc-office" element={<ProtectedRoute allowedRoles={["drc_office"]}><DRCOfficeDashboard /></ProtectedRoute>} />
          <Route path="/drc-rc"     element={<ProtectedRoute allowedRoles={["drc_rc"]}><DRCRCDashboard /></ProtectedRoute>} />
          <Route path="/drc"        element={<ProtectedRoute allowedRoles={["drc"]}><DRCDashboard /></ProtectedRoute>} />
          <Route path="/director"   element={<ProtectedRoute allowedRoles={["director"]}><DirectorDashboard /></ProtectedRoute>} />

          {/* ── Approval Certificate (all approval roles + pi) ─────────────── */}
          <Route
            path="/approval-certificate/:requestId"
            element={
              <ProtectedRoute allowedRoles={[...APPROVAL_ROLES, "pi"]}>
                <ApprovalCertificate />
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
