// pages/DRDashboard.tsx - FIXED VERSION
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ApprovalTimeline } from "@/components/ApprovalTimeline";
import { useState, useEffect } from "react";
import { Clock, CheckCircle, TrendingUp, History, Loader2, Lock } from "lucide-react";
import { toast } from "sonner";
import { budgetRequestsAPI } from "@/services/api";

interface BudgetRequest {
  id: string;
  gpNumber: string;
  projectTitle: string;
  piName: string;
  piEmail: string;
  department: string;
  purpose: string;
  description: string;
  amount: number;
  projectType: string;
  invoiceNumber: string;
  status: string;
  currentStage: string;
  createdAt: string;
  adminRemarks?: string;
  arRemarks?: string;
  drRemarks?: string;
  ao2Remarks?: string;
  approvalHistory?: any[];
}

const DRDashboard = () => {
  const [selectedRequest, setSelectedRequest] = useState<BudgetRequest | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [remarks, setRemarks] = useState("");
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  
  const [allPendingRequests, setAllPendingRequests] = useState<BudgetRequest[]>([]);
  const [completedRequests, setCompletedRequests] = useState<BudgetRequest[]>([]);

  // Filter requests for DR's turn (ready to approve)
  const myTurnRequests = allPendingRequests.filter(r => r.currentStage === 'dr' && r.status === 'ar_approved');
  
  // Requests waiting for previous stages (Admin, AR)
  const waitingRequests = allPendingRequests.filter(r => 
    (r.currentStage === 'admin' && r.status === 'pending') ||
    (r.currentStage === 'ar' && r.status === 'admin_verified')
  );
  
  // Requests at later stages (already approved by DR)
  const forwardedRequests = allPendingRequests.filter(r => 
    r.currentStage === 'ao2' && r.status === 'dr_approved'
  );

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch ALL pending requests
      const allRequests = await budgetRequestsAPI.getAll('', '', '');
      
      // Filter for non-completed/non-rejected
      const pending = allRequests.data?.filter((r: BudgetRequest) => 
        r.status !== 'approved' && r.status !== 'rejected'
      ) || [];
      
      setAllPendingRequests(pending);
      
      const completedResponse = await budgetRequestsAPI.getCompleted();
      setCompletedRequests(completedResponse.data || []);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Failed to load budget requests");
    } finally {
      setLoading(false);
    }
  };

  const canApproveRequest = (request: BudgetRequest) => {
    // DR can only approve if it's at DR stage with ar_approved status
    return request.currentStage === 'dr' && request.status === 'ar_approved';
  };

  const handleApprove = async () => {
    if (!selectedRequest) return;

    if (!canApproveRequest(selectedRequest)) {
      toast.error("Cannot approve: Not at your approval stage yet");
      return;
    }

    try {
      setActionLoading(true);
      await budgetRequestsAPI.drApprove(selectedRequest.id, remarks, "DR Officer");
      
      toast.success("Request approved and forwarded to AO2");
      setDialogOpen(false);
      setSelectedRequest(null);
      setRemarks("");
      await fetchData();
    } catch (error) {
      toast.error("Failed to approve request");
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!selectedRequest) return;
    
    if (!canApproveRequest(selectedRequest)) {
      toast.error("Cannot reject: Not at your approval stage yet");
      return;
    }
    
    if (!remarks.trim()) {
      toast.error("Please enter remarks for rejection");
      return;
    }

    try {
      setActionLoading(true);
      await budgetRequestsAPI.reject(selectedRequest.id, "dr", remarks, "DR Officer");
      
      toast.error("Request rejected");
      setDialogOpen(false);
      setSelectedRequest(null);
      setRemarks("");
      await fetchData();
    } catch (error) {
      toast.error("Failed to reject request");
    } finally {
      setActionLoading(false);
    }
  };

  const handleViewRequest = (request: BudgetRequest) => {
    setSelectedRequest(request);
    setRemarks("");
    setDialogOpen(true);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric' 
    });
  };

  const formatAmount = (amount: number) => {
    return `₹${(amount / 100000).toFixed(2)}L`;
  };

  const getStageLabel = (stage: string, status: string) => {
    if (stage === 'admin' && status === 'pending') return '⏳ At Admin';
    if (stage === 'ar' && status === 'admin_verified') return '⏳ At AR';
    if (stage === 'dr' && status === 'ar_approved') return '👉 Ready for DR Review';
    if (stage === 'ao2' && status === 'dr_approved') return '✅ Approved by DR → At AO2';
    return stage.toUpperCase();
  };

  const StatusBadge = ({ request }: { request: BudgetRequest }) => {
    const { currentStage, status } = request;
    
    if (currentStage === 'admin' && status === 'pending') {
      return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300">⏳ At Admin</Badge>;
    }
    if (currentStage === 'ar' && status === 'admin_verified') {
      return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-300">⏳ At AR</Badge>;
    }
    if (currentStage === 'dr' && status === 'ar_approved') {
      return <Badge className="bg-blue-100 text-blue-800 border-blue-400">👉 Your Turn</Badge>;
    }
    if (currentStage === 'ao2' && status === 'dr_approved') {
      return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300">✅ At AO2</Badge>;
    }
    
    return <Badge variant="secondary">{status}</Badge>;
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-96">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="ml-3">Loading...</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">DR Dashboard</h1>
            <p className="text-muted-foreground mt-1">Deputy Registrar - Second level approval</p>
          </div>
          <Button onClick={fetchData} variant="outline" size="sm">Refresh</Button>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <Card className="border-blue-200">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Your Turn</CardTitle>
              <Clock className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{myTurnRequests.length}</div>
              <p className="text-xs text-muted-foreground mt-1">Ready for your approval</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Waiting</CardTitle>
              <Clock className="h-4 w-4 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{waitingRequests.length}</div>
              <p className="text-xs text-muted-foreground mt-1">At previous stages</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Forwarded</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{forwardedRequests.length}</div>
              <p className="text-xs text-muted-foreground mt-1">At AO2 stage</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Pending</CardTitle>
              <TrendingUp className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{allPendingRequests.length}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {formatAmount(allPendingRequests.reduce((sum, r) => sum + r.amount, 0))}
              </p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>All Pending Budget Requests</CardTitle>
            <CardDescription>View all requests in the workflow - You can only approve requests at DR stage</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex gap-2">
                <Button 
                  size="sm" 
                  variant={myTurnRequests.length > 0 ? "default" : "outline"}
                  onClick={() => {/* Could add filtering */}}
                >
                  My Turn ({myTurnRequests.length})
                </Button>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => {/* Could add filtering */}}
                >
                  Waiting ({waitingRequests.length})
                </Button>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => {/* Could add filtering */}}
                >
                  Forwarded ({forwardedRequests.length})
                </Button>
              </div>

              {allPendingRequests.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <CheckCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No pending requests</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>GP Number</TableHead>
                      <TableHead>PI Name</TableHead>
                      <TableHead>Purpose</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Current Stage</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {allPendingRequests.map((request) => (
                      <TableRow key={request.id} className={canApproveRequest(request) ? 'bg-blue-50' : ''}>
                        <TableCell>{formatDate(request.createdAt)}</TableCell>
                        <TableCell className="font-medium">{request.gpNumber}</TableCell>
                        <TableCell>{request.piName}</TableCell>
                        <TableCell className="max-w-xs truncate">{request.purpose}</TableCell>
                        <TableCell className="text-right">{formatAmount(request.amount)}</TableCell>
                        <TableCell className="capitalize">{request.projectType}</TableCell>
                        <TableCell><StatusBadge request={request} /></TableCell>
                        <TableCell>
                          <Button 
                            size="sm" 
                            onClick={() => handleViewRequest(request)}
                            variant={canApproveRequest(request) ? "default" : "outline"}
                          >
                            {canApproveRequest(request) ? 'Review & Approve' : 'View Details'}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <History className="h-5 w-5 text-muted-foreground" />
              <CardTitle>History: Completed Requests</CardTitle>
            </div>
            <CardDescription>All sanctioned or rejected budget requests</CardDescription>
          </CardHeader>
          <CardContent>
            {completedRequests.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No completed requests yet</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>GP Number</TableHead>
                    <TableHead>PI Name</TableHead>
                    <TableHead>Purpose</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Final Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {completedRequests.map((request) => (
                    <TableRow key={request.id}>
                      <TableCell>{formatDate(request.createdAt)}</TableCell>
                      <TableCell className="font-medium">{request.gpNumber}</TableCell>
                      <TableCell>{request.piName}</TableCell>
                      <TableCell className="max-w-xs truncate">{request.purpose}</TableCell>
                      <TableCell className="text-right">{formatAmount(request.amount)}</TableCell>
                      <TableCell>
                        {request.status === 'approved' ? (
                          <Badge className="bg-green-100 text-green-800">✅ Approved</Badge>
                        ) : (
                          <Badge variant="destructive">❌ Rejected</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" onClick={() => handleViewRequest(request)}>View Details</Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Review Budget Request</DialogTitle>
            <DialogDescription>
              {selectedRequest && canApproveRequest(selectedRequest) 
                ? "✅ This request is ready for your approval"
                : "ℹ️ View only - Not at your approval stage yet"}
            </DialogDescription>
          </DialogHeader>

          {selectedRequest && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
                <div>
                  <p className="text-sm text-muted-foreground">GP Number</p>
                  <p className="font-medium">{selectedRequest.gpNumber}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Project Type</p>
                  <Badge variant={selectedRequest.projectType === "recurring" ? "default" : "secondary"}>
                    {selectedRequest.projectType}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">PI Name</p>
                  <p className="font-medium">{selectedRequest.piName}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Amount</p>
                  <p className="font-medium text-lg">{formatAmount(selectedRequest.amount)}</p>
                </div>
              </div>

              <div>
                <p className="text-sm text-muted-foreground mb-1">Current Stage</p>
                <div className="font-medium">
                  {getStageLabel(selectedRequest.currentStage, selectedRequest.status)}
                </div>
              </div>

              <div>
                <p className="text-sm text-muted-foreground mb-1">Project Title</p>
                <p className="font-medium">{selectedRequest.projectTitle}</p>
              </div>

              <div>
                <p className="text-sm text-muted-foreground mb-1">Purpose</p>
                <p>{selectedRequest.purpose}</p>
              </div>

              {selectedRequest.description && (
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Description</p>
                  <p className="text-sm">{selectedRequest.description}</p>
                </div>
              )}

              <ApprovalTimeline 
                approvalHistory={selectedRequest.approvalHistory}
                currentStage={selectedRequest.currentStage}
                status={selectedRequest.status}
              />

              {canApproveRequest(selectedRequest) && (
                <div className="space-y-2">
                  <Label htmlFor="remarks">Your Remarks (Optional)</Label>
                  <Textarea
                    id="remarks"
                    placeholder="Enter your comments"
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    rows={3}
                  />
                </div>
              )}

              {!canApproveRequest(selectedRequest) && selectedRequest.status !== 'approved' && selectedRequest.status !== 'rejected' && (
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg flex items-start gap-3">
                  <Lock className="h-5 w-5 text-yellow-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-yellow-900">Not Your Turn Yet</p>
                    <p className="text-sm text-yellow-700 mt-1">
                      This request is currently at the <strong>{selectedRequest.currentStage.toUpperCase()}</strong> stage.
                      You can approve/reject only when it reaches the DR stage.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            {selectedRequest && canApproveRequest(selectedRequest) ? (
              <>
                <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={actionLoading}>
                  Cancel
                </Button>
                <Button variant="destructive" onClick={handleReject} disabled={actionLoading}>
                  {actionLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Rejecting...</> : 'Reject'}
                </Button>
                <Button onClick={handleApprove} disabled={actionLoading}>
                  {actionLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Approving...</> : 'Approve & Forward to AO2'}
                </Button>
              </>
            ) : (
              <Button onClick={() => setDialogOpen(false)}>Close</Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
};

export default DRDashboard;