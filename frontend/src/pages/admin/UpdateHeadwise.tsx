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
  DollarSign,
  CheckCircle,
  AlertCircle,
  Edit2,
  Check,
  X,
  Info,
  Lock,
  Unlock,
} from "lucide-react";

interface UpdateHeadwiseProps {
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

type EditMode = 'none' | 'sanctioned' | 'released';

interface Allocation {
  id: string;
  headId: string;
  headName: string;
  headType: string;
  
  // Current DB values (locked reference)
  currentSanctioned: number;
  currentReleased: number;
  
  // Editing values
  editSanctioned: string;
  editReleased: string;
  
  editMode: EditMode;
  isConfirmed: boolean;
}

const UpdateHeadwise = ({ open, onClose, project, onSuccess }: UpdateHeadwiseProps) => {
  const [allocations, setAllocations] = useState<Allocation[]>([]);
  const [loading, setLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  // Fixed project totals (cannot change)
  const FIXED_TOTAL_SANCTIONED = project.totalSanctionedAmount;
  const FIXED_TOTAL_RELEASED = project.totalReleasedAmount;

  useEffect(() => {
    if (open && project.id) {
      fetchExistingAllocations();
    }
  }, [open, project.id]);

  const fetchExistingAllocations = async () => {
    try {
      setLoading(true);
      
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/fund-allocations.php?projectId=${project.id}`
      );
      const data = await response.json();

      if (data.success && data.data && Array.isArray(data.data) && data.data.length > 0) {
        const existingAllocs: Allocation[] = data.data.map(alloc => ({
          id: alloc.id || `${Date.now()}-${Math.random()}`,
          headId: alloc.headId,
          headName: alloc.headName,
          headType: alloc.headType,
          
          currentSanctioned: parseFloat(alloc.sanctionedAmount || 0),
          currentReleased: parseFloat(alloc.releasedAmount || 0),
          
          editSanctioned: (alloc.sanctionedAmount || 0).toString(),
          editReleased: (alloc.releasedAmount || 0).toString(),
          
          editMode: 'none',
          isConfirmed: true,
        }));
        setAllocations(existingAllocs);
      } else {
        // Fallback to project.heads
        const projectResponse = await fetch(
          `${import.meta.env.VITE_API_URL}/projects.php?id=${project.id}`
        );
        const projectData = await projectResponse.json();
        
        if (projectData.success && projectData.data?.heads?.length > 0) {
          const projectHeads: Allocation[] = projectData.data.heads.map(head => ({
            id: head.id || head.headId || `${Date.now()}-${Math.random()}`,
            headId: head.headId,
            headName: head.headName,
            headType: head.headType,
            
            currentSanctioned: parseFloat(head.sanctionedAmount || 0),
            currentReleased: parseFloat(head.releasedAmount || 0),
            
            editSanctioned: (head.sanctionedAmount || 0).toString(),
            editReleased: (head.releasedAmount || 0).toString(),
            
            editMode: 'none',
            isConfirmed: true,
          }));
          setAllocations(projectHeads);
        } else {
          setAllocations([]);
        }
      }
    } catch (error) {
      console.error("Error fetching allocations:", error);
      setAllocations([]);
    } finally {
      setLoading(false);
    }
  };

  const startEdit = (id: string, mode: 'sanctioned' | 'released') => {
    setAllocations(prev =>
      prev.map(alloc => {
        if (alloc.id === id) {
          return {
            ...alloc,
            editMode: mode,
            isConfirmed: false,
          };
        }
        return alloc;
      })
    );
  };

  const updateSanctionedAmount = (id: string, value: string) => {
    setAllocations(prev =>
      prev.map(alloc => {
        if (alloc.id === id) {
          return { ...alloc, editSanctioned: value };
        }
        return alloc;
      })
    );
  };

  const updateReleasedAmount = (id: string, value: string) => {
    setAllocations(prev =>
      prev.map(alloc => {
        if (alloc.id === id) {
          return { ...alloc, editReleased: value };
        }
        return alloc;
      })
    );
  };

  const confirmAllocation = (id: string) => {
    const allocation = allocations.find(a => a.id === id);
    if (!allocation) return;

    const editSanctioned = parseFloat(allocation.editSanctioned || "0");
    const editReleased = parseFloat(allocation.editReleased || "0");

    // Validation 1: Amounts must be >= 0
    if (editSanctioned < 0 || editReleased < 0) {
      alert("Amounts cannot be negative");
      return;
    }

    // Validation 2: Sanctioned must be > 0
    if (editSanctioned <= 0) {
      alert("Sanctioned amount must be greater than 0");
      return;
    }

    // Validation 3: If editing sanctioned, check total sum
    if (allocation.editMode === 'sanctioned') {
      const newTotalSanctioned = allocations.reduce((sum, alloc) => {
        if (alloc.id === id) {
          return sum + editSanctioned;
        }
        return sum + parseFloat(alloc.editSanctioned || "0");
      }, 0);

      if (Math.abs(newTotalSanctioned - FIXED_TOTAL_SANCTIONED) > 0.01) {
        alert(
          `Head-wise sanctioned amounts must sum to ₹${FIXED_TOTAL_SANCTIONED.toLocaleString("en-IN")}\n\n` +
          `Current sum: ₹${newTotalSanctioned.toLocaleString("en-IN")}\n` +
          `Difference: ₹${Math.abs(newTotalSanctioned - FIXED_TOTAL_SANCTIONED).toLocaleString("en-IN")}`
        );
        return;
      }

      // Sanctioned cannot be less than already released
      if (editSanctioned < allocation.currentReleased) {
        alert(
          `Cannot reduce sanctioned amount below already released amount\n\n` +
          `Already released: ₹${allocation.currentReleased.toLocaleString("en-IN")}\n` +
          `Minimum sanctioned: ₹${allocation.currentReleased.toLocaleString("en-IN")}`
        );
        return;
      }
    }

    // Validation 4: If editing released, check against sanctioned
    if (allocation.editMode === 'released') {
      const sanctionedForThisHead = parseFloat(allocation.editSanctioned);
      
      if (editReleased > sanctionedForThisHead) {
        alert(
          `Released amount cannot exceed sanctioned amount for this head\n\n` +
          `Sanctioned: ₹${sanctionedForThisHead.toLocaleString("en-IN")}\n` +
          `Attempted released: ₹${editReleased.toLocaleString("en-IN")}\n\n` +
          `To release more, first increase the sanctioned amount for this head`
        );
        return;
      }

      // Check total released sum
      const newTotalReleased = allocations.reduce((sum, alloc) => {
        if (alloc.id === id) {
          return sum + editReleased;
        }
        return sum + parseFloat(alloc.editReleased || "0");
      }, 0);

      if (newTotalReleased > FIXED_TOTAL_RELEASED) {
        alert(
          `Total released cannot exceed project's total released amount\n\n` +
          `Project total released: ₹${FIXED_TOTAL_RELEASED.toLocaleString("en-IN")}\n` +
          `Attempted total: ₹${newTotalReleased.toLocaleString("en-IN")}`
        );
        return;
      }
    }

    // All validations passed
    setAllocations(prev =>
      prev.map(alloc =>
        alloc.id === id ? { ...alloc, editMode: 'none', isConfirmed: true } : alloc
      )
    );
  };

  const cancelEdit = (id: string) => {
    setAllocations(prev =>
      prev.map(alloc => {
        if (alloc.id === id) {
          return {
            ...alloc,
            editSanctioned: alloc.currentSanctioned.toString(),
            editReleased: alloc.currentReleased.toString(),
            editMode: 'none',
            isConfirmed: true,
          };
        }
        return alloc;
      })
    );
  };

  const getCurrentTotalSanctioned = () => {
    return allocations.reduce((sum, alloc) => {
      return sum + parseFloat(alloc.editSanctioned || "0");
    }, 0);
  };

  const getCurrentTotalReleased = () => {
    return allocations.reduce((sum, alloc) => {
      return sum + parseFloat(alloc.editReleased || "0");
    }, 0);
  };

  const hasChanges = (allocation: Allocation) => {
    const sanctionedChanged = parseFloat(allocation.editSanctioned) !== allocation.currentSanctioned;
    const releasedChanged = parseFloat(allocation.editReleased) !== allocation.currentReleased;
    return sanctionedChanged || releasedChanged;
  };

  const handleUpdate = async () => {
    // Check if all allocations are confirmed
    const unconfirmed = allocations.filter(a => !a.isConfirmed);
    if (unconfirmed.length > 0) {
      alert("Please confirm all allocations before updating");
      return;
    }

    // Final validation: totals must match
    const totalSanctioned = getCurrentTotalSanctioned();
    const totalReleased = getCurrentTotalReleased();

    if (Math.abs(totalSanctioned - FIXED_TOTAL_SANCTIONED) > 0.01) {
      alert(
        `Head-wise sanctioned amounts must equal project total\n\n` +
        `Expected: ₹${FIXED_TOTAL_SANCTIONED.toLocaleString("en-IN")}\n` +
        `Current: ₹${totalSanctioned.toLocaleString("en-IN")}`
      );
      return;
    }

    if (totalReleased > FIXED_TOTAL_RELEASED) {
      alert(
        `Total released cannot exceed project's total released\n\n` +
        `Maximum: ₹${FIXED_TOTAL_RELEASED.toLocaleString("en-IN")}\n` +
        `Current: ₹${totalReleased.toLocaleString("en-IN")}`
      );
      return;
    }

    try {
      setLoading(true);

      const allocationsData = allocations.map(alloc => ({
        id: alloc.id,
        headId: alloc.headId,
        headName: alloc.headName,
        headType: alloc.headType,
        sanctionedAmount: parseFloat(alloc.editSanctioned),
        releasedAmount: parseFloat(alloc.editReleased),
      }));

      const response = await fetch(`${import.meta.env.VITE_API_URL}/update-project-allocations.php`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          projectId: project.id,
          gpNumber: project.gpNumber,
          allocations: allocationsData,
        }),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.message || "Failed to update allocations");
      }

      setShowSuccess(true);
      
      setTimeout(() => {
        setShowSuccess(false);
        onSuccess();
        handleClose();
      }, 2000);

    } catch (error) {
      console.error("Error updating allocations:", error);
      alert("Error updating allocations: " + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setAllocations([]);
    setShowSuccess(false);
    onClose();
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
                <h3 className="text-2xl font-bold text-gray-900">Update Successful!</h3>
                <p className="text-gray-600">
                  Head-wise allocations for {project.gpNumber} have been updated
                </p>
              </div>
            </div>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="text-xl font-semibold">Update Head-wise Allocations</DialogTitle>
              <DialogDescription>
                Modify sanctioned and released amounts for each project head
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6 py-4">
              {/* Project Information */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg border border-blue-100 space-y-2">
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">GP Number:</span>
                    <span className="text-sm font-semibold text-gray-900">{project.gpNumber}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">PI Name:</span>
                    <span className="text-sm font-semibold text-gray-900">{project.piName}</span>
                  </div>
                  <div className="col-span-2 flex justify-between items-center">
                    <span className="text-sm text-gray-600">Project Title:</span>
                    <span className="text-sm font-medium text-gray-900 text-right max-w-md truncate">
                      {project.projectName}
                    </span>
                  </div>
                </div>
              </div>

              {/* Fixed Budget Summary */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg border border-purple-200">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-lg bg-purple-100">
                    <Lock className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 font-medium">Fixed Total Sanctioned</p>
                    <p className="text-lg font-bold text-purple-900">
                      ₹{FIXED_TOTAL_SANCTIONED.toLocaleString("en-IN")}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-lg bg-pink-100">
                    <Lock className="h-5 w-5 text-pink-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 font-medium">Fixed Total Released</p>
                    <p className="text-lg font-bold text-pink-600">
                      ₹{FIXED_TOTAL_RELEASED.toLocaleString("en-IN")}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-lg bg-green-100">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 font-medium">Fixed Remaining</p>
                    <p className="text-lg font-bold text-green-600">
                      ₹{(FIXED_TOTAL_SANCTIONED - FIXED_TOTAL_RELEASED).toLocaleString("en-IN")}
                    </p>
                  </div>
                </div>
              </div>

              {/* Current Edit Summary */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-100">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-lg bg-blue-100">
                    <DollarSign className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 font-medium">Current Edit: Sanctioned</p>
                    <p className={`text-lg font-bold ${
                      Math.abs(getCurrentTotalSanctioned() - FIXED_TOTAL_SANCTIONED) < 0.01
                        ? 'text-green-600'
                        : 'text-red-600'
                    }`}>
                      ₹{getCurrentTotalSanctioned().toLocaleString("en-IN")}
                    </p>
                    {Math.abs(getCurrentTotalSanctioned() - FIXED_TOTAL_SANCTIONED) >= 0.01 && (
                      <p className="text-xs text-red-600">
                        Diff: ₹{Math.abs(getCurrentTotalSanctioned() - FIXED_TOTAL_SANCTIONED).toLocaleString("en-IN")}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-lg bg-orange-100">
                    <CheckCircle className="h-5 w-5 text-orange-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 font-medium">Current Edit: Released</p>
                    <p className={`text-lg font-bold ${
                      getCurrentTotalReleased() <= FIXED_TOTAL_RELEASED
                        ? 'text-green-600'
                        : 'text-red-600'
                    }`}>
                      ₹{getCurrentTotalReleased().toLocaleString("en-IN")}
                    </p>
                    {getCurrentTotalReleased() > FIXED_TOTAL_RELEASED && (
                      <p className="text-xs text-red-600">
                        Exceeds by: ₹{(getCurrentTotalReleased() - FIXED_TOTAL_RELEASED).toLocaleString("en-IN")}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-lg bg-green-100">
                    <AlertCircle className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 font-medium">Current Edit: Remaining</p>
                    <p className="text-lg font-bold text-green-600">
                      ₹{(getCurrentTotalSanctioned() - getCurrentTotalReleased()).toLocaleString("en-IN")}
                    </p>
                  </div>
                </div>
              </div>

              {/* Info Note */}
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <div className="flex gap-3">
                  <Info className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-amber-900 space-y-2">
                    <p className="font-medium">Important Rules:</p>
                    <ul className="list-disc list-inside space-y-1 text-xs">
                      <li>Total project sanctioned (₹{FIXED_TOTAL_SANCTIONED.toLocaleString("en-IN")}) cannot change</li>
                      <li>You can redistribute sanctioned amounts across heads (must sum to ₹{FIXED_TOTAL_SANCTIONED.toLocaleString("en-IN")})</li>
                      <li>Released amount per head cannot exceed that head's sanctioned amount</li>
                      <li>Total released cannot exceed ₹{FIXED_TOTAL_RELEASED.toLocaleString("en-IN")}</li>
                      <li>Click "Edit Sanctioned" or "Edit Released" to modify, then "Confirm" to save</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Allocations Table */}
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : allocations.length > 0 ? (
                <div className="space-y-3">
                  <Label className="text-base font-semibold text-gray-900">
                    Head-wise Amounts ({allocations.length} heads)
                  </Label>
                  
                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-50 border-b border-gray-200">
                          <tr>
                            <th className="text-left text-xs font-semibold text-gray-700 px-4 py-3">Head Name</th>
                            <th className="text-left text-xs font-semibold text-gray-700 px-4 py-3">Type</th>
                            <th className="text-left text-xs font-semibold text-gray-700 px-4 py-3 min-w-[180px]">
                              Current DB Values
                            </th>
                            <th className="text-right text-xs font-semibold text-gray-700 px-4 py-3 min-w-[150px]">
                              Sanctioned (₹)
                            </th>
                            <th className="text-right text-xs font-semibold text-gray-700 px-4 py-3 min-w-[150px]">
                              Released (₹)
                            </th>
                            <th className="text-right text-xs font-semibold text-gray-700 px-4 py-3">
                              Remaining (₹)
                            </th>
                            <th className="text-center text-xs font-semibold text-gray-700 px-4 py-3">Status</th>
                            <th className="text-center text-xs font-semibold text-gray-700 px-4 py-3 min-w-[200px]">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {allocations.map((allocation) => {
                            const changed = hasChanges(allocation);
                            const sanctioned = parseFloat(allocation.editSanctioned || "0");
                            const released = parseFloat(allocation.editReleased || "0");
                            const remaining = sanctioned - released;
                            
                            return (
                              <tr key={allocation.id} className={`hover:bg-gray-50 transition-colors ${changed ? 'bg-blue-50' : ''}`}>
                                <td className="px-4 py-3">
                                  <div>
                                    <p className="text-sm font-medium text-gray-900">{allocation.headName}</p>
                                    {changed && (
                                      <span className="text-xs text-blue-600 font-medium">Modified</span>
                                    )}
                                  </div>
                                </td>
                                <td className="px-4 py-3">
                                  <Badge
                                    variant="outline"
                                    className={`text-xs ${
                                      allocation.headType === "recurring"
                                        ? "bg-blue-50 text-blue-700 border-blue-200"
                                        : "bg-gray-50 text-gray-700 border-gray-200"
                                    }`}
                                  >
                                    {allocation.headType}
                                  </Badge>
                                </td>
                                <td className="px-4 py-3">
                                  <div className="text-xs text-gray-600 space-y-1">
                                    <div className="flex items-center gap-1">
                                      <Lock className="h-3 w-3" />
                                      <span>S: ₹{allocation.currentSanctioned.toLocaleString("en-IN")}</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                      <Lock className="h-3 w-3" />
                                      <span>R: ₹{allocation.currentReleased.toLocaleString("en-IN")}</span>
                                    </div>
                                  </div>
                                </td>
                                <td className="px-4 py-3 text-right">
                                  {allocation.editMode === 'sanctioned' ? (
                                    <Input
                                      type="number"
                                      step="0.01"
                                      min="0"
                                      value={allocation.editSanctioned}
                                      onChange={(e) => updateSanctionedAmount(allocation.id, e.target.value)}
                                      className="w-full text-right border-blue-300 focus:border-blue-500"
                                      autoFocus
                                    />
                                  ) : (
                                    <span className={`text-sm font-semibold ${
                                      sanctioned !== allocation.currentSanctioned
                                        ? 'text-blue-700' 
                                        : 'text-gray-900'
                                    }`}>
                                      {sanctioned.toLocaleString("en-IN")}
                                    </span>
                                  )}
                                </td>
                                <td className="px-4 py-3 text-right">
                                  {allocation.editMode === 'released' ? (
                                    <Input
                                      type="number"
                                      step="0.01"
                                      min="0"
                                      max={sanctioned}
                                      value={allocation.editReleased}
                                      onChange={(e) => updateReleasedAmount(allocation.id, e.target.value)}
                                      className="w-full text-right border-orange-300 focus:border-orange-500"
                                      autoFocus
                                    />
                                  ) : (
                                    <span className={`text-sm font-semibold ${
                                      released !== allocation.currentReleased
                                        ? 'text-orange-600' 
                                        : 'text-orange-500'
                                    }`}>
                                      {released.toLocaleString("en-IN")}
                                    </span>
                                  )}
                                </td>
                                <td className="px-4 py-3 text-right">
                                  <span className="text-sm font-bold text-green-600">
                                    {remaining.toLocaleString("en-IN")}
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-center">
                                  {allocation.isConfirmed ? (
                                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-xs">
                                      ✓ Confirmed
                                    </Badge>
                                  ) : (
                                    <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200 text-xs">
                                      Editing
                                    </Badge>
                                  )}
                                </td>
                                <td className="px-4 py-3">
                                  <div className="flex items-center justify-center gap-2">
                                    {allocation.editMode !== 'none' ? (
                                      <>
                                        <Button
                                          type="button"
                                          size="sm"
                                          onClick={() => confirmAllocation(allocation.id)}
                                          className="h-7 px-3 text-xs bg-green-600 hover:bg-green-700 text-white"
                                        >
                                          <Check className="h-3.5 w-3.5 mr-1" />
                                          Confirm
                                        </Button>
                                        <Button
                                          type="button"
                                          size="sm"
                                          variant="outline"
                                          onClick={() => cancelEdit(allocation.id)}
                                          className="h-7 px-2 border-gray-300"
                                        >
                                          <X className="h-3.5 w-3.5" />
                                        </Button>
                                      </>
                                    ) : (
                                      <>
                                        <Button
                                          type="button"
                                          size="sm"
                                          variant="outline"
                                          onClick={() => startEdit(allocation.id, 'sanctioned')}
                                          className="h-7 px-2 text-xs border-blue-500 text-blue-600 hover:bg-blue-50"
                                        >
                                          <Edit2 className="h-3.5 w-3.5 mr-1" />
                                          Edit S
                                        </Button>
                                        <Button
                                          type="button"
                                          size="sm"
                                          variant="outline"
                                          onClick={() => startEdit(allocation.id, 'released')}
                                          className="h-7 px-2 text-xs border-orange-500 text-orange-600 hover:bg-orange-50"
                                        >
                                          <Edit2 className="h-3.5 w-3.5 mr-1" />
                                          Edit R
                                        </Button>
                                      </>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-200">
                  <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-600 font-medium">No allocations found</p>
                  <p className="text-sm text-gray-500 mt-1">
                    This project doesn't have any head-wise allocations yet.
                  </p>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={loading}
                className="border-gray-300 hover:bg-gray-50"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleUpdate}
                disabled={
                  loading || 
                  allocations.length === 0 ||
                  Math.abs(getCurrentTotalSanctioned() - FIXED_TOTAL_SANCTIONED) >= 0.01 ||
                  getCurrentTotalReleased() > FIXED_TOTAL_RELEASED
                }
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                {loading ? "Updating..." : "Update Allocations"}
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default UpdateHeadwise;
