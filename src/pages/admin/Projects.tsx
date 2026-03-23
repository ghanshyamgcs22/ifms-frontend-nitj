import { useState, useEffect } from "react";
import { Layout } from "@/components/Layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Search, Filter, Download } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { projectAPI } from "@/services/api";
import ExtendProject from "./ExtendProject";
import UpdateHeadwise from "./UpdateHeadwise";
import ReleaseFundsHeadwise from "./ReleaseFundsHeadwise";
import { openProjectReport } from "./ProjectReportWindow";
import { BookedAmountDialog } from "./BookedAmountDialog";
import { ExpenditureDialog }  from "./ExpenditureDialog";

const API = import.meta.env.VITE_API_URL;

const ModernManageProjects = () => {
  const [projects,         setProjects]         = useState([]);
  const [loading,          setLoading]          = useState(true);
  const [searchTerm,       setSearchTerm]       = useState("");
  const [statusFilter,     setStatusFilter]     = useState("all");
  const [downloadingFile,  setDownloadingFile]  = useState(null);
  const [processingAction, setProcessingAction] = useState(null);

  // Dialogs
  const [extensionDialogOpen,         setExtensionDialogOpen]         = useState(false);
  const [selectedProjectForExtension, setSelectedProjectForExtension] = useState(null);
  const [headwiseDialogOpen,          setHeadwiseDialogOpen]          = useState(false);
  const [selectedProjectForHeadwise,  setSelectedProjectForHeadwise]  = useState(null);
  const [releaseDialogOpen,           setReleaseDialogOpen]           = useState(false);
  const [selectedProjectForRelease,   setSelectedProjectForRelease]   = useState(null);

  useEffect(() => { fetchProjects(); }, [searchTerm, statusFilter]);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const response = await projectAPI.getAll(searchTerm, statusFilter);
      if (response.success) setProjects(response.data || []);
      else setProjects([]);
    } catch (error) {
      console.error("Error fetching projects:", error);
      setProjects([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadFile = async (project) => {
    try {
      setDownloadingFile(project.id);
      if (project.files && project.files.length > 0) {
        const sanctionFile = project.files.find((f) => f.fileType === "sanction_letter");
        if (sanctionFile) {
          const fileId = sanctionFile.id || sanctionFile._id;
          if (!fileId) { alert("File ID not found."); return; }
          const response = await fetch(`${API}/download-file.php?id=${fileId}`);
          if (!response.ok) throw new Error("Failed to download file");
          const blob = await response.blob();
          const url  = window.URL.createObjectURL(blob);
          const a    = document.createElement("a");
          a.href = url;
          a.download = sanctionFile.fileName || `${project.gpNumber}_sanction_letter.pdf`;
          document.body.appendChild(a); a.click();
          window.URL.revokeObjectURL(url); document.body.removeChild(a);
        } else { alert("Sanction letter not found"); }
      } else if (project.sanctionedLetterFile) {
        const response = await fetch(`http://localhost:8000${project.sanctionedLetterFile}`);
        if (!response.ok) throw new Error("Failed to download file");
        const blob = await response.blob();
        const url  = window.URL.createObjectURL(blob);
        const a    = document.createElement("a");
        a.href = url;
        a.download = project.sanctionedLetterFileName || `${project.gpNumber}_sanction_letter.pdf`;
        document.body.appendChild(a); a.click();
        window.URL.revokeObjectURL(url); document.body.removeChild(a);
      } else { alert("No sanction letter uploaded"); }
    } catch (error) {
      alert("Failed to download file: " + error.message);
    } finally { setDownloadingFile(null); }
  };

  const handleHeadWise   = (p) => { setSelectedProjectForHeadwise(p);  setHeadwiseDialogOpen(true);  };
  const handleRelease    = (p) => { setSelectedProjectForRelease(p);   setReleaseDialogOpen(true);   };
  const handleExtension  = (p) => { setSelectedProjectForExtension(p); setExtensionDialogOpen(true); };
  const handleViewReport = (p) => openProjectReport(p);

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this project?")) return;
    try {
      setProcessingAction(id);
      const response = await projectAPI.delete(id);
      if (response.success) { alert("Project deleted successfully"); fetchProjects(); }
    } catch { alert("Failed to delete project"); }
    finally { setProcessingAction(null); }
  };

  // Remaining = Released âˆ’ Booked + (Booked âˆ’ Actual)
  const calcRemaining = (project) => {
    const released = parseFloat(project.totalReleasedAmount || 0);
    const booked   = parseFloat(project.amountBookedByPI    || 0);
    const actual   = parseFloat(project.actualExpenditure   || 0);
    return Math.max(0, released - booked + Math.max(0, booked - actual));
  };

  const getStatusBadge = (status) => {
    const variants: Record<string, string> = {
      pending:   "bg-amber-50 text-amber-800 border-amber-200",
      active:    "bg-emerald-50 text-emerald-800 border-emerald-200",
      completed: "bg-slate-50 text-slate-800 border-slate-200",
      rejected:  "bg-rose-50 text-rose-800 border-rose-200",
    };
    return (
      <Badge variant="outline" className={`${variants[status] || variants.pending} font-medium px-2.5 py-0.5`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const formatDate = (d) => {
    if (!d) return "â€”";
    try { return new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }); }
    catch { return d; }
  };

  const calcDuration = (start, end) => {
    if (!start || !end) return "â€”";
    try {
      const days   = Math.ceil(Math.abs(new Date(end).getTime() - new Date(start).getTime()) / 86400000);
      const years  = Math.floor(days / 365);
      const months = Math.floor((days % 365) / 30);
      if (years > 0 && months > 0) return `${years}y ${months}m`;
      if (years  > 0) return `${years}yr`;
      if (months > 0) return `${months}mo`;
      return `${days}d`;
    } catch { return "â€”"; }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-screen bg-gray-50">
          <div className="text-center">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-slate-800 mx-auto" />
            <p className="mt-4 text-slate-600 text-sm">Loading projects...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-screen bg-gray-50">
        <div className="space-y-5 p-6">

          {/* Header */}
          <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
            <h1 className="text-xl font-bold text-gray-900">Project Management</h1>
            <p className="text-sm text-gray-500 mt-0.5">Overview of all registered research projects</p>
          </div>

          {/* Search & filter */}
          <Card className="border border-gray-200 bg-white shadow-sm">
            <CardContent className="p-4">
              <div className="flex flex-col md:flex-row gap-3">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search by project name, PI, department..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 h-9 border-gray-200"
                  />
                </div>
                <div className="w-full md:w-52">
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="h-9 border-gray-200">
                      <Filter className="h-3.5 w-3.5 mr-2 text-gray-400" />
                      <SelectValue placeholder="Filter Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Projects table */}
          <Card className="border border-gray-200 bg-white shadow-sm overflow-hidden">
            <CardContent className="p-0">
              {projects.length === 0 ? (
                <div className="text-center py-16">
                  <p className="text-gray-900 font-semibold">No Projects Found</p>
                  <p className="text-gray-500 text-sm mt-1">
                    {searchTerm || statusFilter !== "all"
                      ? "Try adjusting your search or filters"
                      : "No projects registered yet"}
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-b border-gray-200 bg-gray-50">
                        {[
                          "S.No", "GP Number", "Project Name", "PI Name", "PI Email",
                          "Department", "Start Date", "End Date", "Duration",
                          "Sanctioned (â‚¹)", "Released (â‚¹)",
                          "Booked by PI (â‚¹)", "Actual Exp. (â‚¹)",
                          "Remaining (â‚¹)",
                          "Yet to Release (â‚¹)",
                          "Bank", "Status", "Letter", "Actions",
                        ].map((h) => (
                          <TableHead
                            key={h}
                            className="text-[11px] font-semibold text-gray-600 uppercase tracking-wide py-3 px-4 whitespace-nowrap"
                          >
                            {h}
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>

                    <TableBody>
                      {projects.map((project, index) => {
                        const remaining    = calcRemaining(project);
                        const yetToRelease = parseFloat(project.totalSanctionedAmount || 0)
                                           - parseFloat(project.totalReleasedAmount   || 0);

                        // Shape for BookedAmountDialog
                        const bookedDialogProject = {
                          id:                  project.id,
                          gpNumber:            project.gpNumber,
                          projectName:         project.projectName,
                          department:          project.department,
                          totalReleasedAmount: parseFloat(project.totalReleasedAmount || 0),
                          amountBookedByPI:    parseFloat(project.amountBookedByPI    || 0),
                          actualExpenditure:   parseFloat(project.actualExpenditure   || 0),
                          availableBalance:    remaining,
                          heads:               project.heads || [],
                        };

                        // Shape for ExpenditureDialog
                        const expenditureDialogProject = {
                          id:                     project.id,
                          gpNumber:               project.gpNumber,
                          projectName:            project.projectName,
                          department:             project.department,
                          totalSanctionedAmount:  parseFloat(project.totalSanctionedAmount  || 0),
                          totalReleasedAmount:    parseFloat(project.totalReleasedAmount     || 0),
                          amountBookedByPI:       parseFloat(project.amountBookedByPI        || 0),
                          actualExpenditure:      parseFloat(project.actualExpenditure        || 0),
                          expenditureComplete:    project.expenditureComplete,
                          approvedRequestCount:   project.approvedRequestCount,
                          filledExpenditureCount: project.filledExpenditureCount,
                          heads:                  project.heads || [],
                        };

                        return (
                          <TableRow
                            key={project.id}
                            className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                          >
                            {/* S.No */}
                            <TableCell className="py-3.5 px-4 text-sm text-gray-500">
                              {index + 1}
                            </TableCell>

                            {/* GP Number */}
                            <TableCell className="py-3.5 px-4 text-sm font-bold text-gray-900">
                              {project.gpNumber}
                            </TableCell>

                            {/* Project Name */}
                            <TableCell className="py-3.5 px-4 text-sm text-gray-800 max-w-[180px]">
                              <div className="line-clamp-2" title={project.projectName}>
                                {project.projectName}
                              </div>
                            </TableCell>

                            {/* PI Name */}
                            <TableCell className="py-3.5 px-4 text-sm text-gray-700">
                              {project.piName}
                            </TableCell>

                            {/* PI Email */}
                            <TableCell className="py-3.5 px-4 text-xs text-gray-500">
                              {project.piEmail || "â€”"}
                            </TableCell>

                            {/* Department */}
                            <TableCell className="py-3.5 px-4 text-sm text-gray-700">
                              {project.department}
                            </TableCell>

                            {/* Start Date */}
                            <TableCell className="py-3.5 px-4 text-sm text-gray-600">
                              {formatDate(project.projectStartDate)}
                            </TableCell>

                            {/* End Date */}
                            <TableCell className="py-3.5 px-4 text-sm text-gray-600">
                              {formatDate(project.projectEndDate)}
                            </TableCell>

                            {/* Duration */}
                            <TableCell className="py-3.5 px-4 text-sm text-gray-600 font-medium">
                              {calcDuration(project.projectStartDate, project.projectEndDate)}
                            </TableCell>

                            {/* Sanctioned â€” fixed, never changes */}
                            <TableCell className="py-3.5 px-4 text-sm text-gray-900 font-semibold text-right">
                              {parseFloat(project.totalSanctionedAmount || 0).toLocaleString("en-IN")}
                            </TableCell>

                            {/* Released â€” fixed until next release */}
                            <TableCell className="py-3.5 px-4 text-sm text-emerald-700 font-semibold text-right">
                              {parseFloat(project.totalReleasedAmount || 0).toLocaleString("en-IN")}
                            </TableCell>

                            {/* â”€â”€ Booked by PI â€” clickable dialog â”€â”€ */}
                            <TableCell className="py-3.5 px-4 text-right">
                              <BookedAmountDialog project={bookedDialogProject} />
                            </TableCell>

                            {/* â”€â”€ Actual Exp. â€” clickable dialog â”€â”€ */}
                            <TableCell className="py-3.5 px-4 text-right">
                              <ExpenditureDialog project={expenditureDialogProject} />
                            </TableCell>

                            {/* Remaining = Released âˆ’ Booked + (Booked âˆ’ Actual) */}
                            <TableCell className="py-3.5 px-4 text-sm font-semibold text-right">
                              <span className={
                                remaining <= 0   ? "text-gray-400" :
                                remaining < 5000 ? "text-red-700"  : "text-teal-700"
                              }>
                                {remaining.toLocaleString("en-IN")}
                              </span>
                            </TableCell>

                            {/* Yet to Release = Sanctioned âˆ’ Released */}
                            <TableCell className="py-3.5 px-4 text-sm text-amber-700 font-semibold text-right">
                              {yetToRelease.toLocaleString("en-IN")}
                            </TableCell>

                            {/* Bank */}
                            <TableCell className="py-3.5 px-4 text-sm text-gray-600">
                              {project.bankDetails || "Canara Bank"}
                            </TableCell>

                            {/* Status */}
                            <TableCell className="py-3.5 px-4">
                              {getStatusBadge(project.status)}
                            </TableCell>

                            {/* Download Sanction Letter */}
                            <TableCell className="py-3.5 px-4">
                              {(project.files?.length > 0) || project.sanctionedLetterFile ? (
                                <Button
                                  size="sm"
                                  onClick={() => handleDownloadFile(project)}
                                  disabled={downloadingFile === project.id}
                                  className="h-7 px-2.5 text-xs bg-gray-700 hover:bg-gray-800 text-white"
                                >
                                  <Download className="h-3 w-3 mr-1" />
                                  {downloadingFile === project.id ? "â€¦" : "Letter"}
                                </Button>
                              ) : (
                                <span className="text-xs text-gray-300">â€”</span>
                              )}
                            </TableCell>

                            {/* Actions */}
                            <TableCell className="py-3.5 px-4">
                              <div className="flex flex-wrap gap-1.5">

                                {/* View Report */}
                                <Button
                                  size="sm"
                                  onClick={() => handleViewReport(project)}
                                  className="h-7 px-2.5 text-xs bg-indigo-600 hover:bg-indigo-700 text-white border-0"
                                >
                                  Report â†—
                                </Button>

                                {/* Heads */}
                                <Button
                                  size="sm"
                                  onClick={() => handleHeadWise(project)}
                                  disabled={processingAction === project.id}
                                  className="h-7 px-2.5 text-xs bg-gray-500 hover:bg-gray-600 text-white border-0"
                                >
                                  Heads
                                </Button>

                                {/* Release */}
                                <Button
                                  size="sm"
                                  onClick={() => handleRelease(project)}
                                  disabled={processingAction === project.id}
                                  className="h-7 px-2.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white border-0"
                                >
                                  Release
                                </Button>

                                {/* Extend */}
                                <Button
                                  size="sm"
                                  onClick={() => handleExtension(project)}
                                  disabled={processingAction === project.id}
                                  className="h-7 px-2.5 text-xs bg-amber-600 hover:bg-amber-700 text-white border-0"
                                >
                                  Extend
                                </Button>

                                {/* Delete */}
                                <Button
                                  size="sm"
                                  onClick={() => handleDelete(project.id)}
                                  disabled={processingAction === project.id}
                                  className="h-7 px-2.5 text-xs bg-red-600 hover:bg-red-700 text-white border-0"
                                >
                                  Delete
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}

              {projects.length > 0 && (
                <div className="px-5 py-2.5 border-t border-gray-100 bg-gray-50">
                  <p className="text-xs text-gray-500">
                    Showing{" "}
                    <span className="font-semibold text-gray-800">{projects.length}</span>{" "}
                    project{projects.length !== 1 ? "s" : ""}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Extension dialog */}
      {selectedProjectForExtension && (
        <ExtendProject
          open={extensionDialogOpen}
          onClose={() => { setExtensionDialogOpen(false); setSelectedProjectForExtension(null); }}
          project={selectedProjectForExtension}
          onSuccess={fetchProjects}
        />
      )}

      {/* Head-wise update dialog */}
      {selectedProjectForHeadwise && (
        <UpdateHeadwise
          open={headwiseDialogOpen}
          onClose={() => { setHeadwiseDialogOpen(false); setSelectedProjectForHeadwise(null); }}
          project={selectedProjectForHeadwise}
          onSuccess={fetchProjects}
        />
      )}

      {/* Release funds dialog */}
      {selectedProjectForRelease && (
        <ReleaseFundsHeadwise
          open={releaseDialogOpen}
          onClose={() => { setReleaseDialogOpen(false); setSelectedProjectForRelease(null); }}
          project={selectedProjectForRelease}
          onSuccess={fetchProjects}
        />
      )}
    </Layout>
  );
};

export default ModernManageProjects;
