import { Layout } from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ApprovalTimeline } from "@/components/ApprovalTimeline";
import { useState, useEffect } from "react";
import { Clock, CheckCircle, FileCheck, History, Loader2, XCircle, ArrowRight } from "lucide-react";
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

const StatusBadge = ({ status }: { status: string }) => {
  const statusConfig: Record<string, { label: string; className: string }> = {
    'pending': { label: 'Pending', className: 'bg-yellow-50 text-yellow-700 border-yellow-200' },
    'admin_verified': { label: 'Verified by Admin', className: 'bg-blue-50 text-blue-700 border-blue-200' },
    'ar_approved': { label: 'AR Approved', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    'dr_approved': { label: 'DR Approved', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    'approved': { label: 'Fully Approved', className: 'bg-green-50 text-green-700 border-green-200' },
    'rejected': { label: 'Rejected', className: 'bg-red-50 text-red-700 border-red-200' },
  };

  const config = statusConfig[status] || { label: status, className: 'bg-gray-50 text-gray-700 border-gray-200' };

  return (
    <span className={`inline-block px-3 py-1.5 rounded text-xs font-medium border ${config.className} whitespace-nowrap`}>
      {config.label}
    </span>
  );
};

const CurrentStageBadge = ({ stage }: { stage: string }) => {
  const stageConfig: Record<string, { label: string; className: string; icon: any }> = {
    'admin': { label: 'At Admin', className: 'bg-yellow-50 text-yellow-700 border-yellow-200', icon: Clock },
    'ar': { label: 'At AR', className: 'bg-blue-50 text-blue-700 border-blue-200', icon: Clock },
    'dr': { label: 'At DR', className: 'bg-purple-50 text-purple-700 border-purple-200', icon: Clock },
    'ao2': { label: 'At AO2', className: 'bg-indigo-50 text-indigo-700 border-indigo-200', icon: Clock },
    'completed': { label: 'Completed', className: 'bg-green-50 text-green-700 border-green-200', icon: CheckCircle },
    'rejected': { label: 'Rejected', className: 'bg-red-50 text-red-700 border-red-200', icon: XCircle },
  };

  const config = stageConfig[stage] || { label: stage, className: 'bg-gray-50 text-gray-700 border-gray-200', icon: Clock };
  const Icon = config.icon;

  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium border ${config.className} whitespace-nowrap`}>
      <Icon className="h-3 w-3" />
      {config.label}
    </span>
  );
};

const BudgetReview = () => {
  const [selectedRequest, setSelectedRequest] = useState<BudgetRequest | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [remarks, setRemarks] = useState("");
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("all");
  
  const [allRequests, setAllRequests] = useState<BudgetRequest[]>([]);
  const [pendingRequests, setPendingRequests] = useState<BudgetRequest[]>([]);
  const [verifiedRequests, setVerifiedRequests] = useState<BudgetRequest[]>([]);
  const [completedRequests, setCompletedRequests] = useState<BudgetRequest[]>([]);
  const [rejectedRequests, setRejectedRequests] = useState<BudgetRequest[]>([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      console.log("📡 Fetching all budget requests...");
      
      const response = await budgetRequestsAPI.getAll();
      console.log("✅ All requests:", response);
      
      const requests = response.data || [];
      setAllRequests(requests);
      
      // Filter by status
      setPendingRequests(requests.filter((r: BudgetRequest) => r.status === 'pending'));
      setVerifiedRequests(requests.filter((r: BudgetRequest) => 
        r.status === 'admin_verified' || r.status === 'ar_approved' || r.status === 'dr_approved'
      ));
      setCompletedRequests(requests.filter((r: BudgetRequest) => r.status === 'approved'));
      setRejectedRequests(requests.filter((r: BudgetRequest) => r.status === 'rejected'));
      
      console.log("✅ All data fetched and categorized successfully");
    } catch (error) {
      console.error("❌ Error fetching data:", error);
      toast.error("Failed to load budget requests");
    } finally {
      setLoading(false);
    }
  };

  const handleViewRequest = async (request: BudgetRequest) => {
    try {
      // Fetch the full request with timeline data
      const response = await budgetRequestsAPI.getById(request.id);
      setSelectedRequest(response.data);
      setRemarks("");
      setDialogOpen(true);
    } catch (error) {
      console.error("❌ Error fetching request details:", error);
      toast.error("Failed to load request details");
    }
  };

  const handleForward = async () => {
    if (!selectedRequest) return;

    try {
      setActionLoading(true);
      await budgetRequestsAPI.forward(selectedRequest.id, remarks, "Admin User");
      
      toast.success("Request forwarded to AR successfully");
      setDialogOpen(false);
      setSelectedRequest(null);
      setRemarks("");
      
      await fetchData();
    } catch (error) {
      console.error("❌ Error forwarding request:", error);
      toast.error("Failed to forward request");
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!selectedRequest) return;
    
    if (!remarks.trim()) {
      toast.error("Please enter remarks for rejection");
      return;
    }

    try {
      setActionLoading(true);
      await budgetRequestsAPI.reject(selectedRequest.id, "admin", remarks, "Admin User");
      
      toast.error("Request rejected");
      setDialogOpen(false);
      setSelectedRequest(null);
      setRemarks("");
      
      await fetchData();
    } catch (error) {
      console.error("❌ Error rejecting request:", error);
      toast.error("Failed to reject request");
    } finally {
      setActionLoading(false);
    }
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

  const renderRequestsTable = (requests: BudgetRequest[], showActions: boolean = true) => {
    if (requests.length === 0) {
      return (
        <div className="text-center py-12 text-muted-foreground">
          <FileCheck className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No requests in this category</p>
        </div>
      );
    }

    return (
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50">
              <TableHead className="font-semibold text-gray-700">Date</TableHead>
              <TableHead className="font-semibold text-gray-700">GP Number</TableHead>
              <TableHead className="font-semibold text-gray-700">PI Name</TableHead>
              <TableHead className="font-semibold text-gray-700">Purpose</TableHead>
              <TableHead className="text-right font-semibold text-gray-700">Amount</TableHead>
              <TableHead className="font-semibold text-gray-700">Type</TableHead>
              <TableHead className="font-semibold text-gray-700">Current Stage</TableHead>
              <TableHead className="font-semibold text-gray-700">Status</TableHead>
              <TableHead className="font-semibold text-gray-700">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {requests.map((request) => (
              <TableRow key={request.id} className="hover:bg-gray-50">
                <TableCell className="text-sm text-gray-600">{formatDate(request.createdAt)}</TableCell>
                <TableCell className="font-medium text-gray-900">{request.gpNumber}</TableCell>
                <TableCell className="text-gray-700">{request.piName}</TableCell>
                <TableCell className="max-w-xs truncate text-gray-600">{request.purpose}</TableCell>
                <TableCell className="text-right font-semibold text-gray-900">{formatAmount(request.amount)}</TableCell>
                <TableCell>
                  <Badge variant={request.projectType === "recurring" ? "default" : "secondary"} className="capitalize">
                    {request.projectType}
                  </Badge>
                </TableCell>
                <TableCell>
                  <CurrentStageBadge stage={request.currentStage} />
                </TableCell>
                <TableCell>
                  <StatusBadge status={request.status} />
                </TableCell>
                <TableCell>
                  {showActions && request.status === 'pending' ? (
                    <Button
                      size="sm"
                      onClick={() => handleViewRequest(request)}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      View & Forward
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleViewRequest(request)}
                    >
                      View Details
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-96">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="ml-3 text-muted-foreground">Loading budget requests...</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Budget Request Verification</h1>
            <p className="text-muted-foreground mt-1">
              Review and verify budget requests before forwarding to AR
            </p>
          </div>
          <Button onClick={fetchData} variant="outline" size="sm">
            Refresh
          </Button>
        </div>

        {/* Statistics */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Pending Verification</CardTitle>
              <Clock className="h-4 w-4 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{pendingRequests.length}</div>
              <p className="text-xs text-muted-foreground mt-1">Awaiting your review</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Verified & Forwarded</CardTitle>
              <ArrowRight className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{verifiedRequests.length}</div>
              <p className="text-xs text-muted-foreground mt-1">In approval workflow</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Completed</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{completedRequests.length}</div>
              <p className="text-xs text-muted-foreground mt-1">Fully approved</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Rejected</CardTitle>
              <XCircle className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{rejectedRequests.length}</div>
              <p className="text-xs text-muted-foreground mt-1">Declined requests</p>
            </CardContent>
          </Card>
        </div>

        {/* All Requests with Tabs */}
        <Card>
          <CardHeader>
            <CardTitle>All Budget Requests</CardTitle>
            <CardDescription>
              View all requests in the workflow - You can only take action on pending requests
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-5 bg-gray-100 p-1 h-auto">
                <TabsTrigger 
                  value="all" 
                  className="relative data-[state=active]:bg-white data-[state=active]:text-blue-700 data-[state=active]:shadow-sm py-2.5"
                >
                  All ({allRequests.length})
                </TabsTrigger>
                <TabsTrigger 
                  value="pending" 
                  className="relative data-[state=active]:bg-white data-[state=active]:text-blue-700 data-[state=active]:shadow-sm py-2.5"
                >
                  Pending ({pendingRequests.length})
                  {pendingRequests.length > 0 && (
                    <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-yellow-500 text-white text-xs flex items-center justify-center font-semibold">
                      {pendingRequests.length}
                    </span>
                  )}
                </TabsTrigger>
                <TabsTrigger 
                  value="verified" 
                  className="relative data-[state=active]:bg-white data-[state=active]:text-blue-700 data-[state=active]:shadow-sm py-2.5"
                >
                  Verified ({verifiedRequests.length})
                </TabsTrigger>
                <TabsTrigger 
                  value="completed" 
                  className="relative data-[state=active]:bg-white data-[state=active]:text-blue-700 data-[state=active]:shadow-sm py-2.5"
                >
                  Completed ({completedRequests.length})
                </TabsTrigger>
                <TabsTrigger 
                  value="rejected" 
                  className="relative data-[state=active]:bg-white data-[state=active]:text-blue-700 data-[state=active]:shadow-sm py-2.5"
                >
                  Rejected ({rejectedRequests.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="all" className="mt-6">
                {renderRequestsTable(allRequests, true)}
              </TabsContent>

              <TabsContent value="pending" className="mt-6">
                {renderRequestsTable(pendingRequests, true)}
              </TabsContent>

              <TabsContent value="verified" className="mt-6">
                {renderRequestsTable(verifiedRequests, false)}
              </TabsContent>

              <TabsContent value="completed" className="mt-6">
                {renderRequestsTable(completedRequests, false)}
              </TabsContent>

              <TabsContent value="rejected" className="mt-6">
                {renderRequestsTable(rejectedRequests, false)}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      {/* Budget Request Details Dialog with Timeline */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedRequest?.status === 'pending' ? 'Verify Budget Request' : 'Budget Request Details'}
            </DialogTitle>
            <DialogDescription>
              {selectedRequest?.status === 'pending' 
                ? 'Review the details and forward to AR for approval'
                : 'View the complete details and approval history'
              }
            </DialogDescription>
          </DialogHeader>

          {selectedRequest && (
            <div className="space-y-6">
              {/* Request Details */}
              <div className="space-y-4">
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
                  <div>
                    <p className="text-sm text-muted-foreground">Current Stage</p>
                    <CurrentStageBadge stage={selectedRequest.currentStage} />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Status</p>
                    <StatusBadge status={selectedRequest.status} />
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

                {selectedRequest.invoiceNumber && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Invoice Number</p>
                    <p className="font-mono">{selectedRequest.invoiceNumber}</p>
                  </div>
                )}
              </div>

              <Separator />

              {/* Approval Timeline */}
              <ApprovalTimeline 
                approvalHistory={selectedRequest.approvalHistory || []}
                currentStage={selectedRequest.currentStage}
                status={selectedRequest.status}
              />

              <Separator />

              {/* Remarks Input */}
              {selectedRequest.status === 'pending' && (
                <div className="space-y-2">
                  <Label htmlFor="remarks">Your Remarks (Optional)</Label>
                  <Textarea
                    id="remarks"
                    placeholder="Enter your comments or reasons for verification/rejection"
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    rows={3}
                  />
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            {selectedRequest?.status === 'pending' ? (
              <>
                <Button
                  variant="outline"
                  onClick={() => setDialogOpen(false)}
                  disabled={actionLoading}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleReject}
                  disabled={actionLoading}
                >
                  {actionLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Rejecting...
                    </>
                  ) : (
                    'Reject'
                  )}
                </Button>
                <Button
                  onClick={handleForward}
                  disabled={actionLoading}
                >
                  {actionLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Forwarding...
                    </>
                  ) : (
                    'Forward to AR'
                  )}
                </Button>
              </>
            ) : (
              <Button onClick={() => setDialogOpen(false)}>
                Close
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
};

export default BudgetReview;