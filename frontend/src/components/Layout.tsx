import { ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getCurrentUser, logout, UserRole } from "@/lib/auth";
import { Building2, LogOut, User, ChevronDown } from "lucide-react";

interface LayoutProps {
  children: ReactNode;
}

const roleLabels: Record<UserRole, string> = {
  admin: "Administrator",
  pi: "Principal Investigator",
  ar: "Assistant Registrar",
  dr: "Deputy Registrar",
  ao2: "Accounts Officer (AO2)",
  ao1: "Accounts Officer (AO1)",
  hod: "Head of Department",
};

export const Layout = ({ children }: LayoutProps) => {
  const navigate = useNavigate();
  const user = getCurrentUser();

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  if (!user) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-gradient-mesh">
      {/* Enhanced Header with Glassmorphism */}
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-card/80 backdrop-blur-xl supports-[backdrop-filter]:bg-card/60 shadow-sm">
        <div className="container flex h-16 items-center justify-between">
          {/* Logo Section */}
          <Link
            to={`/${user.role}`}
            className="flex items-center gap-3 group transition-all duration-200 hover:scale-105"
          >
            <div className="p-2 rounded-xl bg-gradient-primary shadow-glow group-hover:shadow-glow-accent transition-all duration-300">
              <Building2 className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                IFMS
              </h1>
              <p className="text-xs text-muted-foreground leading-none">Financial Management</p>
            </div>
          </Link>

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="gap-2 border-2 hover:border-primary hover:shadow-glow transition-all duration-200 bg-card/50 backdrop-blur-sm"
              >
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-gradient-primary flex items-center justify-center">
                    <User className="h-4 w-4 text-white" />
                  </div>
                  <span className="font-semibold">{user.name}</span>
                  <ChevronDown className="h-4 w-4 opacity-50" />
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="w-64 bg-card/95 backdrop-blur-xl border-2 shadow-elevated animate-scale-in"
            >
              <DropdownMenuLabel>
                <div className="flex flex-col space-y-2 p-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-primary flex items-center justify-center shadow-glow">
                      <User className="h-5 w-5 text-white" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-bold text-foreground">{user.name}</p>
                      <p className="text-xs text-muted-foreground">{user.email}</p>
                    </div>
                  </div>
                  <div className="px-2 py-1.5 rounded-lg bg-primary/10 border border-primary/20">
                    <p className="text-xs font-bold text-primary">
                      {roleLabels[user.role]}
                    </p>
                  </div>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleLogout}
                className="text-destructive focus:text-destructive focus:bg-destructive/10 cursor-pointer"
              >
                <LogOut className="mr-2 h-4 w-4" />
                <span className="font-semibold">Logout</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Main Content with Animation */}
      <main className="container py-8 animate-fade-in">
        {children}
      </main>
    </div>
  );
};
