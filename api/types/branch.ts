/**
 * Branch types for GET /branch list. Mirrors server branch entity where applicable.
 */

export interface BranchAddress {
  street: string;
  suburb: string;
  city: string;
  state: string;
  country: string;
  postalCode: string;
}

export interface BranchListItem {
  uid: number;
  name?: string;
  ref?: string;
  email?: string;
  phone?: string;
  contactPerson?: string;
  alias?: string | null;
  website?: string;
  status?: string;
  country?: string;
  address?: BranchAddress;
}

/** Response shape for GET /branch (findAll). */
export interface GetBranchesResponse {
  branches: BranchListItem[] | null;
  message: string;
}

/** GET /branch/:ref */
export interface BranchDetail extends BranchListItem {
  ref: string;
}

/** Response shape for GET /branch/:ref (findOne). */
export interface GetBranchResponse {
  branch: BranchDetail | null;
  message: string;
}

/**
 * ERP-style UI label: trimmed alias, else legal name (mirrors server BranchService.getDisplayName).
 */
export function getBranchDisplayLabel(
  branch: Pick<BranchListItem, 'name' | 'alias'> | null | undefined
): string {
  const alias = branch?.alias?.trim();
  if (alias) return alias;
  return (branch?.name ?? '').trim();
}
