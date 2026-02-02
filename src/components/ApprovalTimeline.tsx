// components/ApprovalTimeline.tsx
import { CheckCircle, Circle, XCircle, Clock, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface ApprovalHistoryItem {
  stage: string;
  action: string;
  by: string;
  timestamp: string;
  remarks?: string;
}

interface ApprovalTimelineProps {
  approvalHistory?: ApprovalHistoryItem[];
  currentStage: string;
  status: string;
}

export const ApprovalTimeline = ({ 
  approvalHistory = [], 
  currentStage, 
  status 
}: ApprovalTimelineProps) => {
  
  // Define all stages in the workflow (REMOVED AO)
  const allStages = [
    { key: 'created', label: 'PI Created', description: 'Budget request submitted' },
    { key: 'admin', label: 'Admin Verified', description: 'Document verification' },
    { key: 'ar', label: 'AR Approved', description: 'First level approval' },
    { key: 'dr', label: 'DR Approved', description: 'Second level approval' },
    { key: 'ao2', label: 'AO2 Final Approved', description: 'Final approval & UC generation' }
  ];

  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleString('en-IN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  // Get status for each stage
  const getStageStatus = (stageKey: string) => {
    // Check if rejected
    if (status === 'rejected') {
      const rejectionEntry = approvalHistory.find(
        item => item.action === 'reject' || item.action === 'rejected'
      );
      if (rejectionEntry) {
        const historyEntry = approvalHistory.find(item => item.stage === stageKey);
        if (historyEntry) return 'completed';
        if (rejectionEntry.stage === stageKey) return 'rejected';
        return 'pending';
      }
    }

    // Check if stage is completed
    const historyEntry = approvalHistory.find(item => item.stage === stageKey);
    if (historyEntry) {
      if (historyEntry.action === 'reject' || historyEntry.action === 'rejected') {
        return 'rejected';
      }
      return 'completed';
    }

    // Check if stage is current
    if (currentStage === stageKey) return 'in-progress';

    // Check stage order (REMOVED 'ao')
    const stageOrder = ['created', 'admin', 'ar', 'dr', 'ao2'];
    const currentIndex = stageOrder.indexOf(currentStage);
    const checkIndex = stageOrder.indexOf(stageKey);
    
    if (checkIndex < currentIndex) return 'completed';
    return 'pending';
  };

  const getIconAndColor = (stageKey: string) => {
    const stageStatus = getStageStatus(stageKey);
    
    switch (stageStatus) {
      case 'completed':
        return {
          icon: <CheckCircle className="h-6 w-6" />,
          color: 'text-green-600 dark:text-green-400',
          bgColor: 'bg-green-100 dark:bg-green-900/30',
          borderColor: 'border-green-600 dark:border-green-400'
        };
      case 'in-progress':
        return {
          icon: <Clock className="h-6 w-6 animate-pulse" />,
          color: 'text-blue-600 dark:text-blue-400',
          bgColor: 'bg-blue-100 dark:bg-blue-900/30',
          borderColor: 'border-blue-600 dark:border-blue-400'
        };
      case 'rejected':
        return {
          icon: <XCircle className="h-6 w-6" />,
          color: 'text-red-600 dark:text-red-400',
          bgColor: 'bg-red-100 dark:bg-red-900/30',
          borderColor: 'border-red-600 dark:border-red-400'
        };
      default:
        return {
          icon: <Circle className="h-6 w-6" />,
          color: 'text-gray-400 dark:text-gray-600',
          bgColor: 'bg-gray-100 dark:bg-gray-800',
          borderColor: 'border-gray-300 dark:border-gray-700'
        };
    }
  };

  const getHistoryForStage = (stageKey: string) => {
    return approvalHistory.filter(item => item.stage === stageKey);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-6">
        <AlertCircle className="h-5 w-5 text-muted-foreground" />
        <h3 className="text-base font-semibold">Approval Workflow Timeline</h3>
      </div>
      
      <div className="relative">
        {/* Vertical connecting line */}
        <div className="absolute left-[23px] top-8 bottom-8 w-[3px] bg-gradient-to-b from-gray-200 via-gray-300 to-gray-200 dark:from-gray-700 dark:via-gray-600 dark:to-gray-700"></div>
        
        {/* Timeline stages */}
        <div className="space-y-8">
          {allStages.map((stage, index) => {
            const { icon, color, bgColor, borderColor } = getIconAndColor(stage.key);
            const stageStatus = getStageStatus(stage.key);
            const historyItems = getHistoryForStage(stage.key);
            
            return (
              <div key={stage.key} className="relative">
                <div className="flex gap-6 items-start">
                  {/* Icon container */}
                  <div className={cn(
                    "relative z-10 flex-shrink-0 w-12 h-12 rounded-full border-4 flex items-center justify-center transition-all duration-300",
                    bgColor,
                    borderColor,
                    color,
                    stageStatus === 'in-progress' && "shadow-lg shadow-blue-500/50"
                  )}>
                    {icon}
                  </div>
                  
                  {/* Content */}
                  <div className="flex-1 min-w-0 pt-1">
                    <div className="flex items-start justify-between gap-4 mb-2">
                      <div className="flex-1">
                        <h4 className={cn(
                          "text-base font-semibold mb-1 transition-colors",
                          stageStatus === 'completed' && "text-green-700 dark:text-green-400",
                          stageStatus === 'in-progress' && "text-blue-700 dark:text-blue-400",
                          stageStatus === 'rejected' && "text-red-700 dark:text-red-400",
                          stageStatus === 'pending' && "text-gray-500 dark:text-gray-500"
                        )}>
                          {stage.label}
                        </h4>
                        <p className="text-sm text-muted-foreground">
                          {stage.description}
                        </p>
                      </div>
                      
                      {/* Status badge */}
                      <span className={cn(
                        "px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider",
                        stageStatus === 'completed' && "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
                        stageStatus === 'in-progress' && "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 animate-pulse",
                        stageStatus === 'rejected' && "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
                        stageStatus === 'pending' && "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                      )}>
                        {stageStatus === 'in-progress' ? 'In Progress' : stageStatus}
                      </span>
                    </div>
                    
                    {/* History details */}
                    {historyItems.length > 0 && (
                      <div className="mt-3 space-y-2">
                        {historyItems.map((item, idx) => (
                          <div 
                            key={idx}
                            className={cn(
                              "p-4 rounded-lg border-l-4 transition-all",
                              item.action === 'reject' || item.action === 'rejected' 
                                ? "bg-red-50 dark:bg-red-900/10 border-red-400 dark:border-red-600"
                                : "bg-green-50 dark:bg-green-900/10 border-green-400 dark:border-green-600"
                            )}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                {item.action === 'reject' || item.action === 'rejected' 
                                  ? '❌ Rejected' 
                                  : item.action === 'forward' || item.action === 'verified_and_forwarded'
                                  ? '✅ Verified & Forwarded'
                                  : item.action === 'final_approved'
                                  ? '🎉 Final Approval'
                                  : item.action === 'created'
                                  ? '📝 Created'
                                  : '✅ Approved'}
                              </span>
                              <span className="text-xs text-muted-foreground font-mono">
                                {formatDate(item.timestamp)}
                              </span>
                            </div>
                            
                            <p className="text-sm text-gray-700 dark:text-gray-300 mb-1">
                              <span className="font-medium">By:</span> {item.by}
                            </p>
                            
                            {item.remarks && (
                              <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                                <p className="text-sm text-gray-600 dark:text-gray-400 italic">
                                  "{item.remarks}"
                                </p>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {/* Pending indicator */}
                    {stageStatus === 'pending' && (
                      <div className="mt-3 text-sm text-muted-foreground italic">
                        ⏳ Awaiting previous stage completion
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Final status message */}
      {status === 'approved' && (
        <div className="mt-8 p-4 bg-green-50 dark:bg-green-900/20 border-2 border-green-500 dark:border-green-600 rounded-lg">
          <div className="flex items-center gap-3">
            <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
            <div>
              <h4 className="font-semibold text-green-900 dark:text-green-100">
                🎉 Budget Request Approved!
              </h4>
              <p className="text-sm text-green-700 dark:text-green-300">
                Utilization Certificate (UC) can now be generated
              </p>
            </div>
          </div>
        </div>
      )}

      {status === 'rejected' && (
        <div className="mt-8 p-4 bg-red-50 dark:bg-red-900/20 border-2 border-red-500 dark:border-red-600 rounded-lg">
          <div className="flex items-center gap-3">
            <XCircle className="h-6 w-6 text-red-600 dark:text-red-400" />
            <div>
              <h4 className="font-semibold text-red-900 dark:text-red-100">
                Budget Request Rejected
              </h4>
              <p className="text-sm text-red-700 dark:text-red-300">
                Please review the rejection remarks and resubmit if necessary
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};