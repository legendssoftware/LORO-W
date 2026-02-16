/**
 * User role enum mirroring server/src/lib/enums/role.enums.ts
 */

export const UserRole = {
  ADMIN: 'admin',
  MANAGER: 'manager',
  TEAM_LEADER: 'team_leader',
  STAFF: 'staff',
  CLIENT: 'client',
  GUEST: 'guest',
} as const;

export type UserRole = (typeof UserRole)[keyof typeof UserRole];
