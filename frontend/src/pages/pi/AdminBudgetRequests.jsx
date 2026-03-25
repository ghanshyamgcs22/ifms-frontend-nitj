import { useState, useEffect } from "react";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { 
  CheckCircle, 
  XCircle, 
  Eye,
  Filter,
  Search,
  Loader2
} from "lucide-react";

const AdminBudgetRequests = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [verifyDialogOpen, setVerifyDialogOpen] = useState(false);
  const [verifyAction, setVerifyAction] = useState("");
  const [adminRemarks, setAdminRemarks] = useState("");
  const [processing, setProcessing] = useState(false);

  const ADMIN_NAME = "Admin User"; // Get from auth

  useEffect(() => {
    fetchRequests();
  }, [statusFilter]);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      let url = ${import.meta.env.VITE_API_URL}/get-budget-requests.php";
      if (statusFilter !== "all") {
        url += `?status=${statusFilter}`;
      }
      
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.success) {
        setRequests(data.data || []);
      }
    } catch (error) {
      console.error("Error fetching requests:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredRequests = requests.filter(req => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      req.gpNumber.toLowerCase().includes(search) ||
      req.projectTitle.toLowerCase().includes(search) ||
      req.piName.toLowerCase().includes(search) ||
      req.purpose.toLowerCase().includes(search)
    );
  });

  const openVerifyDialog = (request, action) => {
    setSelectedRequest(request);
    setVerifyAction(action);
    setAdminRemarks("");
    setVerifyDialogOpen(true);
  };

  const handleVerify = async () => {
    if (!selectedRequest) return;

    try {
      setProcessing(true);

      const response = await fetch(
        ${import.meta.env.VITE_API_URL}/verify-budget-request.php",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            requestId: selectedRequest.id,
            action: verifyAction,
            adminName: ADMIN_NAME,
            adminRemarks: adminRemarks,
          }),
        }
      );

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.message || "Failed to process request");
      }

      alert(result.message);
      setVerifyDialogOpen(false);
      fetchRequests();
      
    } catch (error) {
      console.error("Error verifying request:", error);
      alert("Error: " + error.message);
    } finally {
      setProcessing(false);
    }
  };

  const getStatusBadge = (status) => {
    const config = {
      'pending_admin_verification': { color: 'bg-amber-100 text-amber-800 border-amber-200', label: 'Pending Verification' },
      'approved': { color: 'bg-green-100 text-green-800 border-green-200', label: 'Approved' },
      'rejected': { color: 'bg-red-100 text-red-800 border-red-200', label: 'Rejected' }
    };
    
    const statusConfig = config[status] || config['pending_admin_verification'];
    
    return (
      <Badge className={`${statusConfig.color} border font-medium`}>
        {statusConfig.label}
      </Badge>
    );
  };

  const stats = {
    total: requests.length,
    pending: requests.filter(r => r.status === 'pending_admin_verification').length,
    approved: requests.filter(r => r.status === 'approved').length,
    rejected: requests.filter(r => r.status === 'rejected').length,
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto" />
            <p className="mt-4 text-gray-600">Loading requests...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-7xl mx-auto space-y-6 pb-12">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-lg border border-blue-100">
          <h1 className="text-3xl font-bold text-gray-900">Budget Requests Verification</h1>
          <p className="text-gray-600 mt-1">
            Review and approve/reject PI budget booking requests
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-sm text-gray-600">Total Requests</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{stats.total}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-sm text-gray-600">Pending</p>
                <p className="text-3xl font-bold text-amber-600 mt-2">{stats.pending}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-sm text-gray-600">Approved</p>
                <p className="text-3xl font-bold text-green-600 mt-2">{stats.approved}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-sm text-gray-600">Rejected</p>
                <p className="text-3xl font-bold text-red-600 mt-2">{stats.rejected}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search by GP Number, Project, PI..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full md:w-56">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending_admin_verification">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Requests Table */}
        <Card>
          <CardHeader>
            <CardTitle>Budget Requests ({filteredRequests.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {filteredRequests.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-500">No requests found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50">
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Date</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Request #</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">GP Number</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">PI Name</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Head</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Purpose</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700">Amount (₹)</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700">Available (₹)</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Status</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRequests.map((request) => (
                      <tr key={request.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {new Date(request.createdAt).toLocaleDateString('en-GB')}
                        </td>
                        <td className="px-4 py-3 text-sm font-semibold text-blue-600">
                          {request.requestNumber}
                        </td>
                        <td className="px-4 py-3 text-sm font-semibold text-gray-900">
                          {request.gpNumber}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-800">
                          {request.piName}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700">
                          <div className="flex flex-col">
                            <span className="font-medium">{request.headName}</span>
                            <span className="text-xs text-gray-500">{request.headType}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700 max-w-xs truncate">
                          {request.purpose}
                        </td>
                        <td className="px-4 py-3 text-sm text-right font-semibold text-gray-900">
                          {parseFloat(request.requestedAmount).toLocaleString("en-IN")}
                        </td>
                        <td className="px-4 py-3 text-sm text-right font-semibold text-green-600">
                          {parseFloat(request.currentHeadAvailable).toLocaleString("en-IN")}
                        </td>
                        <td className="px-4 py-3">
                          {getStatusBadge(request.status)}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-center gap-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setSelectedRequest(request);
                                setViewDialogOpen(true);
                              }}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            {request.status === 'pending_admin_verification' && (
                              <>
                                <Button
                                  size="sm"
                                  onClick={() => openVerifyDialog(request, 'approve')}
                                  className="bg-green-600 hover:bg-green-700"
                                >
                                  <CheckCircle className="h-4 w-4 mr-1" />
                                  Approve
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => openVerifyDialog(request, 'reject')}
                                >
                                  <XCircle className="h-4 w-4 mr-1" />
                                  Reject
                                </Button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* View Dialog */}
        <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Request Details</DialogTitle>
              <DialogDescription>
                Complete information about the budget request
              </DialogDescription>
            </DialogHeader>
            {selectedRequest && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs text-gray-600">Request Number</Label>
                    <p className="font-semibold">{selectedRequest.requestNumber}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-gray-600">GP Number</Label>
                    <p className="font-semibold">{selectedRequest.gpNumber}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-gray-600">PI Name</Label>
                    <p className="font-semibold">{selectedRequest.piName}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-gray-600">PI Email</Label>
                    <p className="font-semibold">{selectedRequest.piEmail}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-gray-600">Head Name</Label>
                    <p className="font-semibold">{selectedRequest.headName}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-gray-600">Amount Requested</Label>
                    <p className="font-semibold text-green-600">
                      ₹{parseFloat(selected Request.requestedAmount).toLocaleString("en-IN")}
                    </p>
                  </div>
                  <div>
                    <Label className="text-xs text-gray-600">Invoice Number</Label>
                    <p className="font-semibold">{selectedRequest.invoiceNumber}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-gray-600">Status</Label>
                    <div className="mt-1">{getStatusBadge(selectedRequest.status)}</div>
                  </div>
                </div>
                <div>
                  <Label className="text-xs text-gray-600">Purpose</Label>
                  <p className="mt-1">{selectedRequest.purpose}</p>
                </div>
                <div>
                  <Label className="text-xs text-gray-600">Description</Label>
                  <p className="mt-1 text-gray-700">{selectedRequest.description}</p>
                </div>
                {selectedRequest.adminRemarks && (
                  <div>
                    <Label className="text-xs text-gray-600">Admin Remarks</Label>
                    <p className="mt-1 text-gray-700">{selectedRequest.adminRemarks}</p>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Verify Dialog */}
        <Dialog open={verifyDialogOpen} onOpenChange={setVerifyDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {verifyAction === 'approve' ? 'Approve' : 'Reject'} Request
              </DialogTitle>
              <DialogDescription>
                {verifyAction === 'approve' 
                  ? 'Approving will book this amount and deduct from available balance'
                  : 'Rejecting will cancel this request'}
              </DialogDescription>
            </DialogHeader>
            {selectedRequest && (
              <div className="space-y-4">
                <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Request Number:</span>
                    <span className="font-semibold">{selectedRequest.requestNumber}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Amount:</span>
                    <span className="font-semibold text-green-600">
                      ₹{parseFloat(selectedRequest.requestedAmount).toLocaleString("en-IN")}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Available Balance:</span>
                    <span className="font-semibold text-blue-600">
                      ₹{parseFloat(selectedRequest.currentHeadAvailable).toLocaleString("en-IN")}
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="adminRemarks">Remarks</Label>
                  <Textarea
                    id="adminRemarks"
                    value={adminRemarks}
                    onChange={(e) => setAdminRemarks(e.target.value)}
                    placeholder="Add your remarks (optional)"
                    rows={3}
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <Button
                    onClick={handleVerify}
                    disabled={processing}
                    className={verifyAction === 'approve' 
                      ? 'flex-1 bg-green-600 hover:bg-green-700' 
                      : 'flex-1 bg-red-600 hover:bg-red-700'}
                  >
                    {processing ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        {verifyAction === 'approve' ? (
                          <><CheckCircle className="h-4 w-4 mr-2" />Approve Request</>
                        ) : (
                          <><XCircle className="h-4 w-4 mr-2" />Reject Request</>
                        )}
                      </>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setVerifyDialogOpen(false)}
                    disabled={processing}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
};

export default AdminBudgetRequests;
