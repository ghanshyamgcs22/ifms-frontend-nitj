import { BudgetRequest } from "@/lib/mockData";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ApprovalTimeline } from "./ApprovalTimeline";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

interface BudgetReviewDialogProps {
    request: BudgetRequest | null;
    open: boolean;
    onClose: () => void;
    role: "admin" | "ar" | "dr" | "ao2";
    onAction: (action: "forward" | "approve" | "reject", remarks: string) => void;
}

export const BudgetReviewDialog = ({
    request,
    open,
    onClose,
    role,
    onAction,
}: BudgetReviewDialogProps) => {
    const [remarks, setRemarks] = useState("");
    const [actionType, setActionType] = useState<"forward" | "approve" | "reject" | null>(null);

    if (!request) return null;

    const handleAction = (type: "forward" | "approve" | "reject") => {
        if (type === "reject" && !remarks.trim()) {
            alert("Please provide remarks for rejection");
            return;
        }
        onAction(type, remarks);
        setRemarks("");
        setActionType(null);
    };

    const getActionButtons = () => {
        if (role === "admin") {
            return (
                <>
                    <Button
                        onClick={() => handleAction("forward")}
                        className="flex-1"
                    >
                        Forward to AR
                    </Button>
                    <Button
                        onClick={() => handleAction("reject")}
                        variant="destructive"
                        className="flex-1"
                    >
                        Reject
                    </Button>
                </>
            );
        }

        return (
            <>
                <Button
                    onClick={() => handleAction("approve")}
                    variant="default"
                    className="flex-1 bg-success hover:bg-success/90"
                >
                    Approve
                </Button>
                <Button
                    onClick={() => handleAction("reject")}
                    variant="destructive"
                    className="flex-1"
                >
                    Reject
                </Button>
            </>
        );
    };

    const getDialogTitle = () => {
        if (role === "admin") {
            return "Verify Budget Request";
        }
        return "Review Budget Request";
    };

    const getDialogDescription = () => {
        if (role === "admin") {
            return "Review the details and forward to AR for approval";
        }
        if (role === "ar") {
            return "First level approval - Approve to forward to DR or Reject to send back to PI";
        }
        if (role === "dr") {
            return "Second level approval - Approve to forward to AO2 or Reject to end workflow";
        }
        return "Final approval stage - Approve for final sanction or Reject to end workflow";
    };

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{getDialogTitle()}</DialogTitle>
                    <DialogDescription>{getDialogDescription()}</DialogDescription>
                </DialogHeader>

                <div className="space-y-6">
                    {/* Request Details */}
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label className="text-xs text-muted-foreground">GP Number</Label>
                                <p className="font-medium">{request.gpNumber}</p>
                            </div>
                            <div>
                                <Label className="text-xs text-muted-foreground">Project Type</Label>
                                <Badge variant={request.projectType === "recurring" ? "default" : "secondary"}>
                                    {request.projectType}
                                </Badge>
                            </div>
                        </div>

                        <div>
                            <Label className="text-xs text-muted-foreground">Project Title</Label>
                            <p className="font-medium">{request.projectTitle}</p>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label className="text-xs text-muted-foreground">PI Name</Label>
                                <p>{request.piName}</p>
                            </div>
                            <div>
                                <Label className="text-xs text-muted-foreground">Amount</Label>
                                <p className="text-lg font-bold text-primary">
                                    ₹{(request.amount / 100000).toFixed(2)}L
                                </p>
                            </div>
                        </div>

                        <div>
                            <Label className="text-xs text-muted-foreground">Purpose</Label>
                            <p>{request.purpose}</p>
                        </div>

                        <div>
                            <Label className="text-xs text-muted-foreground">Description</Label>
                            <p className="text-sm">{request.description}</p>
                        </div>

                        <div>
                            <Label className="text-xs text-muted-foreground">Invoice Number</Label>
                            <p>{request.invoiceNumber}</p>
                        </div>

                        <div>
                            <Label className="text-xs text-muted-foreground">Created At</Label>
                            <p>{new Date(request.createdAt).toLocaleString()}</p>
                        </div>
                    </div>

                    <Separator />

                    {/* Approval Timeline */}
                    <ApprovalTimeline request={request} />

                    <Separator />

                    {/* Remarks Input */}
                    <div className="space-y-2">
                        <Label htmlFor="remarks">
                            Remarks {role !== "admin" && actionType === "reject" && (
                                <span className="text-destructive">*</span>
                            )}
                        </Label>
                        <Textarea
                            id="remarks"
                            value={remarks}
                            onChange={(e) => setRemarks(e.target.value)}
                            placeholder={
                                role === "admin"
                                    ? "Enter any comments (optional)"
                                    : "Enter your remarks (required for rejection)"
                            }
                            rows={3}
                        />
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-3">
                        {getActionButtons()}
                        <Button variant="outline" onClick={onClose}>
                            Cancel
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
};
