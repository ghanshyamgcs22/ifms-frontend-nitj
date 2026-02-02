import { Layout } from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState, useEffect } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Pencil, Trash2, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { projectHeadsAPI } from "@/services/api";

const ProjectHeads = () => {
  const [heads, setHeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    type: "",
  });

  // Fetch all project heads on component mount
  useEffect(() => {
    fetchHeads();
  }, []);

  const fetchHeads = async () => {
    try {
      setLoading(true);
      const response = await projectHeadsAPI.getAll();
      if (response.success) {
        setHeads(response.data);
      }
    } catch (error) {
      toast.error("Failed to fetch project heads: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.type) {
      toast.error("Please fill in all fields");
      return;
    }

    try {
      setSubmitting(true);
      
      if (editingId) {
        // Update existing head
        const response = await projectHeadsAPI.update(editingId, formData);
        if (response.success) {
          toast.success(response.message);
          await fetchHeads(); // Refresh the list
          resetForm();
        }
      } else {
        // Create new head
        const response = await projectHeadsAPI.create(formData);
        if (response.success) {
          toast.success(response.message);
          await fetchHeads(); // Refresh the list
          resetForm();
        }
      }
    } catch (error) {
      toast.error(error.message || "Failed to save project head");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (head) => {
    setEditingId(head.id);
    setFormData({
      name: head.name,
      type: head.type,
    });
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!confirm("Are you sure you want to delete this project head?")) {
      return;
    }

    try {
      const response = await projectHeadsAPI.delete(id);
      if (response.success) {
        toast.success(response.message);
        await fetchHeads(); // Refresh the list
      }
    } catch (error) {
      toast.error(error.message || "Failed to delete project head");
    }
  };

  const resetForm = () => {
    setFormData({ name: "", type: "" });
    setShowForm(false);
    setEditingId(null);
  };

  const recurringHeads = heads.filter((h) => h.type === "recurring");
  const nonRecurringHeads = heads.filter((h) => h.type === "non-recurring");

  const HeadTable = ({ heads }: { heads: typeof heads }) => {
    if (loading) {
      return (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      );
    }

    if (heads.length === 0) {
      return (
        <div className="text-center py-8 text-muted-foreground">
          No project heads found
        </div>
      );
    }

    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Head Name</TableHead>
            <TableHead>Type</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {heads.map((head) => (
            <TableRow key={head.id}>
              <TableCell className="font-medium">{head.name}</TableCell>
              <TableCell>
                <Badge variant={head.type === "recurring" ? "default" : "secondary"}>
                  {head.type}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => handleEdit(head)}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="text-destructive"
                  onClick={() => handleDelete(head.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Project Heads</h1>
            <p className="text-muted-foreground mt-1">
              Manage recurring and non-recurring project heads
            </p>
          </div>
          <Button 
            onClick={() => {
              resetForm();
              setShowForm(!showForm);
            }} 
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            Add Project Head
          </Button>
        </div>

        {showForm && (
          <Card>
            <CardHeader>
              <CardTitle>
                {editingId ? "Edit Project Head" : "Add New Project Head"}
              </CardTitle>
              <CardDescription>
                {editingId ? "Update the project head details" : "Create a new budget head for projects"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="name">Head Name</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g., Equipment, Travel"
                      required
                      disabled={submitting}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="type">Type</Label>
                    <Select
                      value={formData.type}
                      onValueChange={(value) => setFormData({ ...formData, type: value })}
                      disabled={submitting}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="recurring">Recurring</SelectItem>
                        <SelectItem value="non-recurring">Non-Recurring</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button type="submit" disabled={submitting}>
                    {submitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        {editingId ? "Updating..." : "Adding..."}
                      </>
                    ) : (
                      editingId ? "Update Project Head" : "Add Project Head"
                    )}
                  </Button>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={resetForm}
                    disabled={submitting}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>All Project Heads</CardTitle>
            <CardDescription>Browse heads by type</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="all">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="all">All ({heads.length})</TabsTrigger>
                <TabsTrigger value="recurring">Recurring ({recurringHeads.length})</TabsTrigger>
                <TabsTrigger value="non-recurring">
                  Non-Recurring ({nonRecurringHeads.length})
                </TabsTrigger>
              </TabsList>
              <TabsContent value="all" className="mt-4">
                <HeadTable heads={heads} />
              </TabsContent>
              <TabsContent value="recurring" className="mt-4">
                <HeadTable heads={recurringHeads} />
              </TabsContent>
              <TabsContent value="non-recurring" className="mt-4">
                <HeadTable heads={nonRecurringHeads} />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default ProjectHeads;