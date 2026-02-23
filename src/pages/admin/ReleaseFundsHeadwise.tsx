import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import {
  DollarSign,
  CheckCircle,
  AlertCircle,
  CalendarIcon,
  Info,
  Edit2,
  Check,
  X,
  History,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

interface ReleaseFundsHeadwiseProps {
  open: boolean;
  onClose: () => void;
  project: {
    id: string;
    gpNumber: string;
    projectName: string;
    piName: string;
    totalSanctionedAmount: number;
    totalReleasedAmount: number;
  };
  onSuccess: () => void;
}

const ReleaseFundsHeadwise = ({ open, onClose, project, onSuccess }: ReleaseFundsHeadwiseProps) => {
  const [allocations, setAllocations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [letterDate, setLetterDate] = useState(null);
  const [letterNumber, setLetterNumber] = useState("");
  const [remarks, setRemarks] = useState("");
  const [totalReleaseAmount, setTotalReleaseAmount] = useState("");
  const [editingAllocationId, setEditingAllocationId] = useState(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [expandedHistoryId, setExpandedHistoryId] = useState(null);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (open && project.id) {
      fetchAllocations();
      resetForm();
    }
  }, [open, project.id]);

  const resetForm = () => {
    setLetterNumber("");
    setTotalReleaseAmount("");
    setRemarks("");
    setLetterDate(null);
    setErrors({});
    setEditingAllocationId(null);
    setExpandedHistoryId(null);
  };

  const fetchAllocations = async () => {
    try {
      setLoading(true);
      
      const response = await fetch(
        `https://ifms-backend-nitj.onrender.com/api/fund-allocations.php?projectId=${project.id}`
      );
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.message || 'Failed to fetch allocations');
      }

      if (data.data && Array.isArray(data.data) && data.data.length > 0) {
        const formattedAllocations = data.data.map(alloc => ({
          id: alloc.id,
          headId: alloc.headId,
          headName: alloc.headName,
          headType: alloc.headType,
          sanctionedAmount: parseFloat(alloc.sanctionedAmount || 0),
          alreadyReleased: parseFloat(alloc.releasedAmount || 0),
          availableToRelease: parseFloat(alloc.remainingAmount || 0),
          releaseAmount: "",
          isConfirmed: false,
          releaseHistory: alloc.releaseHistory || [],
        }));
        setAllocations(formattedAllocations);
      } else {
        setAllocations([]);
      }
    } catch (error) {
      console.error("Error fetching allocations:", error);
      alert("Error: " + error.message);
      setAllocations([]);
    } finally {
      setLoading(false);
    }
  };

  const updateReleaseAmount = (id, value) => {
    const newErrors = { ...errors };
    delete newErrors[id];
    
    setAllocations(prev =>
      prev.map(alloc => {
        if (alloc.id === id) {
          const releaseAmount = value === "" ? "" : parseFloat(value);
          
          // Validation
          if (releaseAmount !== "" && releaseAmount > alloc.availableToRelease) {
            newErrors[id] = `Cannot exceed ₹${alloc.availableToRelease.toLocaleString("en-IN")}`;
            return alloc;
          }
          
          if (releaseAmount !== "" && releaseAmount <= 0) {
            newErrors[id] = "Amount must be greater than 0";
            return alloc;
          }
          
          return { ...alloc, releaseAmount: value, isConfirmed: false };
        }
        return alloc;
      })
    );
    
    setErrors(newErrors);
  };

  const confirmAllocation = (id) => {
    const allocation = allocations.find(a => a.id === id);
    
    if (!allocation.releaseAmount || parseFloat(allocation.releaseAmount) <= 0) {
      alert("Please enter a valid release amount greater than 0");
      return;
    }

    if (!totalReleaseAmount || parseFloat(totalReleaseAmount) <= 0) {
      alert("Please enter the total release amount first");
      return;
    }

    if (parseFloat(allocation.releaseAmount) > allocation.availableToRelease) {
      alert(`Release amount exceeds available amount for this head`);
      return;
    }

    const currentHeadwiseSum = getHeadwiseReleaseSum();
    const userTotal = parseFloat(totalReleaseAmount);
    
    if (currentHeadwiseSum > userTotal) {
      alert(`Total head-wise allocations would exceed the total release amount. Please adjust amounts.`);
      return;
    }
    
    setAllocations(prev =>
      prev.map(alloc =>
        alloc.id === id ? { ...alloc, isConfirmed: true } : alloc
      )
    );
    setEditingAllocationId(null);
  };

  const editAllocation = (id) => {
    setEditingAllocationId(id);
    setAllocations(prev =>
      prev.map(alloc =>
        alloc.id === id ? { ...alloc, isConfirmed: false } : alloc
      )
    );
  };

  const cancelEditAllocation = () => {
    setEditingAllocationId(null);
    fetchAllocations();
  };

  const getHeadwiseReleaseSum = () => {
    return allocations.reduce((sum, alloc) => {
      return sum + (parseFloat(alloc.releaseAmount) || 0);
    }, 0);
  };

  const getTotalSanctioned = () => {
    return parseFloat(project.totalSanctionedAmount) || 0;
  };

  const getAlreadyReleased = () => {
    return parseFloat(project.totalReleasedAmount) || 0;
  };

  const getAvailableToRelease = () => {
    return getTotalSanctioned() - getAlreadyReleased();
  };

  const handleRelease = async () => {
    const userEnteredRelease = parseFloat(totalReleaseAmount) || 0;
    
    // Validations
    if (!totalReleaseAmount || userEnteredRelease <= 0) {
      alert("Please enter the total release amount");
      return;
    }

    if (userEnteredRelease > getAvailableToRelease()) {
      alert(`Release amount exceeds available amount`);
      return;
    }

    const allocationsToRelease = allocations.filter(a => parseFloat(a.releaseAmount) > 0);
    
    if (allocationsToRelease.length === 0) {
      alert("Please enter at least one head-wise release amount");
      return;
    }

    const unconfirmedAllocations = allocationsToRelease.filter(a => !a.isConfirmed);
    if (unconfirmedAllocations.length > 0) {
      alert("Please confirm all head-wise release amounts before proceeding");
      return;
    }

    if (!letterDate) {
      alert("Please select letter date");
      return;
    }

    if (!letterNumber.trim()) {
      alert("Please enter letter/reference number");
      return;
    }

    const headwiseSum = getHeadwiseReleaseSum();
    
    if (headwiseSum > userEnteredRelease) {
      alert(`Sum of head-wise releases exceeds the total release amount. Please adjust.`);
      return;
    }

    // Final validation per head
    for (const alloc of allocationsToRelease) {
      const releaseAmt = parseFloat(alloc.releaseAmount);
      if (releaseAmt > alloc.availableToRelease) {
        alert(`Release amount for ${alloc.headName} exceeds available amount`);
        return;
      }
    }

    try {
      setLoading(true);

      const releaseData = {
  projectId: project.id,
  gpNumber: project.gpNumber,
  letterDate: format(letterDate, "yyyy-MM-dd"),
  letterNumber: letterNumber.trim(),
  remarks: remarks.trim(),
  releasedBy: "Admin",                    // ← ADD THIS (PHP reads releasedBy)
  releases: allocationsToRelease.map(alloc => ({   // ← was "headwiseReleases"
    headId: alloc.headId,
    headName: alloc.headName,
    headType: alloc.headType,
    amount: parseFloat(alloc.releaseAmount),        // ← was "releaseAmount", PHP reads "amount"
  })),
};

      const response = await fetch("https://ifms-backend-nitj.onrender.com/api/release-funds-headwise.php", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(releaseData),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.message || "Failed to release funds");
      }

      setShowSuccess(true);
      
      setTimeout(() => {
        setShowSuccess(false);
        onSuccess();
        handleClose();
      }, 2000);

    } catch (error) {
      console.error("Error releasing funds:", error);
      alert("Error releasing funds: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setAllocations([]);
    resetForm();
    setShowSuccess(false);
    onClose();
  };

  const toggleHistoryExpand = (id) => {
    setExpandedHistoryId(expandedHistoryId === id ? null : id);
  };

  const getStatusBadge = (allocation) => {
    if (allocation.isConfirmed && parseFloat(allocation.releaseAmount) > 0) {
      return <Badge className="bg-green-50 text-green-700 border-green-200">✓ Confirmed</Badge>;
    }
    if (parseFloat(allocation.releaseAmount) > 0) {
      return <Badge className="bg-yellow-50 text-yellow-700 border-yellow-200">Pending</Badge>;
    }
    return <Badge variant="outline" className="bg-gray-50 text-gray-500">Not Set</Badge>;
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-7xl max-h-[90vh] overflow-y-auto">
        {showSuccess ? (
          <div className="py-12">
            <div className="flex flex-col items-center justify-center space-y-6">
              <div className="relative">
                <div className="absolute inset-0 bg-green-100 rounded-full animate-ping opacity-75"></div>
                <div className="relative bg-green-500 rounded-full p-6">
                  <CheckCircle className="h-16 w-16 text-white" strokeWidth={2.5} />
                </div>
              </div>
              
              <div className="text-center space-y-2">
                <h3 className="text-2xl font-bold text-gray-900">Funds Released Successfully!</h3>
                <p className="text-gray-600">
                  ₹{parseFloat(totalReleaseAmount || 0).toLocaleString("en-IN")} released for {project.gpNumber}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="text-xl font-semibold">Release Funds - Head-wise</DialogTitle>
              <DialogDescription>
                Release funds with head-wise allocation and complete validation
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6 py-4">
              {/* Project Summary */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg border border-blue-100">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-600">GP Number</p>
                    <p className="text-sm font-semibold">{project.gpNumber}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">PI Name</p>
                    <p className="text-sm font-semibold">{project.piName}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-xs text-gray-600">Project Title</p>
                    <p className="text-sm font-medium truncate">{project.projectName}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">Total Sanctioned</p>
                    <p className="text-lg font-bold text-blue-600">
                      ₹{getTotalSanctioned().toLocaleString("en-IN")}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">Already Released</p>
                    <p className="text-lg font-bold text-orange-600">
                      ₹{getAlreadyReleased().toLocaleString("en-IN")}
                    </p>
                  </div>
                  <div className="col-span-2 pt-2 border-t border-blue-200">
                    <p className="text-sm text-gray-600 font-medium">Available to Release</p>
                    <p className="text-2xl font-bold text-green-600">
                      ₹{getAvailableToRelease().toLocaleString("en-IN")}
                    </p>
                  </div>
                </div>
              </div>

              {/* Total Release Amount Input */}
              <div className="p-4 bg-gradient-to-r from-indigo-50 to-blue-50 rounded-lg border border-indigo-200">
                <Label htmlFor="totalReleaseAmount" className="text-sm font-semibold mb-2 block">
                  Total Release Amount <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="totalReleaseAmount"
                  type="number"
                  step="0.01"
                  min="0"
                  max={getAvailableToRelease()}
                  value={totalReleaseAmount}
                  onChange={(e) => setTotalReleaseAmount(e.target.value)}
                  placeholder="Enter total amount to release"
                  className="text-lg font-semibold"
                />
                {totalReleaseAmount && parseFloat(totalReleaseAmount) > getAvailableToRelease() && (
                  <p className="text-xs text-red-600 mt-2 font-medium">
                    ⚠ Exceeds available balance of ₹{getAvailableToRelease().toLocaleString("en-IN")}
                  </p>
                )}
                {totalReleaseAmount && parseFloat(totalReleaseAmount) > 0 && 
                 parseFloat(totalReleaseAmount) <= getAvailableToRelease() && (
                  <p className="text-xs text-green-600 mt-2 font-medium flex items-center gap-1">
                    <CheckCircle className="h-3 w-3" />
                    Valid amount - Now allocate to heads below
                  </p>
                )}
              </div>

              {/* Summary Cards */}
              {totalReleaseAmount && parseFloat(totalReleaseAmount) > 0 && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="flex items-center gap-3">
                      <DollarSign className="h-5 w-5 text-blue-600" />
                      <div>
                        <p className="text-xs text-gray-600">Total to Release</p>
                        <p className="text-lg font-bold text-blue-900">
                          ₹{parseFloat(totalReleaseAmount).toLocaleString("en-IN")}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className={`p-4 rounded-lg border ${
                    getHeadwiseReleaseSum() > parseFloat(totalReleaseAmount) 
                      ? 'bg-red-50 border-red-200' 
                      : getHeadwiseReleaseSum() === parseFloat(totalReleaseAmount) && getHeadwiseReleaseSum() > 0
                      ? 'bg-green-50 border-green-200'
                      : 'bg-yellow-50 border-yellow-200'
                  }`}>
                    <div className="flex items-center gap-3">
                      <CheckCircle className={`h-5 w-5 ${
                        getHeadwiseReleaseSum() > parseFloat(totalReleaseAmount)
                          ? 'text-red-600'
                          : getHeadwiseReleaseSum() === parseFloat(totalReleaseAmount) && getHeadwiseReleaseSum() > 0
                          ? 'text-green-600'
                          : 'text-yellow-600'
                      }`} />
                      <div>
                        <p className="text-xs text-gray-600">Head-wise Allocated</p>
                        <p className={`text-lg font-bold ${
                          getHeadwiseReleaseSum() > parseFloat(totalReleaseAmount)
                            ? 'text-red-600'
                            : getHeadwiseReleaseSum() === parseFloat(totalReleaseAmount) && getHeadwiseReleaseSum() > 0
                            ? 'text-green-600'
                            : 'text-yellow-600'
                        }`}>
                          ₹{getHeadwiseReleaseSum().toLocaleString("en-IN")}
                        </p>
                        {getHeadwiseReleaseSum() > parseFloat(totalReleaseAmount) && (
                          <p className="text-xs text-red-600 font-medium">Exceeds total!</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Release Details Form */}
              <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                <div>
                  <Label className="text-sm font-medium">
                    Letter Date <span className="text-red-500">*</span>
                  </Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal mt-2",
                          !letterDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {letterDate ? format(letterDate, "dd-MM-yyyy") : "Pick a date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={letterDate}
                        onSelect={setLetterDate}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div>
                  <Label className="text-sm font-medium">
                    Letter Number <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    value={letterNumber}
                    onChange={(e) => setLetterNumber(e.target.value)}
                    placeholder="REF/2024/001"
                    className="mt-2"
                  />
                </div>

                <div className="col-span-2">
                  <Label className="text-sm font-medium">Remarks (Optional)</Label>
                  <Input
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    placeholder="Additional notes..."
                    className="mt-2"
                  />
                </div>
              </div>

              {/* Head-wise Table */}
              {loading ? (
                <div className="flex justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : allocations.length > 0 ? (
                <div className="space-y-3">
                  <Label className="text-base font-semibold">
                    Head-wise Fund Release ({allocations.length} heads)
                  </Label>
                  
                  {(!totalReleaseAmount || parseFloat(totalReleaseAmount) <= 0) && (
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                      <div className="flex gap-3">
                        <Info className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                        <div className="text-sm text-amber-900">
                          <p className="font-medium mb-1">Enter total release amount first</p>
                          <p>Enter the total amount above, then allocate it across heads below.</p>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <div className="border rounded-lg overflow-hidden">
                    <table className="w-full">
                      <thead className="bg-gray-50 border-b">
                        <tr>
                          <th className="text-left text-xs font-semibold text-gray-700 px-4 py-3">Head Name</th>
                          <th className="text-left text-xs font-semibold text-gray-700 px-4 py-3">Type</th>
                          <th className="text-right text-xs font-semibold text-gray-700 px-4 py-3">Sanctioned</th>
                          <th className="text-right text-xs font-semibold text-gray-700 px-4 py-3">Released</th>
                          <th className="text-right text-xs font-semibold text-gray-700 px-4 py-3">Available</th>
                          <th className="text-right text-xs font-semibold text-gray-700 px-4 py-3 min-w-[150px]">Release Now</th>
                          <th className="text-center text-xs font-semibold text-gray-700 px-4 py-3">Status</th>
                          <th className="text-center text-xs font-semibold text-gray-700 px-4 py-3">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {allocations.map((allocation) => {
                          const isEditing = editingAllocationId === allocation.id;
                          const hasAmount = parseFloat(allocation.releaseAmount || 0) > 0;
                          const hasHistory = allocation.releaseHistory?.length > 0;
                          const isHistoryExpanded = expandedHistoryId === allocation.id;
                          
                          return (
                            <>
                              <tr key={allocation.id} className="hover:bg-gray-50">
                                <td className="px-4 py-3">
                                  <div className="flex items-center gap-2">
                                    {hasHistory && (
                                      <button
                                        onClick={() => toggleHistoryExpand(allocation.id)}
                                        className="text-blue-600 hover:text-blue-800"
                                      >
                                        {isHistoryExpanded ? (
                                          <ChevronUp className="h-4 w-4" />
                                        ) : (
                                          <ChevronDown className="h-4 w-4" />
                                        )}
                                      </button>
                                    )}
                                    <div>
                                      <p className="text-sm font-medium">{allocation.headName}</p>
                                      {hasHistory && (
                                        <p className="text-xs text-blue-600 flex items-center gap-1">
                                          <History className="h-3 w-3" />
                                          {allocation.releaseHistory.length} previous release(s)
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                </td>
                                <td className="px-4 py-3">
                                  <Badge variant="outline" className={
                                    allocation.headType === "recurring"
                                      ? "bg-blue-50 text-blue-700"
                                      : "bg-gray-50 text-gray-700"
                                  }>
                                    {allocation.headType}
                                  </Badge>
                                </td>
                                <td className="px-4 py-3 text-right text-sm font-medium">
                                  ₹{allocation.sanctionedAmount.toLocaleString("en-IN")}
                                </td>
                                <td className="px-4 py-3 text-right text-sm font-medium text-orange-600">
                                  ₹{allocation.alreadyReleased.toLocaleString("en-IN")}
                                </td>
                                <td className="px-4 py-3 text-right text-sm font-bold text-green-600">
                                  ₹{allocation.availableToRelease.toLocaleString("en-IN")}
                                </td>
                                <td className="px-4 py-3">
                                  {isEditing || !allocation.isConfirmed ? (
                                    <div>
                                      <Input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        max={allocation.availableToRelease}
                                        value={allocation.releaseAmount}
                                        onChange={(e) => updateReleaseAmount(allocation.id, e.target.value)}
                                        placeholder="0.00"
                                        disabled={!totalReleaseAmount || parseFloat(totalReleaseAmount) <= 0}
                                        className={`text-right ${
                                          errors[allocation.id] ? 'border-red-500' : ''
                                        }`}
                                      />
                                      {errors[allocation.id] && (
                                        <p className="text-xs text-red-600 mt-1">{errors[allocation.id]}</p>
                                      )}
                                    </div>
                                  ) : (
                                    <span className="text-sm font-semibold text-right block">
                                      {hasAmount ? `₹${parseFloat(allocation.releaseAmount).toLocaleString("en-IN")}` : "—"}
                                    </span>
                                  )}
                                </td>
                                <td className="px-4 py-3 text-center">
                                  {getStatusBadge(allocation)}
                                </td>
                                <td className="px-4 py-3">
                                  <div className="flex justify-center gap-2">
                                    {!allocation.isConfirmed || isEditing ? (
                                      <>
                                        <Button
                                          size="sm"
                                          onClick={() => confirmAllocation(allocation.id)}
                                          disabled={!allocation.releaseAmount || parseFloat(allocation.releaseAmount) <= 0}
                                          className="h-7 bg-green-600 hover:bg-green-700"
                                        >
                                          <Check className="h-3.5 w-3.5 mr-1" />
                                          Confirm
                                        </Button>
                                        {isEditing && (
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={cancelEditAllocation}
                                            className="h-7"
                                          >
                                            <X className="h-3.5 w-3.5" />
                                          </Button>
                                        )}
                                      </>
                                    ) : (
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => editAllocation(allocation.id)}
                                        disabled={!hasAmount}
                                        className="h-7"
                                      >
                                        <Edit2 className="h-3.5 w-3.5 mr-1" />
                                        Edit
                                      </Button>
                                    )}
                                  </div>
                                </td>
                              </tr>
                              
                              {/* Release History Row */}
                              {hasHistory && isHistoryExpanded && (
                                <tr className="bg-blue-50">
                                  <td colSpan={8} className="px-4 py-3">
                                    <div className="space-y-2">
                                      <p className="text-xs font-semibold mb-2">Release History:</p>
                                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                        {allocation.releaseHistory.map((release, idx) => (
                                          <div key={idx} className="bg-white p-3 rounded border text-xs">
                                            <div className="grid grid-cols-2 gap-2">
                                              <div>
                                                <span className="font-medium text-gray-600">Release #:</span>
                                                <span className="ml-2">{release.releaseNumber}</span>
                                              </div>
                                              <div>
                                                <span className="font-medium text-gray-600">Date:</span>
                                                <span className="ml-2">{format(new Date(release.letterDate), "dd-MM-yyyy")}</span>
                                              </div>
                                              <div>
                                                <span className="font-medium text-gray-600">Letter:</span>
                                                <span className="ml-2">{release.letterNumber}</span>
                                              </div>
                                              <div>
                                                <span className="font-medium text-gray-600">Amount:</span>
                                                <span className="ml-2 font-semibold text-green-600">
                                                  ₹{release.releaseAmount.toLocaleString("en-IN")}
                                                </span>
                                              </div>
                                              {release.remarks && (
                                                <div className="col-span-2">
                                                  <span className="font-medium text-gray-600">Remarks:</span>
                                                  <span className="ml-2">{release.remarks}</span>
                                                </div>
                                              )}
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  </td>
                                </tr>
                              )}
                            </>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 bg-gray-50 rounded-lg">
                  <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-600 font-medium">No allocations found</p>
                  <p className="text-sm text-gray-500 mt-1">
                    This project doesn't have any head-wise allocations yet.
                  </p>
                </div>
              )}

              {/* Info Note */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex gap-3">
                  <Info className="h-5 w-5 text-blue-600 flex-shrink-0" />
                  <div className="text-sm text-blue-900">
                    <p className="font-medium mb-1">Note:</p>
                    <p>
                      Released amounts are added cumulatively. Click the dropdown arrow to view previous release history for each head.
                      All validations ensure amounts don't exceed sanctioned or available balances.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button
                variant="outline"
                onClick={handleClose}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                onClick={handleRelease}
                disabled={
                  loading || 
                  allocations.length === 0 || 
                  !totalReleaseAmount ||
                  parseFloat(totalReleaseAmount) <= 0 ||
                  getHeadwiseReleaseSum() === 0 ||
                  getHeadwiseReleaseSum() > parseFloat(totalReleaseAmount || 0) ||
                  !letterDate ||
                  !letterNumber.trim() ||
                  allocations.some(a => parseFloat(a.releaseAmount) > 0 && !a.isConfirmed)
                }
                className="bg-blue-600 hover:bg-blue-700"
              >
                {loading ? "Processing..." : "Confirm Release"}
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ReleaseFundsHeadwise;
