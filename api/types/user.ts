/**
 * User and profile types and enums shared with the API layer.
 * Mirrors server/src/lib/enums/user.enums.ts where applicable.
 */

export const AccessLevel = {
  OWNER: 'owner',
  ADMIN: 'admin',
  MANAGER: 'manager',
  SUPERVISOR: 'supervisor',
  MEMBER: 'member',
  USER: 'user',
  DEVELOPER: 'developer',
  SUPPORT: 'support',
  ANALYST: 'analyst',
  ACCOUNTANT: 'accountant',
  AUDITOR: 'auditor',
  CONSULTANT: 'consultant',
  COORDINATOR: 'coordinator',
  SPECIALIST: 'specialist',
  TECHNICIAN: 'technician',
  TRAINER: 'trainer',
  RESEARCHER: 'researcher',
  OFFICER: 'officer',
  EXECUTIVE: 'executive',
  CASHIER: 'cashier',
  RECEPTIONIST: 'receptionist',
  SECRETARY: 'secretary',
  SECURITY: 'security',
  CLEANER: 'cleaner',
  MAINTENANCE: 'maintenance',
  EVENT_PLANNER: 'event planner',
  MARKETING: 'marketing',
  HR: 'hr',
  CLIENT: 'client',
  FINANCE: 'finance',
  ACCOUNTING: 'accounting',
  LEGAL: 'legal',
  OPERATIONS: 'operations',
  IT: 'it',
  DEVELOPMENT: 'development',
  DESIGN: 'design',
} as const;

export type AccessLevel = (typeof AccessLevel)[keyof typeof AccessLevel];

export const Department = {
  SUPPORT: 'support',
  ENGINEERING: 'engineering',
  SALES: 'sales',
  MARKETING: 'marketing',
  FINANCE: 'finance',
  HR: 'hr',
  LEGAL: 'legal',
  OPERATIONS: 'operations',
  IT: 'it',
  CUSTOMER_SERVICE: 'customer service',
  PRODUCTION: 'production',
  RESEARCH: 'research',
  DEVELOPMENT: 'development',
  DESIGN: 'design',
  CONTENT: 'content',
  ACCOUNTING: 'accounting',
  AUDITING: 'auditing',
  CONSULTING: 'consulting',
  COORDINATION: 'coordination',
  COORDINATOR: 'coordinator',
  TECHNICIAN: 'technician',
  TRAINER: 'trainer',
  RESEARCHER: 'researcher',
  OFFICER: 'officer',
  EXECUTIVE: 'executive',
} as const;

export type Department = (typeof Department)[keyof typeof Department];

export const Theme = {
  LIGHT: 'light',
  DARK: 'dark',
  SYSTEM: 'system',
} as const;

export type Theme = (typeof Theme)[keyof typeof Theme];

export const Language = {
  ENGLISH: 'en',
  AFRIKAANS: 'af',
  ZULU: 'zu',
  XHOSA: 'xh',
  SOTHO: 'st',
  TSWANA: 'tn',
  TSONGA: 'ts',
  SWATI: 'ss',
  VENDA: 've',
  NDEBELE: 'nr',
  PEDI: 'nso',
  PORTUGUESE: 'pt',
} as const;

export type Language = (typeof Language)[keyof typeof Language];
