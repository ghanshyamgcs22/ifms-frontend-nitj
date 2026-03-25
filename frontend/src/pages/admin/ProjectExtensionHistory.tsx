import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, FileText } from "lucide-react";

interface ExtensionHistoryProps {
  projectId: string;
  gpNumber: string;
}

const ProjectExtensionHistory = ({ projectId, gpNumber }: ExtensionHistoryProps) => {
  const [extensions, setExtensions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchExtensionHistory();
  }, [projectId]);

  const fetchExtensionHistory = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/extend-project.php?projectId=${projectId}`
      );
      const data = await response.json();

      if (data.success) {
        setExtensions(data.data || []);
      } else {
        console.error("Failed to fetch extension history");
      }
    } catch (error) {
      console.error("Error fetching extension history:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "—";
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });
    } catch {
      return dateString;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-800"></div>
      </div>
    );
  }

  if (extensions.length === 0) {
    return (
      <Card className="border-slate-200">
        <CardContent className="py-8">
          <div className="text-center text-slate-500">
            <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p className="text-sm">No extension history found for this project</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-slate-200">
      <CardHeader className="bg-slate-50 border-b border-slate-200">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <Clock className="h-5 w-5 text-slate-600" />
          Extension History - {gpNumber}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        <div className="space-y-4">
          {extensions.map((ext, index) => (
            <div
              key={ext.id}
              className="border border-slate-200 rounded-lg p-4 bg-white hover:shadow-sm transition-shadow"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                    Extension #{extensions.length - index}
                  </Badge>
                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                    {ext.status}
                  </Badge>
                </div>
                <span className="text-xs text-slate-500">
                  {formatDate(ext.extendedAt)}
                </span>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3">
                <div>
                  <p className="text-xs text-slate-600 mb-1">Original End Date</p>
                  <p className="text-sm font-medium text-slate-900">
                    {formatDate(ext.originalEndDate)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-600 mb-1">Extended To</p>
                  <p className="text-sm font-medium text-emerald-700">
                    {formatDate(ext.extendedEndDate)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-600 mb-1">Additional Years</p>
                  <p className="text-sm font-medium text-amber-700">
                    + {ext.additionalYears} years
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-600 mb-1">New Total Duration</p>
                  <p className="text-sm font-medium text-blue-700">
                    {ext.newTotalYears} years
                  </p>
                </div>
              </div>

              {ext.remarks && (
                <div className="mt-3 pt-3 border-t border-slate-100">
                  <p className="text-xs text-slate-600 mb-1">Remarks</p>
                  <p className="text-sm text-slate-700">{ext.remarks}</p>
                </div>
              )}

              <div className="mt-3 pt-3 border-t border-slate-100">
                <p className="text-xs text-slate-500">
                  Extended by: <span className="font-medium text-slate-700">{ext.extendedBy}</span>
                </p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default ProjectExtensionHistory;
