import { useState, useEffect, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon, AlertCircle, CheckCircle, Upload, FileText, X } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface ExtendProjectProps {
  open: boolean;
  onClose: () => void;
  project: {
    id: string;
    gpNumber: string;
    projectName: string;
    piName: string;
    projectStartDate: string;
    projectEndDate: string;
    totalYears: number;
  };
  onSuccess: () => void;
}

const ExtendProject = ({ open, onClose, project, onSuccess }: ExtendProjectProps) => {
  const [extendedEndDate, setExtendedEndDate] = useState<Date | null>(null);
  const [remarks, setRemarks] = useState("");
  const [loading, setLoading] = useState(false);
  const [additionalYears, setAdditionalYears] = useState("0.00");
  const [showSuccess, setShowSuccess] = useState(false);

  // PDF Upload state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (extendedEndDate && project.projectEndDate) {
      const originalEnd = new Date(project.projectEndDate);
      const diffTime = Math.abs(extendedEndDate.getTime() - originalEnd.getTime());
      const diffYears = (diffTime / (1000 * 60 * 60 * 24 * 365.25)).toFixed(2);
      setAdditionalYears(diffYears);
    }
  }, [extendedEndDate, project.projectEndDate]);

  const formatDateDisplay = (dateString: string) => {
    if (!dateString) return "—";
    try {
      return format(new Date(dateString), "PPP");
    } catch {
      return dateString;
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  const handleFileSelect = (file: File) => {
    if (file.type !== "application/pdf") {
      alert("Only PDF files are allowed");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      alert("File size must be less than 10MB");
      return;
    }
    setSelectedFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  };

  const handleSubmit = async () => {
    if (!extendedEndDate) {
      alert("Please select the extended end date");
      return;
    }

    const originalEnd = new Date(project.projectEndDate);
    if (extendedEndDate <= originalEnd) {
      alert("Extended date must be after the original end date");
      return;
    }

    try {
      setLoading(true);

      // Use FormData so we can send both JSON fields and the file in one request
      const formData = new FormData();
      formData.append("projectId", project.id);
      formData.append("gpNumber", project.gpNumber);
      formData.append("originalEndDate", project.projectEndDate);
      formData.append("extendedEndDate", format(extendedEndDate, "yyyy-MM-dd"));
      formData.append("additionalYears", additionalYears);
      formData.append("remarks", remarks || "");
      formData.append("extendedAt", new Date().toISOString());
      formData.append("extendedBy", "admin_user");

      if (selectedFile) {
        formData.append("extensionPdf", selectedFile);
      }

      const response = await fetch(`${import.meta.env.VITE_API_URL}/extend-project.php`, {
        method: "POST",
        body: formData, // no Content-Type header — browser sets multipart boundary automatically
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.message || "Failed to extend project");
      }

      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        onSuccess();
        handleClose();
      }, 2000);
    } catch (error) {
      console.error("Error extending project:", error);
      alert("Error extending project: " + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setExtendedEndDate(null);
    setRemarks("");
    setAdditionalYears("0.00");
    setShowSuccess(false);
    setSelectedFile(null);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
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
                <h3 className="text-2xl font-bold text-gray-900">Extension Confirmed!</h3>
                <p className="text-gray-600">
                  Project {project.gpNumber} has been extended successfully
                </p>
              </div>
              <div className="w-full max-w-md bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg p-4 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Extended To:</span>
                  <span className="text-sm font-semibold text-gray-900">
                    {extendedEndDate ? format(extendedEndDate, "PPP") : "—"}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Additional Years:</span>
                  <span className="text-sm font-semibold text-green-700">+ {additionalYears} years</span>
                </div>
                {selectedFile && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Extension PDF:</span>
                    <span className="text-sm font-semibold text-gray-900">Uploaded âœ“</span>
                  </div>
                )}
              </div>
              <p className="text-xs text-gray-500">This dialog will close automatically...</p>
            </div>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="text-xl font-semibold">Extend Project</DialogTitle>
              <DialogDescription>
                Extend the project end date and provide extension details
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6 py-4">
              {/* Project Info Card */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg border border-blue-100 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">GP Number:</span>
                  <span className="text-sm font-semibold text-gray-900">{project.gpNumber}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Project Title:</span>
                  <span className="text-sm font-medium text-gray-900 text-right max-w-md truncate">{project.projectName}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">PI Name:</span>
                  <span className="text-sm font-medium text-gray-900">{project.piName}</span>
                </div>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700">Project Start Date</Label>
                  <div className="p-3 bg-gray-100 rounded-md border border-gray-200">
                    <p className="text-sm text-gray-900">{formatDateDisplay(project.projectStartDate)}</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700">Original End Date</Label>
                  <div className="p-3 bg-gray-100 rounded-md border border-gray-200">
                    <p className="text-sm text-gray-900">{formatDateDisplay(project.projectEndDate)}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">Original Duration</Label>
                <div className="p-3 bg-gray-100 rounded-md border border-gray-200">
                  <p className="text-sm text-gray-900">{project.totalYears ? `${project.totalYears} years` : "—"}</p>
                </div>
              </div>

              {/* Extended End Date */}
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">
                  Extended End Date <span className="text-red-500">*</span>
                </Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      className={cn("w-full justify-start text-left font-normal border-gray-300", !extendedEndDate && "text-muted-foreground")}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {extendedEndDate ? format(extendedEndDate, "PPP") : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={extendedEndDate || undefined}
                      onSelect={(date) => setExtendedEndDate(date || null)}
                      initialFocus
                      disabled={(date) => date <= new Date(project.projectEndDate)}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Additional Years */}
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">Additional Years (Calculated)</Label>
                <div className="p-3 bg-green-50 rounded-md border border-green-200">
                  <p className="text-sm font-semibold text-green-700">+ {additionalYears} years</p>
                </div>
              </div>

              {/* New Total Duration */}
              {extendedEndDate && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700">New Total Duration</Label>
                  <div className="p-3 bg-blue-50 rounded-md border border-blue-200">
                    <p className="text-sm font-semibold text-blue-700">
                      {(parseFloat(project.totalYears.toString()) + parseFloat(additionalYears)).toFixed(2)} years
                    </p>
                  </div>
                </div>
              )}

              {/* â”€â”€ PDF Upload â”€â”€ */}
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">
                  Extension Letter / Supporting PDF
                  <span className="ml-1 text-xs text-gray-400 font-normal">(Optional, max 10 MB)</span>
                </Label>

                {selectedFile ? (
                  /* File selected — preview card */
                  <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex-shrink-0 bg-green-100 p-2 rounded-md">
                      <FileText className="h-5 w-5 text-green-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{selectedFile.name}</p>
                      <p className="text-xs text-gray-500">{formatFileSize(selectedFile.size)}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => { setSelectedFile(null); if (fileInputRef.current) fileInputRef.current.value = ""; }}
                      className="flex-shrink-0 text-gray-400 hover:text-red-500 transition-colors"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  /* Drop zone */
                  <div
                    onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={cn(
                      "flex flex-col items-center justify-center gap-2 p-6 border-2 border-dashed rounded-lg cursor-pointer transition-colors",
                      dragOver
                        ? "border-blue-400 bg-blue-50"
                        : "border-gray-300 bg-gray-50 hover:border-blue-400 hover:bg-blue-50"
                    )}
                  >
                    <Upload className={cn("h-8 w-8", dragOver ? "text-blue-500" : "text-gray-400")} />
                    <div className="text-center">
                      <p className="text-sm font-medium text-gray-700">
                        Drag & drop a PDF, or <span className="text-blue-600 underline">browse</span>
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">PDF only Â· Max 10 MB</p>
                    </div>
                  </div>
                )}

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="application/pdf"
                  className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileSelect(f); }}
                />
              </div>

              {/* Remarks */}
              <div className="space-y-2">
                <Label htmlFor="remarks" className="text-sm font-medium text-gray-700">Remarks (Optional)</Label>
                <Textarea
                  id="remarks"
                  placeholder="Enter remarks about the extension..."
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  className="min-h-[100px] border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                />
              </div>

              {/* Note */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex gap-3">
                  <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-blue-900">Note:</p>
                    <p className="text-sm text-blue-800">
                      The project end date will be updated to the extended date. This extension will be recorded in the project history.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Buttons */}
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button type="button" variant="outline" onClick={handleClose} disabled={loading} className="border-gray-300 hover:bg-gray-50">
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleSubmit}
                disabled={loading || !extendedEndDate}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {loading ? "Processing..." : "Confirm Extension"}
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ExtendProject;
