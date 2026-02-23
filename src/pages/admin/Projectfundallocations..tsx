import { useState, useEffect } from "react";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Download, Pencil, Trash2, AlertCircle, CheckCircle } from "lucide-react";
import { useParams, useNavigate } from "react-router-dom";

const ProjectFundAllocations = () => {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [allocations, setAllocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingAllocation, setEditingAllocation] = useState(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => {
    fetchProjectData();
  }, [projectId]);

  const fetchProjectData = async () => {
    try {
      setLoading(true);
      // Fetch project details
      const projectResponse = await fetch(`http://localhost:8000/api/projects.php?id=${projectId}`);
      const projectData = await projectResponse.json();
      
      if (projectData.success) {
        setProject(projectData.data);
      }

      // Fetch allocations
      const allocationsResponse = await fetch(`http://localhost:8000/api/fund-allocations.php?projectId=${projectId}`);
      const allocationsData = await allocationsResponse.json();
      
      if (allocationsData.success) {
        setAllocations(allocationsData.data);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (allocation) => {
    setEditingAllocation({ ...allocation });
    setShowEditDialog(true);
  };

  const handleDelete = (allocationId) => {
    setDeletingId(allocationId);
    setShowDeleteDialog(true);
  };

  const confirmDelete = async () => {
    try {
      const response = await fetch(
        `http://localhost:8000/api/fund-allocations.php?id=${deletingId}`,
        {
          method: "DELETE",
        }
      );

      const result = await response.json();

      if (result.success) {
        setAllocations(allocations.filter(a => a.id !== deletingId));
        setShowDeleteDialog(false);
        setDeletingId(null);
      } else {
        alert("Failed to delete allocation");
      }
    } catch (error) {
      console.error("Error deleting allocation:", error);
      alert("Error deleting allocation");
    }
  };

  const saveEdit = async () => {
    try {
      const response = await fetch(
        `http://localhost:8000/api/fund-allocations.php?id=${editingAllocation.id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(editingAllocation),
        }
      );

      const result = await response.json();

      if (result.success) {
        setAllocations(allocations.map(a => 
          a.id === editingAllocation.id ? editingAllocation : a
        ));
        setShowEditDialog(false);
        setEditingAllocation(null);
      } else {
        alert("Failed to update allocation");
      }
    } catch (error) {
      console.error("Error updating allocation:", error);
      alert("Error updating allocation");
    }
  };

  const downloadLetter = (allocation) => {
    // Implement download logic
    if (allocation.letterUrl) {
      window.open(allocation.letterUrl, '_blank');
    } else {
      alert("No sanction letter available");
    }
  };

  const calculateTotals = () => {
    return allocations.reduce(
      (acc, alloc) => ({
        sanctioned: acc.sanctioned + (parseFloat(alloc.sanctionedAmount) || 0),
        released: acc.released + (parseFloat(alloc.releasedAmount) || 0),
      }),
      { sanctioned: 0, released: 0 }
    );
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-96">
          <p>Loading...</p>
        </div>
      </Layout>
    );
  }

  const totals = calculateTotals();

  return (
    <Layout>
      <div className="space-y-6">
        {/* Project Header */}
        <div>
          <h1 className="text-3xl font-bold text-foreground">Fund Allocations</h1>
          <p className="text-muted-foreground mt-1">
            {project?.title} - {project?.gpNumber}
          </p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Budget</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ₹{parseFloat(project?.proposedBudget || 0).toLocaleString("en-IN")}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Sanctioned</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-success">
                ₹{totals.sanctioned.toLocaleString("en-IN")}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Released</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">
                ₹{totals.released.toLocaleString("en-IN")}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Remaining</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-warning">
                ₹{(parseFloat(project?.proposedBudget || 0) - totals.sanctioned).toLocaleString("en-IN")}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Allocations Table */}
        <Card>
          <CardHeader>
            <CardTitle>Head-wise Fund Allocation Details</CardTitle>
            <CardDescription>
              View and manage fund allocations across different project heads
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[100px]">Project Number</TableHead>
                    <TableHead className="w-[150px]">Enter Total Sanction Funds</TableHead>
                    <TableHead className="w-[200px]">Details of Release Funds</TableHead>
                    <TableHead className="min-w-[300px]">Project Name</TableHead>
                    <TableHead>Project Mode</TableHead>
                    <TableHead>Time Period</TableHead>
                    <TableHead>Total Sanctioned Fund</TableHead>
                    <TableHead>Sanctioned Letter</TableHead>
                    <TableHead>Bank Details</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                    <TableHead>Updated at</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allocations.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={11} className="text-center py-8 text-muted-foreground">
                        No fund allocations found for this project
                      </TableCell>
                    </TableRow>
                  ) : (
                    allocations.map((allocation) => (
                      <TableRow key={allocation.id}>
                        <TableCell className="font-medium">
                          <span className="px-2 py-1 bg-primary text-primary-foreground rounded text-sm">
                            {project?.gpNumber || 'GP-XXX'}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="link"
                            className="text-primary p-0 h-auto"
                            onClick={() => handleEdit(allocation)}
                          >
                            Enter Head-Wise Sanctioned Amount
                            <br />
                            <span className="text-xs text-muted-foreground">(click)</span>
                          </Button>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="link"
                            className="text-primary p-0 h-auto"
                            onClick={() => handleEdit(allocation)}
                          >
                            See Released Amount (as per Finance Branch Record)
                            <br />
                            <span className="text-xs text-muted-foreground">(click)</span>
                          </Button>
                        </TableCell>
                        <TableCell className="max-w-[300px]">
                          <div className="space-y-1">
                            <p className="font-medium">{allocation.headName}</p>
                            <p className="text-sm text-muted-foreground">
                              {project?.title || 'Project Title'}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className={`inline-block px-2 py-1 text-xs rounded-full ${
                            allocation.headType === "recurring"
                              ? "bg-blue-100 text-blue-700"
                              : "bg-gray-100 text-gray-700"
                          }`}>
                            {allocation.headType === "recurring" ? "Recurring" : "Non-Recurring"}
                          </span>
                        </TableCell>
                        <TableCell>{allocation.timePeriod}</TableCell>
                        <TableCell className="font-semibold">
                          ₹{parseFloat(allocation.sanctionedAmount || 0).toLocaleString("en-IN")}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="link"
                            size="sm"
                            onClick={() => downloadLetter(allocation)}
                            className="text-primary"
                          >
                            <Download className="h-4 w-4 mr-1" />
                            Download
                          </Button>
                        </TableCell>
                        <TableCell>
                          <p className="text-sm">
                            {allocation.bankDetails || "To be updated by Finance Branch"}
                          </p>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2 justify-end">
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleDelete(allocation.id)}
                            >
                              Delete
                            </Button>
                            <Button
                              variant="default"
                              size="sm"
                              onClick={() => handleEdit(allocation)}
                            >
                              Update
                            </Button>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(allocation.updatedAt).toLocaleString()}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Edit Dialog */}
        <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Update Fund Allocation</DialogTitle>
              <DialogDescription>
                Modify the allocation details for {editingAllocation?.headName}
              </DialogDescription>
            </DialogHeader>
            
            {editingAllocation && (
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Sanctioned Amount (₹)</Label>
                    <Input
                      type="number"
                      value={editingAllocation.sanctionedAmount}
                      onChange={(e) =>
                        setEditingAllocation({
                          ...editingAllocation,
                          sanctionedAmount: e.target.value,
                        })
                      }
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Released Amount (₹)</Label>
                    <Input
                      type="number"
                      value={editingAllocation.releasedAmount}
                      onChange={(e) =>
                        setEditingAllocation({
                          ...editingAllocation,
                          releasedAmount: e.target.value,
                        })
                      }
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Time Period</Label>
                    <Input
                      value={editingAllocation.timePeriod}
                      onChange={(e) =>
                        setEditingAllocation({
                          ...editingAllocation,
                          timePeriod: e.target.value,
                        })
                      }
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Bank Details</Label>
                    <Input
                      value={editingAllocation.bankDetails}
                      onChange={(e) =>
                        setEditingAllocation({
                          ...editingAllocation,
                          bankDetails: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>
              </div>
            )}
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowEditDialog(false)}>
                Cancel
              </Button>
              <Button onClick={saveEdit}>Save Changes</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirm Deletion</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete this allocation? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={confirmDelete}>
                Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
};

export default ProjectFundAllocations;