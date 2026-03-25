import { Layout } from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import {
  Building2,
  Users,
  FolderKanban,
  FileText,
  TrendingUp,
  DollarSign,
  Clock,

} from "lucide-react";

const AdminDashboard = () => {
  const navigate = useNavigate();

  const stats = [
    {
      title: "Total Projects",
      value: "24",
      icon: FolderKanban,
      description: "+3 this month",
      color: "text-primary",
    },
    {
      title: "Active PIs",
      value: "18",
      icon: Users,
      description: "Across 5 departments",
      color: "text-accent",
    },
    {
      title: "Sanctioned Amount",
      value: "₹45.2M",
      icon: DollarSign,
      description: "+12% from last quarter",
      color: "text-success",
    },
    
  ];

  const quickActions = [
    {
      title: "Create Project",
      description: "Register a new research project and assign GP number",
      icon: FolderKanban,
      path: "/admin/create-project",
    },
   
    {
      title: "Manage Projects",
      description: "View and manage all projects",
      icon: FileText,
      path: "/admin/projects",
    },
    {
      title: "Create Project Heads",
      description: "Manage recurring and non-recurring heads",
      icon: TrendingUp,
      path: "/admin/project-heads",
    },
   
  ];

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Admin Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Manage departments, PIs, projects, and fund releases
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat, index) => (
            <Card key={index}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <p className="text-xs text-muted-foreground mt-1">{stat.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {quickActions.map((action, index) => (
              <Card
                key={index}
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => navigate(action.path)}
              >
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <action.icon className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-base">{action.title}</CardTitle>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <CardDescription>{action.description}</CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default AdminDashboard;