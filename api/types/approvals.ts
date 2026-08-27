export type ApprovalPerson = {
  uid?: number;
  name?: string;
  surname?: string;
  email?: string;
  photoURL?: string;
  accessLevel?: string;
};

export type IntakeFormDocument = {
  title: string;
  url: string;
  mimeType?: string;
  docType?: string;
};

export type IntakeFormSnapshot = {
  account?: Record<string, string | number | boolean>;
  profile?: Record<string, string | number | boolean>;
  employment?: Record<string, string | number | boolean>;
  documents?: IntakeFormDocument[];
};

export type ApprovalSourceItem = {
  entityType: string;
  entityId: number;
  label: string;
  href?: string;
  userref?: string;
};

export type Approval = {
  uid: number;
  title: string;
  description?: string;
  type: string;
  status: string;
  priority?: string;
  approvalReference?: string;
  amount?: number;
  currency?: string;
  deadline?: string;
  isOverdue?: boolean;
  isUrgent?: boolean;
  requesterUid?: number;
  requester?: ApprovalPerson;
  approverUid?: number;
  approver?: ApprovalPerson;
  delegatedToUid?: number;
  entityType?: string;
  entityId?: number | string;
  entityData?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  intakeForm?: IntakeFormSnapshot;
  sourceItem?: ApprovalSourceItem;
  sourceRecord?: Record<string, unknown>;
  submittedAt?: string;
  createdAt?: string;
  updatedAt?: string;
  notificationCount?: number;
  requestSource?: string;
  version?: number;
};

export type ApprovalStatsResponse = {
  summary: {
    total: number;
    pending: number;
    approved: number;
    rejected: number;
    overdue: number;
  };
  byType: Record<string, number>;
  byStatus: Record<string, number>;
  recentActivity: number;
  userInfo: {
    uid: number;
    accessLevel: string;
    canApprove: boolean;
  };
};

export type ApprovalsListResponse = {
  data: Approval[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  metrics?: {
    pendingCount: number;
    overdueCount: number;
    urgentCount: number;
    totalValue: number;
  };
  message?: string;
};

export const APPROVAL_STATUS_FILTERS = [
  { value: 'all', label: 'All statuses' },
  { value: 'pending', label: 'Pending' },
  { value: 'under_review', label: 'Under review' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
] as const;

export const APPROVAL_TYPE_FILTERS = [
  { value: 'all', label: 'All types' },
  { value: 'user_access', label: 'Employee access' },
  { value: 'expense_claim', label: 'Expense claim' },
  { value: 'leave_request', label: 'Leave request' },
  { value: 'credit_limit', label: 'Credit limit' },
] as const;
