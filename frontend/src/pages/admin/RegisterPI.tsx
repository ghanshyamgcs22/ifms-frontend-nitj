import { Layout } from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState, useEffect } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Pencil, Trash2, UserPlus, Search, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { principalInvestigatorsAPI, departmentsAPI } from "@/services/api";

interface PI {
  id: string;
  name: string;
  email: string;
  phone: string;
  department: string;
  designation: string;
}

interface Department {
  id: string;
  name: string;
}

const RegisterPI = () => {
  const [pis, setPis] = useState<PI[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    department: "",
    designation: "",
  });

  // Fetch PIs on component mount
  useEffect(() => {
    fetchPIs();
    fetchDepartments();
  }, []);

  // Fetch all PIs
  const fetchPIs = async () => {
    try {
      setLoading(true);
      const response = await principalInvestigatorsAPI.getAll();
      if (response.success) {
        setPis(response.data);
      }
    } catch (error) {
      toast.error("Failed to fetch Principal Investigators");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch departments
  const fetchDepartments = async () => {
    try {
      const response = await departmentsAPI.getAll();
      if (response.success) {
        setDepartments(response.data);
      }
    } catch (error) {
      console.error("Failed to fetch departments:", error);
      // Fallback to mock data if API fails
      setDepartments([
        { id: "1", name: "Computer Science" },
        { id: "2", name: "Electronics" },
        { id: "3", name: "Mechanical" },
        { id: "4", name: "Civil" },
      ]);
    }
  };

  // Handle form submission (Create or Update)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      
      if (isEditing && editingId) {
        // Update existing PI
        const response = await principalInvestigatorsAPI.update(editingId, formData);
        if (response.success) {
          toast.success("Principal Investigator updated successfully");
          fetchPIs(); // Refresh list
        }
      } else {
        // Create new PI
        const response = await principalInvestigatorsAPI.create(formData);
        if (response.success) {
          toast.success("Principal Investigator registered successfully");
          fetchPIs(); // Refresh list
        }
      }
      
      // Reset form
      setFormData({ name: "", email: "", phone: "", department: "", designation: "" });
      setShowForm(false);
      setIsEditing(false);
      setEditingId(null);
      
    } catch (error: any) {
      toast.error(error.message || "Failed to save Principal Investigator");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // Handle edit
  const handleEdit = (pi: PI) => {
    setFormData({
      name: pi.name,
      email: pi.email,
      phone: pi.phone,
      department: pi.department,
      designation: pi.designation,
    });
    setEditingId(pi.id);
    setIsEditing(true);
    setShowForm(true);
  };

  // Handle delete
  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this PI?")) {
      return;
    }

    try {
      setLoading(true);
      const response = await principalInvestigatorsAPI.delete(id);
      if (response.success) {
        toast.success("Principal Investigator deleted successfully");
        fetchPIs(); // Refresh list
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to delete Principal Investigator");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // Handle search
  const handleSearch = async () => {
    try {
      setLoading(true);
      const response = await principalInvestigatorsAPI.getAll(searchTerm);
      if (response.success) {
        setPis(response.data);
      }
    } catch (error) {
      toast.error("Search failed");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // Cancel editing
  const handleCancel = () => {
    setFormData({ name: "", email: "", phone: "", department: "", designation: "" });
    setShowForm(false);
    setIsEditing(false);
    setEditingId(null);
  };

  return (
    <Layout>
      <div className="space-y-6 animate-fade-in">
        {/* Page Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Register PI</h1>
            <p className="text-muted-foreground mt-1">
              Register and manage Principal Investigators
            </p>
          </div>
          <Button
            onClick={() => {
              handleCancel();
              setShowForm(!showForm);
            }}
            className="gap-2 h-11"
            disabled={loading}
          >
            <Plus className="h-4 w-4" />
            Register New PI
          </Button>
        </div>

        {/* Registration Form */}
        {showForm && (
          <Card className="shadow-soft border animate-scale-in">
            <CardHeader>
              <CardTitle className="text-xl font-semibold">
                {isEditing ? "Edit Principal Investigator" : "Register New Principal Investigator"}
              </CardTitle>
              <CardDescription>
                {isEditing ? "Update PI details" : "Enter PI details to register in the system"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Dr. Jane Doe"
                      required
                      disabled={loading}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="jane.doe@ifms.edu"
                      required
                      disabled={loading}
                    />
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="+91 9876543210"
                      required
                      disabled={loading}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="designation">Designation</Label>
                    <Select
                      value={formData.designation}
                      onValueChange={(value) => setFormData({ ...formData, designation: value })}
                      disabled={loading}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select designation" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Professor">Professor</SelectItem>
                        <SelectItem value="Associate Professor">Associate Professor</SelectItem>
                        <SelectItem value="Assistant Professor">Assistant Professor</SelectItem>
                        <SelectItem value="Senior Scientist">Senior Scientist</SelectItem>
                        <SelectItem value="Scientist">Scientist</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="department">Department</Label>
                  <Select
                    value={formData.department}
                    onValueChange={(value) => setFormData({ ...formData, department: value })}
                    disabled={loading}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select department" />
                    </SelectTrigger>
                    <SelectContent>
                      {departments.map((dept) => (
                        <SelectItem key={dept.id} value={dept.name}>
                          {dept.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex gap-3 pt-2">
                  <Button
                    type="submit"
                    className="gap-2"
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        {isEditing ? "Updating..." : "Registering..."}
                      </>
                    ) : (
                      <>
                        <UserPlus className="h-4 w-4" />
                        {isEditing ? "Update PI" : "Register PI"}
                      </>
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCancel}
                    disabled={loading}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Search Bar */}
        <Card className="shadow-soft border">
          <CardContent className="pt-6">
            <div className="flex gap-3">
              <Input
                placeholder="Search by name, email, or department..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                disabled={loading}
              />
              <Button onClick={handleSearch} disabled={loading}>
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Search className="h-4 w-4" />
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* PI List Table */}
        <Card className="shadow-soft border">
          <CardHeader>
            <CardTitle className="text-xl font-semibold">
              Registered Principal Investigators
            </CardTitle>
            <CardDescription>
              List of all registered PIs in the system ({pis.length} total)
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading && pis.length === 0 ? (
              <div className="flex justify-center items-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : pis.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                No Principal Investigators found
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="font-semibold">Name</TableHead>
                      <TableHead className="font-semibold">Email</TableHead>
                      <TableHead className="font-semibold">Phone</TableHead>
                      <TableHead className="font-semibold">Department</TableHead>
                      <TableHead className="font-semibold">Designation</TableHead>
                      <TableHead className="text-right font-semibold">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="table-zebra">
                    {pis.map((pi) => (
                      <TableRow key={pi.id}>
                        <TableCell className="font-medium">{pi.name}</TableCell>
                        <TableCell>{pi.email}</TableCell>
                        <TableCell>{pi.phone}</TableCell>
                        <TableCell>
                          <span className="badge-institutional">
                            {pi.department}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="inline-flex items-center px-3 py-1 rounded-full bg-success/10 border border-success/30 text-success text-sm font-semibold">
                            {pi.designation}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="hover:bg-primary/10 hover:text-primary"
                            onClick={() => handleEdit(pi)}
                            disabled={loading}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="hover:bg-destructive/10 hover:text-destructive"
                            onClick={() => handleDelete(pi.id)}
                            disabled={loading}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default RegisterPI;
