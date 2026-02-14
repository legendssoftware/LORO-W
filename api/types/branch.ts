/**
 * Branch types for GET /branch list. Mirrors server branch entity where applicable.
 */

export interface BranchListItem {
  uid: number;
  name?: string;
}

/** Response shape for GET /branch (findAll). */
export interface GetBranchesResponse {
  branches: BranchListItem[] | null;
  message: string;
}
