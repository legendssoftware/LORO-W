export interface TaskPlanningReportParams {
  from?: string;
  to?: string;
  branchId?: number;
  userUid?: number;
}

export interface TaskPlanningTotals {
  planned: number;
  done: number;
  missed: number;
  visited: number;
  visitAccomplishmentPct: number;
  tasksPlanned: number;
  tasksCompleted: number;
  taskAccomplishmentPct: number;
  jobMinutesTotal: number;
  jobMinutesAverage: number;
  jobsTimed: number;
}

export interface TaskPlanningNamedValue {
  name: string;
  value: number;
}

export interface TaskPlanningUserRow {
  name: string;
  userUid: number;
  planned: number;
  done: number;
  missed: number;
  visited: number;
  accomplishmentPct: number;
  jobMinutesTotal: number;
  jobMinutesAverage: number;
}

export interface TaskPlanningReportResponse {
  totals: TaskPlanningTotals;
  missedVsVisited: TaskPlanningNamedValue[];
  plannedVsDone: TaskPlanningNamedValue[];
  byUser: TaskPlanningUserRow[];
}
