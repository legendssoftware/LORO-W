import type { CallOrigin } from '@/api/types/calls';

export const ORIGIN_LABEL: Record<CallOrigin, string> = {
  in_app: 'In app',
  company_phone: 'Company phone',
  personal_mobile: 'Personal',
};

export function originVariant(origin: CallOrigin): 'default' | 'secondary' | 'outline' {
  switch (origin) {
    case 'in_app':
      return 'default';
    case 'company_phone':
      return 'secondary';
    case 'personal_mobile':
      return 'outline';
    default: {
      const _exhaustive: never = origin;
      return _exhaustive;
    }
  }
}

export function normalizeOrigin(value: CallOrigin | string | null | undefined): CallOrigin {
  if (value === 'in_app' || value === 'company_phone' || value === 'personal_mobile') return value;
  return 'company_phone';
}
