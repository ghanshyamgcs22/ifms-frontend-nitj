import { BudgetRequest, ApprovalLog, mockBudgetRequests } from "./mockData";

/**
 * Workflow Manager for Budget Request Approvals
 * Handles state transitions for the multi-level approval workflow:
 * PI → Admin → AR → DR → AO2 → Approved
 */

export class WorkflowManager {
    private static budgetRequests = mockBudgetRequests;

    /**
     * Create a new budget request (PI action)
     */
    static createBudgetRequest(requestData: {
        projectId: string;
        gpNumber: string;
        projectTitle: string;
        projectType: "recurring" | "non-recurring";
        piName: string;
        piEmail: string;
        amount: number;
        purpose: string;
        description: string;
        invoiceNumber: string;
    }): BudgetRequest {
        const newRequest: BudgetRequest = {
            ...requestData,
            id: `BR${Date.now()}`,
            status: "pending",
            currentStage: "admin",
            nextApprover: "admin",
            createdAt: new Date().toISOString(),
            approvalLogs: [
                {
                    role: "pi",
                    action: "created",
                    timestamp: new Date().toISOString(),
                    actor: requestData.piName,
                },
            ],
        };

        this.budgetRequests.push(newRequest);
        return newRequest;
    }

    /**
     * Admin forwards request to AR (cannot approve/reject)
     */
    static forwardToAR(
        requestId: string,
        adminName: string,
        remarks?: string
    ): BudgetRequest {
        const request = this.budgetRequests.find((r) => r.id === requestId);
        if (!request) {
            throw new Error("Request not found");
        }

        if (request.currentStage !== "admin") {
            throw new Error("Request is not at admin stage");
        }

        if (request.status !== "pending") {
            throw new Error("Request is not pending");
        }

        // Update request
        request.currentStage = "ar";
        request.nextApprover = "ar";
        request.adminForwardedAt = new Date().toISOString();

        // Add log
        request.approvalLogs.push({
            role: "admin",
            action: "forwarded",
            timestamp: new Date().toISOString(),
            actor: adminName,
            remarks,
        });

        return request;
    }

    /**
     * AR approves or rejects request
     */
    static approveByAR(
        requestId: string,
        arName: string,
        remarks?: string
    ): BudgetRequest {
        const request = this.budgetRequests.find((r) => r.id === requestId);
        if (!request) {
            throw new Error("Request not found");
        }

        if (request.currentStage !== "ar") {
            throw new Error("Request is not at AR stage");
        }

        if (request.status !== "pending") {
            throw new Error("Request is not pending");
        }

        // Update request
        request.currentStage = "dr";
        request.nextApprover = "dr";
        request.arApprovedAt = new Date().toISOString();

        // Add log
        request.approvalLogs.push({
            role: "ar",
            action: "approved",
            timestamp: new Date().toISOString(),
            actor: arName,
            remarks,
        });

        return request;
    }

    /**
     * DR approves or rejects request
     */
    static approveByDR(
        requestId: string,
        drName: string,
        remarks?: string
    ): BudgetRequest {
        const request = this.budgetRequests.find((r) => r.id === requestId);
        if (!request) {
            throw new Error("Request not found");
        }

        if (request.currentStage !== "dr") {
            throw new Error("Request is not at DR stage");
        }

        if (request.status !== "pending") {
            throw new Error("Request is not pending");
        }

        // Update request
        request.currentStage = "ao2";
        request.nextApprover = "ao2";
        request.drApprovedAt = new Date().toISOString();

        // Add log
        request.approvalLogs.push({
            role: "dr",
            action: "approved",
            timestamp: new Date().toISOString(),
            actor: drName,
            remarks,
        });

        return request;
    }

    /**
     * AO2 gives final approval
     */
    static approveByAO2(
        requestId: string,
        ao2Name: string,
        remarks?: string
    ): BudgetRequest {
        const request = this.budgetRequests.find((r) => r.id === requestId);
        if (!request) {
            throw new Error("Request not found");
        }

        if (request.currentStage !== "ao2") {
            throw new Error("Request is not at AO2 stage");
        }

        if (request.status !== "pending") {
            throw new Error("Request is not pending");
        }

        // Update request - FINAL APPROVAL
        request.status = "approved";
        request.currentStage = "completed";
        request.nextApprover = "completed";
        request.ao2ApprovedAt = new Date().toISOString();

        // Add log
        request.approvalLogs.push({
            role: "ao2",
            action: "approved",
            timestamp: new Date().toISOString(),
            actor: ao2Name,
            remarks,
        });

        return request;
    }

    /**
     * Reject request at any approval stage (AR, DR, or AO2)
     * Workflow ends immediately upon rejection
     */
    static rejectRequest(
        requestId: string,
        role: "admin" | "ar" | "dr" | "ao2",
        actorName: string,
        remarks: string
    ): BudgetRequest {
        const request = this.budgetRequests.find((r) => r.id === requestId);
        if (!request) {
            throw new Error("Request not found");
        }

        // Validate that request is at the correct stage
        if (request.currentStage !== role) {
            throw new Error(`Request is not at ${role.toUpperCase()} stage`);
        }

        if (request.status !== "pending") {
            throw new Error("Request is not pending");
        }

        // Update request - REJECTION
        request.status = "rejected";
        request.currentStage = "completed";
        request.nextApprover = "completed";
        request.rejectedAt = new Date().toISOString();
        request.rejectionRemarks = remarks;

        // Add log
        request.approvalLogs.push({
            role,
            action: "rejected",
            timestamp: new Date().toISOString(),
            actor: actorName,
            remarks,
        });

        return request;
    }

    /**
     * Get all budget requests
     */
    static getAllRequests(): BudgetRequest[] {
        return this.budgetRequests;
    }

    /**
     * Get requests for a specific stage
     */
    static getRequestsByStage(
        stage: "admin" | "ar" | "dr" | "ao2"
    ): BudgetRequest[] {
        return this.budgetRequests.filter(
            (r) => r.currentStage === stage && r.status === "pending"
        );
    }

    /**
     * Get requests for a specific PI
     */
    static getRequestsByPI(piEmail: string): BudgetRequest[] {
        return this.budgetRequests.filter((r) => r.piEmail === piEmail);
    }

    /**
     * Get descriptive display for current stage, including rejection stage
     */
    static getStageDisplay(request: BudgetRequest): string {
        if (request.status === "rejected") {
            const rejectionLog = request.approvalLogs.find((l) => l.action === "rejected");
            if (rejectionLog) {
                return `REJECTED BY ${rejectionLog.role.toUpperCase()}`;
            }
            return "REJECTED";
        }

        if (request.status === "approved") {
            return "COMPLETED";
        }

        return request.currentStage.toUpperCase();
    }

    /**
     * Get all completed requests (Approved or Rejected)
     */
    static getCompletedRequests(): BudgetRequest[] {
        return this.budgetRequests.filter((r) => r.status !== "pending");
    }

    /**
     * Get single request by ID
     */
    static getRequestById(requestId: string): BudgetRequest | undefined {
        return this.budgetRequests.find((r) => r.id === requestId);
    }
}
