import { Layout } from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState, useEffect } from "react";
import { departmentsAPI } from "@/services/api";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Pencil, Trash2, Loader2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface Department {
  id: string;
  name: string;
  hodName: string;
  hodEmail: string;
}

const Departments = () => {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    hodName: "",
    hodEmail: "",
  });

  // Fetch departments on mount
  useEffect(() => {
    fetchDepartments();
  }, []);

  const fetchDepartments = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await departmentsAPI.getAll();
      
      if (response.success) {
        setDepartments(response.data);
      } else {
        setError(response.message || "Failed to fetch departments");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch departments");
      console.error("Error fetching departments:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const response = await departmentsAPI.create(formData);
      
      if (response.success) {
        toast.success("Department added successfully");
        setFormData({ name: "", hodName: "", hodEmail: "" });
        setShowForm(false);
        fetchDepartments(); // Refresh list
      } else {
        toast.error(response.message || "Failed to add department");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add department");
      console.error("Error creating department:", err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this department?")) return;
    
    try {
      const response = await departmentsAPI.delete(id);
      
      if (response.success) {
        toast.success("Department deleted successfully");
        fetchDepartments(); // Refresh list
      } else {
        toast.error(response.message || "Failed to delete department");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete department");
      console.error("Error deleting department:", err);
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Manage Departments</h1>
            <p className="text-muted-foreground mt-1">Add and manage department details and HODs</p>
          </div>
          <Button onClick={() => setShowForm(!showForm)} className="gap-2">
            <Plus className="h-4 w-4" />
            Add Department
          </Button>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Error:</strong> {error}
              <br />
              <span className="text-sm">Make sure backend is running on https://ifms-backend-nitj.onrender.com</span>
            </AlertDescription>
          </Alert>
        )}

        {showForm && (
          <Card>
            <CardHeader>
              <CardTitle>Add New Department</CardTitle>
              <CardDescription>Enter department and HOD details</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="name">Department Name *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g., Computer Science"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="hodName">HOD Name *</Label>
                    <Input
                      id="hodName"
                      value={formData.hodName}
                      onChange={(e) => setFormData({ ...formData, hodName: e.target.value })}
                      placeholder="e.g., Dr. John Doe"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="hodEmail">HOD Email *</Label>
                    <Input
                      id="hodEmail"
                      type="email"
                      value={formData.hodEmail}
                      onChange={(e) => setFormData({ ...formData, hodEmail: e.target.value })}
                      placeholder="hod@ifms.edu"
                      required
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button type="submit">Add Department</Button>
                  <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>Registered Departments</CardTitle>
                <CardDescription>List of all departments and their HODs (Live from MongoDB)</CardDescription>
              </div>
              <Button onClick={fetchDepartments} variant="outline" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Refreshing...
                  </>
                ) : (
                  "Refresh"
                )}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center items-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <span className="ml-2">Loading departments...</span>
              </div>
            ) : departments.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No departments found. Add one to get started!
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Department Name</TableHead>
                    <TableHead>HOD Name</TableHead>
                    <TableHead>HOD Email</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {departments.map((dept) => (
                    <TableRow key={dept.id}>
                      <TableCell className="font-medium">{dept.name}</TableCell>
                      <TableCell>{dept.hodName}</TableCell>
                      <TableCell>{dept.hodEmail}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm">
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="text-destructive"
                          onClick={() => handleDelete(dept.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default Departments;
