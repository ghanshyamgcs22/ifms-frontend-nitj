import { Status } from "@/components/StatusBadge";

export interface Department {
  id: string;
  name: string;
  hodName: string;
  hodEmail: string;
}

export interface Project {
  id: string;
  gpNumber: string;
  title: string;
  piName: string;
  piEmail: string;
  department: string;
  type: "recurring" | "non-recurring";
  status: Status;
  sanctionedAmount: number;
  releasedAmount: number;
  bookedAmount: number;
  spentAmount: number;
  incurredAmount: number;
  createdAt: string;
  sanctionedDate?: string;
  releaseDate?: string;
  letterDate?: string;
}

export interface ApprovalLog {
  role: "pi" | "admin" | "ar" | "dr" | "ao2";
  action: "created" | "forwarded" | "approved" | "rejected";
  timestamp: string;
  remarks?: string;
  actor: string;
}

export interface BudgetRequest {
  id: string;
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
  status: Status;
  currentStage: "admin" | "ar" | "dr" | "ao2" | "completed";
  nextApprover: "admin" | "ar" | "dr" | "ao2" | "completed";
  createdAt: string;
  adminForwardedAt?: string;
  arApprovedAt?: string;
  drApprovedAt?: string;
  ao2ApprovedAt?: string;
  rejectedAt?: string;
  rejectionRemarks?: string;
  approvalLogs: ApprovalLog[];
}

export interface ProjectHead {
  id: string;
  name: string;
  type: "recurring" | "non-recurring";
}

export const mockDepartments: Department[] = [
  {
    id: "1",
    name: "Computer Science",
    hodName: "Dr. Rajesh Kumar",
    hodEmail: "rajesh.kumar@ifms.edu",
  },
  {
    id: "2",
    name: "Electrical Engineering",
    hodName: "Dr. Priya Sharma",
    hodEmail: "priya.sharma@ifms.edu",
  },
  {
    id: "3",
    name: "Mechanical Engineering",
    hodName: "Dr. Amit Patel",
    hodEmail: "amit.patel@ifms.edu",
  },
];

export const mockProjectHeads: ProjectHead[] = [
  { id: "1", name: "Equipment", type: "non-recurring" },
  { id: "2", name: "Consumables", type: "recurring" },
  { id: "3", name: "Travel", type: "recurring" },
  { id: "4", name: "Infrastructure", type: "non-recurring" },
  { id: "5", name: "Manpower", type: "recurring" },
];

export const mockProjects: Project[] = [
  {
    id: "1",
    gpNumber: "GP2024001",
    title: "AI Research in Healthcare",
    piName: "Dr. John Smith",
    piEmail: "pi@ifms.edu",
    department: "Computer Science",
    type: "recurring",
    status: "released",
    sanctionedAmount: 5000000,
    releasedAmount: 3000000,
    bookedAmount: 1500000,
    spentAmount: 800000,
    incurredAmount: 700000,
    createdAt: "2024-01-15",
    sanctionedDate: "2024-02-01",
    releaseDate: "2024-02-15",
    letterDate: "2024-02-10",
  },
  {
    id: "2",
    gpNumber: "GP2024002",
    title: "Smart Grid Technology",
    piName: "Dr. Priya Sharma",
    piEmail: "priya@ifms.edu",
    department: "Electrical Engineering",
    type: "non-recurring",
    status: "sanctioned",
    sanctionedAmount: 8000000,
    releasedAmount: 0,
    bookedAmount: 0,
    spentAmount: 0,
    incurredAmount: 0,
    createdAt: "2024-02-10",
    sanctionedDate: "2024-03-01",
  },
];

export const mockBudgetRequests: BudgetRequest[] = [
  {
    id: "1",
    projectId: "1",
    gpNumber: "GP2024001",
    projectTitle: "AI Research in Healthcare",
    projectType: "recurring",
    piName: "Dr. John Smith",
    piEmail: "pi@ifms.edu",
    amount: 250000,
    purpose: "Purchase of GPU servers for deep learning",
    description: "Need high-performance GPU servers for training deep learning models",
    invoiceNumber: "INV-2024-001",
    status: "pending",
    currentStage: "admin",
    nextApprover: "admin",
    createdAt: "2024-03-15T10:00:00Z",
    approvalLogs: [
      {
        role: "pi",
        action: "created",
        timestamp: "2024-03-15T10:00:00Z",
        actor: "Dr. John Smith",
      },
    ],
  },
  {
    id: "2",
    projectId: "1",
    gpNumber: "GP2024001",
    projectTitle: "AI Research in Healthcare",
    projectType: "recurring",
    piName: "Dr. John Smith",
    piEmail: "pi@ifms.edu",
    amount: 150000,
    purpose: "Conference travel and registration",
    description: "Attend international AI conference to present research findings",
    invoiceNumber: "INV-2024-002",
    status: "approved",
    currentStage: "completed",
    nextApprover: "completed",
    createdAt: "2024-02-20T09:00:00Z",
    adminForwardedAt: "2024-02-20T11:00:00Z",
    arApprovedAt: "2024-02-21T14:00:00Z",
    drApprovedAt: "2024-02-22T10:30:00Z",
    ao2ApprovedAt: "2024-02-23T16:00:00Z",
    approvalLogs: [
      {
        role: "pi",
        action: "created",
        timestamp: "2024-02-20T09:00:00Z",
        actor: "Dr. John Smith",
      },
      {
        role: "admin",
        action: "forwarded",
        timestamp: "2024-02-20T11:00:00Z",
        actor: "Admin User",
        remarks: "Verified and forwarded to AR",
      },
      {
        role: "ar",
        action: "approved",
        timestamp: "2024-02-21T14:00:00Z",
        actor: "AR Officer",
        remarks: "Approved for further processing",
      },
      {
        role: "dr",
        action: "approved",
        timestamp: "2024-02-22T10:30:00Z",
        actor: "DR Officer",
      },
      {
        role: "ao2",
        action: "approved",
        timestamp: "2024-02-23T16:00:00Z",
        actor: "AO2 Officer",
        remarks: "Final approval granted",
      },
    ],
  },
  {
    id: "3",
    projectId: "1",
    gpNumber: "GP2024001",
    projectTitle: "AI Research in Healthcare",
    projectType: "recurring",
    piName: "Dr. John Smith",
    piEmail: "pi@ifms.edu",
    amount: 75000,
    purpose: "Lab consumables and chemicals",
    description: "Purchase of reagents and consumables for experiments",
    invoiceNumber: "INV-2024-003",
    status: "pending",
    currentStage: "ar",
    nextApprover: "ar",
    createdAt: "2024-03-10T08:30:00Z",
    adminForwardedAt: "2024-03-10T15:00:00Z",
    approvalLogs: [
      {
        role: "pi",
        action: "created",
        timestamp: "2024-03-10T08:30:00Z",
        actor: "Dr. John Smith",
      },
      {
        role: "admin",
        action: "forwarded",
        timestamp: "2024-03-10T15:00:00Z",
        actor: "Admin User",
        remarks: "Documents verified, forwarded to AR",
      },
    ],
  },
];
