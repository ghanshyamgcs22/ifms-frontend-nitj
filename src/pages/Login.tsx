import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { login } from "@/lib/auth";
import { toast } from "sonner";
import { Building2, Lock, Mail, Sparkles } from "lucide-react";

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
        navigate(`/${user.role}`);
      } else {
        toast.error("Invalid credentials. Try: admin@ifms.edu / password123");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center gradient-mesh p-4 animate-gradient relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-20 w-72 h-72 bg-primary/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-accent/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
      </div>

      <div className="w-full max-w-md relative z-10 animate-fade-in">
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

              {/* Demo Credentials — updated to show DA / AR / DR */}
              <div className="mt-6 p-4 bg-gradient-to-br from-muted/50 to-muted rounded-xl border border-border/50 backdrop-blur-sm">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></div>
                  <p className="text-sm font-bold text-foreground">Demo Credentials</p>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="space-y-1">
                    <p className="font-semibold text-muted-foreground">Roles:</p>
                    <p className="text-foreground">Admin</p>
                    <p className="text-foreground">PI</p>
                    <p className="text-foreground">DA / AR / DR</p>
                  </div>
                  <div className="space-y-1">
                    <p className="font-semibold text-muted-foreground">Access:</p>
                    <p className="text-foreground">admin@ifms.edu</p>
                    <p className="text-foreground">pi@ifms.edu</p>
                    <p className="text-foreground">[role]@ifms.edu</p>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-border/50">
                  <p className="text-xs">
                    <span className="font-semibold text-muted-foreground">Password:</span>{" "}
                    <span className="font-mono text-foreground">password123</span>
                  </p>
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
