import { useState, useEffect } from "react";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  Plus,
  Trash2,
  DollarSign,
  CheckCircle,
  AlertCircle,
  Upload,
  FileText,
  Edit2,
  Check,
  X,
  CalendarIcon,
  RefreshCw,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

const CreateProject = () => {
  const navigate = useNavigate();
  const [headType, setHeadType] = useState("all");
  const [projectHeads, setProjectHeads] = useState([]);
  const [allocations, setAllocations] = useState([]);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(false);
  const [nextGPNumber, setNextGPNumber] = useState("");
  const [isEditingGP, setIsEditingGP] = useState(false);
  const [gpNumberInfo, setGpNumberInfo] = useState(null);
  const [editingAllocationId, setEditingAllocationId] = useState(null);
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [loadingGP, setLoadingGP] = useState(false);
  
  const [formData, setFormData] = useState({
    gpNumber: "",
    modeOfProject: "",
    projectName: "",
    projectAgencyName: "",
    sanctionOrderNo: "",
    nameOfScheme: "",
    piName: "",
    piEmail: "",
    department: "",
    totalYears: "",
    totalSanctionedAmount: "",
    sanctionedLetterFile: null,
  });

  useEffect(() => {
    fetchNextGPNumber();
    fetchProjectHeads();
  }, []);

  const fetchNextGPNumber = async () => {
    try {
      setLoadingGP(true);
      const response = await fetch("https://ifms-backend-nitj.onrender.com/api/get-next-gp-number.php");
      const data = await response.json();
      
      if (data.success) {
        setNextGPNumber(data.data.gpNumber);
        setGpNumberInfo(data.data);
        setFormData(prev => ({ ...prev, gpNumber: data.data.gpNumber }));
      } else {
        console.error("Failed to fetch GP number:", data.message);
        alert("Failed to generate GP number. Please try again.");
      }
    } catch (error) {
      console.error("Error fetching GP number:", error);
      alert("Error generating GP number. Please check your connection.");
    } finally {
      setLoadingGP(false);
    }
  };

  const fetchProjectHeads = async () => {
    try {
      const response = await fetch("https://ifms-backend-nitj.onrender.com/api/project-heads.php");
      const data = await response.json();
      
      if (data.success) {
        setProjectHeads(data.data);
      } else {
        alert("Failed to load project heads. Please refresh the page.");
      }
    } catch (error) {
      console.error("Error fetching project heads:", error);
      alert("Error loading project heads. Please check your connection.");
    }
  };

  // Auto-calculate project duration when dates change
  useEffect(() => {
    if (startDate && endDate) {
      const diffTime = Math.abs(endDate - startDate);
      const diffYears = (diffTime / (1000 * 60 * 60 * 24 * 365.25)).toFixed(2);
      setFormData(prev => ({ ...prev, totalYears: diffYears }));
    }
  }, [startDate, endDate]);

  const filteredHeads = projectHeads.filter(head => 
    headType === "all" ? true : head.type === headType
  );

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name, value) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.type !== 'application/pdf') {
        alert('Only PDF files are allowed');
        e.target.value = '';
        return;
      }
      
      if (file.size > 10 * 1024 * 1024) {
        alert('File size must be less than 10MB');
        e.target.value = '';
        return;
      }
      
      setFormData(prev => ({ ...prev, sanctionedLetterFile: file }));
      setUploadedFile({
        name: file.name,
        size: (file.size / 1024).toFixed(2) + ' KB',
        type: file.type
      });
    }
  };

  const addAllocation = (headId, headName, headType) => {
    if (!allocations.find(a => a.headId === headId)) {
      setAllocations(prev => [...prev, {
        id: Date.now(),
        headId,
        headName,
        headType,
        sanctionedAmount: "",
        isConfirmed: false,
      }]);
    }
  };

  const updateAllocation = (id, value) => {
    setAllocations(prev =>
      prev.map(alloc =>
        alloc.id === id ? { ...alloc, sanctionedAmount: value, isConfirmed: false } : alloc
      )
    );
  };

  const confirmAllocation = (id) => {
    const allocation = allocations.find(a => a.id === id);
    if (!allocation.sanctionedAmount || parseFloat(allocation.sanctionedAmount) <= 0) {
      alert("Please enter a valid amount");
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
  };

  const cancelEditAllocation = () => {
    setEditingAllocationId(null);
  };

  const saveEditAllocation = (id) => {
    const allocation = allocations.find(a => a.id === id);
    if (!allocation.sanctionedAmount || parseFloat(allocation.sanctionedAmount) <= 0) {
      alert("Please enter a valid amount");
      return;
    }
    setEditingAllocationId(null);
  };

  const removeAllocation = (id) => {
    setAllocations(prev => prev.filter(alloc => alloc.id !== id));
  };

  const calculateTotalAllocated = () => {
    return allocations.reduce((sum, alloc) => {
      return sum + (parseFloat(alloc.sanctionedAmount) || 0);
    }, 0);
  };

  const getRemainingBudget = () => {
    const total = parseFloat(formData.totalSanctionedAmount) || 0;
    const allocated = calculateTotalAllocated();
    return total - allocated;
  };

  const handleGPEdit = () => {
    setIsEditingGP(true);
  };

  const handleGPSave = () => {
    // Validate GP number format
    const gpPattern = /^GP\/\d{2}-\d{2}\/\d{3}$/;
    if (!gpPattern.test(formData.gpNumber)) {
      alert("Invalid GP Number format. Expected: GP/YY-YY/XXX (e.g., GP/25-26/001)");
      return;
    }
    setIsEditingGP(false);
  };

  const handleGPCancel = () => {
    // Reset to auto-generated number
    setFormData(prev => ({ ...prev, gpNumber: nextGPNumber }));
    setIsEditingGP(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.modeOfProject || !formData.projectName || !formData.piName || 
        !formData.department || !formData.totalSanctionedAmount) {
      alert("Please fill all required fields");
      return;
    }

    if (!startDate || !endDate) {
      alert("Please select project start and end dates");
      return;
    }

    if (!formData.sanctionedLetterFile) {
      alert("Please upload the sanction letter");
      return;
    }

    const unconfirmedAllocations = allocations.filter(a => !a.isConfirmed);
    if (unconfirmedAllocations.length > 0) {
      alert("Please confirm all allocations before submitting");
      return;
    }

    if (allocations.length > 0) {
      const remaining = getRemainingBudget();
      if (remaining < 0) {
        alert("Total allocated amount exceeds the sanctioned amount!");
        return;
      }
    }

    try {
      setUploadProgress(true);

      const projectData = {
        ...formData,
        projectStartYear: startDate.getFullYear().toString(),
        projectStartMonth: (startDate.getMonth() + 1).toString(),
        projectStartDate: startDate.getDate().toString(),
        projectEndYear: endDate.getFullYear().toString(),
        projectEndMonth: (endDate.getMonth() + 1).toString(),
        projectEndDate: endDate.getDate().toString(),
        isOldProject: false,
        allocations: allocations.map(alloc => ({
          id: (new Date().getTime() + Math.random()).toString(),
          headId: alloc.headId,
          headName: alloc.headName,
          headType: alloc.headType,
          sanctionedAmount: parseFloat(alloc.sanctionedAmount) || 0,
        })),
        status: "pending",
        createdAt: new Date().toISOString(),
      };

      delete projectData.sanctionedLetterFile;

      const response = await fetch("https://ifms-backend-nitj.onrender.com/api/projects.php", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(projectData),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.message || "Failed to create project");
      }

      const projectId = result.id;
      const gpNumber = result.gpNumber;

      if (formData.sanctionedLetterFile) {
        const formDataFile = new FormData();
        formDataFile.append('file', formData.sanctionedLetterFile);
        formDataFile.append('projectId', projectId);
        formDataFile.append('gpNumber', gpNumber);
        formDataFile.append('fileType', 'sanction_letter');
        formDataFile.append('uploadedBy', 'admin_user');

        const fileResponse = await fetch("https://ifms-backend-nitj.onrender.com/api/upload-file.php", {
          method: "POST",
          body: formDataFile,
        });

        const fileResult = await fileResponse.json();

        if (!fileResult.success) {
          console.warn("File upload failed:", fileResult.message);
          alert(`Project created with GP Number: ${gpNumber}, but file upload failed.`);
        }
      }

      alert(`Project created successfully! GP Number: ${gpNumber}`);
      navigate("/admin/projects");
      
    } catch (error) {
      console.error("Error creating project:", error);
      alert("Error creating project: " + error.message);
    } finally {
      setUploadProgress(false);
    }
  };

  return (
    <Layout>
      <div className="max-w-4xl mx-auto space-y-6 pb-12">
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-lg border border-blue-100">
          <h1 className="text-3xl font-bold text-gray-900">Create Project</h1>
          <p className="text-gray-600 mt-2">
            Register a new research project and assign GP number
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <Card className="border-gray-200 shadow-sm">
            <CardHeader className="bg-gray-50 border-b border-gray-200">
              <CardTitle className="text-lg font-semibold text-gray-900">Project Details</CardTitle>
              <CardDescription>Enter complete project information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-6">
              {/* GP Number and Mode */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700">
                    Allotted GP Number <span className="text-red-500">*</span>
                  </Label>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 relative">
                      <Input
                        value={formData.gpNumber}
                        onChange={(e) => handleInputChange({ target: { name: 'gpNumber', value: e.target.value }})}
                        disabled={!isEditingGP}
                        className={`border-gray-300 ${!isEditingGP ? 'bg-gray-100' : 'focus:border-blue-500 focus:ring-blue-500'}`}
                      />
                      {loadingGP && (
                        <RefreshCw className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-blue-600" />
                      )}
                    </div>
                    {!isEditingGP ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleGPEdit}
                        className="border-blue-500 text-blue-600 hover:bg-blue-50"
                        title="Edit GP Number"
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                    ) : (
                      <>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={handleGPSave}
                          className="border-green-500 text-green-600 hover:bg-green-50"
                          title="Save GP Number"
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={handleGPCancel}
                          className="border-red-500 text-red-600 hover:bg-red-50"
                          title="Cancel and use auto-generated"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                  </div>
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>Format: GP/YY-YY/XXX</span>
                    {gpNumberInfo && (
                      <span className="text-blue-600 font-medium">
                        FY {gpNumberInfo.financialYear} #{gpNumberInfo.sequenceNumber}
                      </span>
                    )}
                  </div>
                  {gpNumberInfo && gpNumberInfo.lastGPNumber && (
                    <p className="text-xs text-gray-500">
                      Last assigned: {gpNumberInfo.lastGPNumber}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="modeOfProject" className="text-sm font-medium text-gray-700">
                    Mode of Project <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={formData.modeOfProject}
                    onValueChange={(value) => handleSelectChange("modeOfProject", value)}
                  >
                    <SelectTrigger className="border-gray-300 focus:border-blue-500 focus:ring-blue-500">
                      <SelectValue placeholder="Select Option" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="govt-funded">Government Funded Project</SelectItem>
                      <SelectItem value="sponsored">Sponsored Project</SelectItem>
                      <SelectItem value="consultancy">Consultancy Project</SelectItem>
                      <SelectItem value="internal">Internal Project</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Rest of the form fields remain the same... */}
              {/* Project Name */}
              <div className="space-y-2">
                <Label htmlFor="projectName" className="text-sm font-medium text-gray-700">
                  Project Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="projectName"
                  name="projectName"
                  placeholder="Enter Project Name"
                  value={formData.projectName}
                  onChange={handleInputChange}
                  className="border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                  required
                />
              </div>

              {/* Project Agency Name */}
              <div className="space-y-2">
                <Label htmlFor="projectAgencyName" className="text-sm font-medium text-gray-700">
                  Project Agency Name
                </Label>
                <Input
                  id="projectAgencyName"
                  name="projectAgencyName"
                  placeholder="Enter Project Agency Name"
                  value={formData.projectAgencyName}
                  onChange={handleInputChange}
                  className="border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                />
              </div>

              {/* Sanction Order */}
              <div className="space-y-2">
                <Label htmlFor="sanctionOrderNo" className="text-sm font-medium text-gray-700">
                  Sanction Order No. and Date
                </Label>
                <Input
                  id="sanctionOrderNo"
                  name="sanctionOrderNo"
                  placeholder="Enter Sanction Order No. and Date"
                  value={formData.sanctionOrderNo}
                  onChange={handleInputChange}
                  className="border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                />
              </div>

              {/* PI Name */}
              <div className="space-y-2">
                <Label htmlFor="piName" className="text-sm font-medium text-gray-700">
                  Principal Investigator Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="piName"
                  name="piName"
                  placeholder="Enter PI Name"
                  value={formData.piName}
                  onChange={handleInputChange}
                  className="border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                  required
                />
              </div>

              {/* PI Email */}
              <div className="space-y-2">
                <Label htmlFor="piEmail" className="text-sm font-medium text-gray-700">
                  Principal Investigator Email
                </Label>
                <Input
                  id="piEmail"
                  name="piEmail"
                  type="email"
                  placeholder="Enter PI Email"
                  value={formData.piEmail}
                  onChange={handleInputChange}
                  className="border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                />
              </div>

              {/* Department */}
              <div className="space-y-2">
                <Label htmlFor="department" className="text-sm font-medium text-gray-700">
                  Department <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={formData.department}
                  onValueChange={(value) => handleSelectChange("department", value)}
                >
                  <SelectTrigger className="border-gray-300 focus:border-blue-500 focus:ring-blue-500">
                    <SelectValue placeholder="Select Department" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Computer Science">Computer Science</SelectItem>
                    <SelectItem value="Electrical Engineering">Electrical Engineering</SelectItem>
                    <SelectItem value="Mechanical Engineering">Mechanical Engineering</SelectItem>
                    <SelectItem value="Civil Engineering">Civil Engineering</SelectItem>
                    <SelectItem value="Physics">Physics</SelectItem>
                    <SelectItem value="Chemistry">Chemistry</SelectItem>
                    <SelectItem value="Mathematics">Mathematics</SelectItem>
                    <SelectItem value="Biotechnology">Biotechnology</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Name of the Scheme */}
              <div className="space-y-2">
                <Label htmlFor="nameOfScheme" className="text-sm font-medium text-gray-700">
                  Name of the Scheme
                </Label>
                <Input
                  id="nameOfScheme"
                  name="nameOfScheme"
                  placeholder="Name of the Scheme"
                  value={formData.nameOfScheme}
                  onChange={handleInputChange}
                  className="border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                />
              </div>

              {/* Date Pickers - Calendar */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700">
                    Project Start Date <span className="text-red-500">*</span>
                  </Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal border-gray-300 hover:bg-gray-50",
                          !startDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {startDate ? format(startDate, "PPP") : <span>Pick a date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={startDate}
                        onSelect={setStartDate}
                        initialFocus
                        disabled={(date) => endDate && date > endDate}
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700">
                    Project End Date <span className="text-red-500">*</span>
                  </Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal border-gray-300 hover:bg-gray-50",
                          !endDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {endDate ? format(endDate, "PPP") : <span>Pick a date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={endDate}
                        onSelect={setEndDate}
                        initialFocus
                        disabled={(date) => startDate && date < startDate}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              {/* Total Years and Sanctioned Amount */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="totalYears" className="text-sm font-medium text-gray-700">
                    Total Years of Project <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="totalYears"
                    name="totalYears"
                    type="number"
                    step="0.01"
                    placeholder="Auto-calculated"
                    value={formData.totalYears}
                    readOnly
                    className="bg-gray-100 border-gray-300"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="totalSanctionedAmount" className="text-sm font-medium text-gray-700">
                    Total Sanctioned Amount <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="totalSanctionedAmount"
                    name="totalSanctionedAmount"
                    type="number"
                    placeholder="Enter amount"
                    value={formData.totalSanctionedAmount}
                    onChange={handleInputChange}
                    className="border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>

              {/* File Upload */}
              <div className="space-y-2">
                <Label htmlFor="sanctionedLetterFile" className="text-sm font-medium text-gray-700">
                  Upload Project Sanctioned Letter (PDF only) <span className="text-red-500">*</span>
                </Label>
                <div className="flex items-center gap-4">
                  <label
                    htmlFor="sanctionedLetterFile"
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md cursor-pointer transition-colors duration-200 font-medium shadow-sm"
                  >
                    <Upload className="h-4 w-4" />
                    Choose File
                  </label>
                  <input
                    id="sanctionedLetterFile"
                    type="file"
                    accept=".pdf"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  {uploadedFile ? (
                    <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 px-3 py-2 rounded-md border border-green-200">
                      <FileText className="h-4 w-4" />
                      <span className="font-medium">{uploadedFile.name}</span>
                      <span className="text-gray-500">({uploadedFile.size})</span>
                    </div>
                  ) : (
                    <span className="text-sm text-gray-500">No file chosen</span>
                  )}
                </div>
                <p className="text-xs text-gray-500">Maximum file size: 10MB</p>
              </div>
            </CardContent>
          </Card>

          {/* Fund Allocation Section - Keep the same from previous code */}
          <Card className="mt-6 border-gray-200 shadow-sm">
            <CardHeader className="bg-gray-50 border-b border-gray-200">
              <CardTitle className="text-lg font-semibold text-gray-900">
                Allocate Head-wise Sanctioned Amount
              </CardTitle>
              <CardDescription>
                Allocate sanctioned amount across different project heads
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-6 pt-6">
              {/* Budget Summary */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-100">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-lg bg-blue-100">
                    <DollarSign className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 font-medium">Total Sanctioned</p>
                    <p className="text-lg font-bold text-gray-900">
                      ₹{parseFloat(formData.totalSanctionedAmount || 0).toLocaleString("en-IN")}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-lg bg-green-100">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 font-medium">Allocated</p>
                    <p className="text-lg font-bold text-green-600">
                      ₹{calculateTotalAllocated().toLocaleString("en-IN")}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className={`p-3 rounded-lg ${getRemainingBudget() < 0 ? 'bg-red-100' : 'bg-yellow-100'}`}>
                    <AlertCircle className={`h-5 w-5 ${getRemainingBudget() < 0 ? 'text-red-600' : 'text-yellow-600'}`} />
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 font-medium">Remaining</p>
                    <p className={`text-lg font-bold ${getRemainingBudget() < 0 ? 'text-red-600' : 'text-yellow-600'}`}>
                      ₹{getRemainingBudget().toLocaleString("en-IN")}
                    </p>
                  </div>
                </div>
              </div>

              {/* Head Type Filter */}
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">Select Head Type</Label>
                <Select value={headType} onValueChange={setHeadType}>
                  <SelectTrigger className="border-gray-300 focus:border-blue-500 focus:ring-blue-500">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Heads</SelectItem>
                    <SelectItem value="recurring">Recurring</SelectItem>
                    <SelectItem value="non-recurring">Non-Recurring</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Available Heads */}
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">
                  Available Project Heads ({filteredHeads.length})
                </Label>
                {filteredHeads.length === 0 ? (
                  <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg border border-gray-200">
                    <p>No project heads available. Please contact administrator.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {filteredHeads.map(head => (
                      <Button
                        key={head.id}
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => addAllocation(head.id, head.name, head.type)}
                        disabled={allocations.some(a => a.headId === head.id)}
                        className="justify-start border-gray-300 hover:bg-blue-50 hover:border-blue-500 disabled:opacity-50"
                      >
                        <Plus className="h-3 w-3 mr-2" />
                        {head.name}
                      </Button>
                    ))}
                  </div>
                )}
              </div>

              {/* Allocations List */}
              {allocations.length > 0 && (
                <div className="space-y-3">
                  <Label className="text-base font-semibold text-gray-900">Head-wise Sanctioned Amount</Label>
                  {allocations.map((allocation) => (
                    <div key={allocation.id} className="flex items-center gap-4 p-4 border border-gray-200 rounded-lg bg-white hover:shadow-sm transition-shadow">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <p className="font-medium text-gray-900">{allocation.headName}</p>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                            allocation.headType === "recurring" 
                              ? "bg-blue-100 text-blue-700" 
                              : "bg-gray-100 text-gray-700"
                          }`}>
                            {allocation.headType}
                          </span>
                          {allocation.isConfirmed && (
                            <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-green-100 text-green-700">
                              ✓ Confirmed
                            </span>
                          )}
                        </div>
                        <Input
                          type="number"
                          placeholder="Enter sanctioned amount"
                          value={allocation.sanctionedAmount}
                          onChange={(e) => updateAllocation(allocation.id, e.target.value)}
                          disabled={allocation.isConfirmed && editingAllocationId !== allocation.id}
                          className={`border-gray-300 ${
                            allocation.isConfirmed && editingAllocationId !== allocation.id 
                              ? 'bg-gray-100' 
                              : 'focus:border-blue-500 focus:ring-blue-500'
                          }`}
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        {!allocation.isConfirmed ? (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => confirmAllocation(allocation.id)}
                            className="border-green-500 text-green-600 hover:bg-green-50"
                          >
                            <Check className="h-4 w-4 mr-1" />
                            Confirm
                          </Button>
                        ) : editingAllocationId === allocation.id ? (
                          <>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => saveEditAllocation(allocation.id)}
                              className="border-green-500 text-green-600 hover:bg-green-50"
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={cancelEditAllocation}
                              className="border-gray-300 text-gray-600 hover:bg-gray-50"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </>
                        ) : (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => editAllocation(allocation.id)}
                            className="border-blue-500 text-blue-600 hover:bg-blue-50"
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeAllocation(allocation.id)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {allocations.length === 0 && (
                <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg border border-gray-200">
                  <p>No allocations added yet. Select project heads from above to allocate funds.</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate("/admin")}
              className="border-gray-300 hover:bg-gray-50 text-gray-700 font-medium"
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={uploadProgress}
              className="bg-green-600 hover:bg-green-700 text-white font-medium shadow-sm"
            >
              {uploadProgress ? (
                <>
                  <Upload className="h-4 w-4 mr-2 animate-spin" />
                  Creating Project...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Create Project
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </Layout>
  );
};

export default CreateProject;
