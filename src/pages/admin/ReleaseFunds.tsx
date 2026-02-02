import { Layout } from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StatusBadge } from "@/components/StatusBadge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DollarSign, RefreshCw, History } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useState, useEffect } from "react";
import { releaseFundsAPI } from "@/services/api";

const ReleaseFunds = () => {
  const [selectedProject, setSelectedProject] = useState(null);
  const [releaseAmount, setReleaseAmount] = useState("");
  const [letterDate, setLetterDate] = useState("");
  const [letterNumber, setLetterNumber] = useState("");
  const [remarks, setRemarks] = useState("");
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  // Fetch sanctioned projects
  const fetchProjects = async () => {
    setLoading(true);
    try {
      const response = await releaseFundsAPI.getSanctionedProjects();
      if (response.success) {
        setProjects(response.data);
        toast.success(`Loaded ${response.count} sanctioned projects`);
      }
    } catch (error) {
      toast.error(`Failed to fetch projects: ${error.message}`);
      console.error("Error fetching projects:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const handleRelease = (project) => {
    setSelectedProject(project);
    setReleaseAmount("");
    setLetterDate("");
    setLetterNumber("");
    setRemarks("");
    setShowHistory(false);
  };

  const confirmRelease = async () => {
    const amount = Number(releaseAmount);
    
    if (!amount || amount <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    if (amount > selectedProject.availableToRelease) {
      toast.error(`Release amount cannot exceed available amount (₹${(selectedProject.availableToRelease / 100000).toFixed(2)}L)`);
      return;
    }

    if (!letterDate || !letterNumber) {
      toast.error("Please provide letter date and number");
      return;
    }

    setLoading(true);
    try {
      const response = await releaseFundsAPI.releaseFunds({
        gpNumber: selectedProject.gpNumber,
        releaseAmount: amount,
        letterDate,
        letterNumber,
        remarks,
        releasedBy: "Finance Officer" // You can get this from auth context
      });

      if (response.success) {
        toast.success(`₹${(amount / 100000).toFixed(2)}L released successfully!`);
        setSelectedProject(null);
        fetchProjects(); // Refresh the list
      }
    } catch (error) {
      toast.error(`Failed to release funds: ${error.message}`);
      console.error("Error releasing funds:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return `₹${(amount / 100000).toFixed(2)}L`;
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Release Funds</h1>
            <p className="text-muted-foreground mt-1">
              Release funds to sanctioned projects with letter details
            </p>
          </div>
          <Button onClick={fetchProjects} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Sanctioned Projects</CardTitle>
            <CardDescription>
              Projects awaiting fund release from completed budget requests
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading && projects.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Loading sanctioned projects...
              </div>
            ) : projects.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No sanctioned projects found
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>GP Number</TableHead>
                    <TableHead>Project Title</TableHead>
                    <TableHead>PI Name</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead className="text-right">Sanctioned Amount</TableHead>
                    <TableHead className="text-right">Already Released</TableHead>
                    <TableHead className="text-right">Available to Release</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {projects.map((project) => (
                    <TableRow key={project._id}>
                      <TableCell className="font-medium">{project.gpNumber}</TableCell>
                      <TableCell className="max-w-xs truncate">{project.projectTitle}</TableCell>
                      <TableCell>{project.piName}</TableCell>
                      <TableCell>{project.department}</TableCell>
                      <TableCell className="text-right font-semibold">
                        {formatCurrency(project.sanctionedAmount)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(project.releasedAmount)}
                      </TableCell>
                      <TableCell className="text-right text-success font-semibold">
                        {formatCurrency(project.availableToRelease)}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={project.status} />
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button 
                            size="sm" 
                            onClick={() => handleRelease(project)}
                            disabled={project.availableToRelease <= 0}
                          >
                            <DollarSign className="h-4 w-4 mr-1" />
                            Release
                          </Button>
                          {project.releases && project.releases.length > 0 && (
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => {
                                setSelectedProject(project);
                                setShowHistory(true);
                              }}
                            >
                              <History className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Release Funds Dialog */}
      <Dialog open={!!selectedProject && !showHistory} onOpenChange={() => setSelectedProject(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Release Funds</DialogTitle>
            <DialogDescription>
              Enter release amount and letter details
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Card className="bg-muted/50">
              <CardContent className="pt-4">
                <div className="grid gap-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">GP Number:</span>
                    <span className="font-medium">{selectedProject?.gpNumber}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Project Title:</span>
                    <span className="font-medium">{selectedProject?.projectTitle}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">PI Name:</span>
                    <span className="font-medium">{selectedProject?.piName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Sanctioned Amount:</span>
                    <span className="font-semibold">
                      {formatCurrency(selectedProject?.sanctionedAmount || 0)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Already Released:</span>
                    <span className="font-medium">
                      {formatCurrency(selectedProject?.releasedAmount || 0)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Available to Release:</span>
                    <span className="font-semibold text-success text-lg">
                      {formatCurrency(selectedProject?.availableToRelease || 0)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="amount">Release Amount (₹)</Label>
                <Input
                  id="amount"
                  type="number"
                  value={releaseAmount}
                  onChange={(e) => setReleaseAmount(e.target.value)}
                  placeholder="Enter amount to release"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="letterDate">Letter Date</Label>
                <Input
                  id="letterDate"
                  type="date"
                  value={letterDate}
                  onChange={(e) => setLetterDate(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="letterNumber">Letter/Reference Number</Label>
              <Input
                id="letterNumber"
                value={letterNumber}
                onChange={(e) => setLetterNumber(e.target.value)}
                placeholder="REF/2024/001"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="remarks">Remarks (Optional)</Label>
              <Input
                id="remarks"
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="Additional notes..."
              />
            </div>

            <div className="bg-info/10 border border-info/20 rounded-lg p-4">
              <p className="text-sm text-info font-medium">Note:</p>
              <p className="text-sm text-muted-foreground mt-1">
                The released amount will be added to the project's available balance. PI will be
                able to book budgets against this released amount.
              </p>
            </div>

            <div className="flex gap-2">
              <Button onClick={confirmRelease} className="flex-1" disabled={loading}>
                {loading ? "Processing..." : "Confirm Release"}
              </Button>
              <Button variant="outline" onClick={() => setSelectedProject(null)} disabled={loading}>
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Release History Dialog */}
      <Dialog open={showHistory} onOpenChange={() => setShowHistory(false)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Release History</DialogTitle>
            <DialogDescription>
              {selectedProject?.gpNumber} - {selectedProject?.projectTitle}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Card>
              <CardContent className="pt-4">
                <div className="grid gap-2 text-sm mb-4">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total Sanctioned:</span>
                    <span className="font-semibold">{formatCurrency(selectedProject?.sanctionedAmount || 0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total Released:</span>
                    <span className="font-semibold">{formatCurrency(selectedProject?.releasedAmount || 0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Remaining:</span>
                    <span className="font-semibold text-success">{formatCurrency(selectedProject?.availableToRelease || 0)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-3">
              <h3 className="font-semibold">Release Transactions</h3>
              {selectedProject?.releases && selectedProject.releases.length > 0 ? (
                <div className="space-y-2">
                  {selectedProject.releases.map((release) => (
                    <Card key={release._id}>
                      <CardContent className="pt-4">
                        <div className="grid gap-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Amount Released:</span>
                            <span className="font-semibold text-success">{formatCurrency(release.releaseAmount)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Letter Number:</span>
                            <span className="font-medium">{release.letterNumber}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Letter Date:</span>
                            <span>{release.letterDate}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Released By:</span>
                            <span>{release.releasedBy}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Released At:</span>
                            <span>{new Date(release.releasedAt).toLocaleString()}</span>
                          </div>
                          {release.remarks && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Remarks:</span>
                              <span>{release.remarks}</span>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-4">No releases yet</p>
              )}
            </div>

            <Button variant="outline" onClick={() => setShowHistory(false)} className="w-full">
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Layout>
  );
};

export default ReleaseFunds;