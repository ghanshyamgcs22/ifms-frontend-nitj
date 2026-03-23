// pages/Login.tsx — updated with new DRC roles in demo credentials panel

import { useState, Fragment } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { login } from "@/lib/auth";
import { toast } from "sonner";
import { Building2, Lock, Mail, Sparkles } from "lucide-react";

// Role → route mapping for redirect after login
const ROLE_ROUTES: Record<string, string> = {
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

const DEMO_USERS = [
  { role: "Admin",        email: "admin@ifms.edu" },
  { role: "PI",           email: "pi@ifms.edu" },
  { role: "DA",           email: "da@ifms.edu" },
  { role: "AR",           email: "ar@ifms.edu" },
  { role: "DR",           email: "dr@ifms.edu" },
  { role: "DRC Office",   email: "drc.office@ifms.edu" },
  { role: "DRC (R&C)",    email: "drc.rc@ifms.edu" },
  { role: "DRC",          email: "drc@ifms.edu" },
  { role: "Director",     email: "director@ifms.edu" },
];

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const user = login(email, password);
      if (user) {
        toast.success(`Welcome, ${user.name}!`);
        const route = ROLE_ROUTES[user.role] ?? `/${user.role}`;
        navigate(route);
      } else {
        toast.error("Invalid credentials. Check the demo credentials panel below.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center gradient-mesh p-4 animate-gradient relative overflow-hidden">
      {/* Background blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-20 w-72 h-72 bg-primary/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-accent/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
      </div>

      <div className="w-full max-w-md relative z-10 animate-fade-in">
        {/* Logo + title */}
        <div className="text-center mb-8 animate-slide-up">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-primary mb-4 shadow-glow hover:scale-110 transition-transform duration-300">
            <Building2 className="h-10 w-10 text-white" />
          </div>
          <h1 className="text-4xl font-bold gradient-text mb-2">IFMS</h1>
          <p className="text-muted-foreground">Institute Financial Management System</p>
        </div>

        <Card className="shadow-elevated backdrop-blur-sm bg-card/95 border-2 hover:shadow-glow transition-all duration-300 animate-scale-in">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold">Welcome Back</CardTitle>
            <CardDescription>Enter your credentials to access the system</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-5">
              {/* Email */}
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-semibold">Email</Label>
                <div className="relative group">
                  <Mail className="absolute left-3 top-3 h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-colors duration-200" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="your.email@ifms.edu"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-11 h-11 border-2 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200"
                    required
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-semibold">Password</Label>
                <div className="relative group">
                  <Lock className="absolute left-3 top-3 h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-colors duration-200" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-11 h-11 border-2 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200"
                    required
                  />
                </div>
              </div>

              {/* Submit */}
              <Button
                type="submit"
                className="w-full h-11 font-semibold bg-gradient-primary hover:shadow-glow transition-all duration-300 hover:scale-[1.02]"
                disabled={loading}
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    Signing in...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4" />
                    Sign In
                  </span>
                )}
              </Button>

              {/* ── Demo Credentials ── */}
              <div className="mt-6 p-4 bg-gradient-to-br from-muted/50 to-muted rounded-xl border border-border/50 backdrop-blur-sm">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></div>
                  <p className="text-sm font-bold text-foreground">Demo Credentials</p>
                </div>

                {/* Two-column role/email grid */}
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs mb-3">
                  <span className="font-semibold text-muted-foreground">Role</span>
                  <span className="font-semibold text-muted-foreground">Email</span>
                  {DEMO_USERS.map(u => (
                    <Fragment key={u.role}>
                      <span className="text-foreground">{u.role}</span>
                      <button
                        type="button"
                        className="text-primary hover:underline text-left truncate"
                        onClick={() => setEmail(u.email)}
                        title={`Click to fill ${u.email}`}
                      >
                        {u.email}
                      </button>
                    </Fragment>
                  ))}
                </div>

                {/* Divider + approval flow legend */}
                <div className="pt-3 border-t border-border/50 space-y-2">
                  <p className="text-xs">
                    <span className="font-semibold text-muted-foreground">Password (all users): </span>
                    <span className="font-mono text-foreground">password123</span>
                  </p>
                  <div className="text-[10px] text-muted-foreground space-y-0.5 leading-relaxed">
                    <p className="font-semibold text-foreground/70">Approval Flows:</p>
                    <p>
                      <span className="text-emerald-600 font-medium">≤ ₹25k:</span>{" "}
                      DA → AR → DR
                    </p>
                    <p>
                      <span className="text-violet-600 font-medium">&gt; ₹25k:</span>{" "}
                      DA → AR → DR → DRC Office → DRC (R&C) → DRC → Director
                    </p>
                  </div>
                </div>
              </div>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-sm text-muted-foreground mt-6">
          Secure financial management for educational institutions
        </p>
      </div>
    </div>
  );
};

export default Login;