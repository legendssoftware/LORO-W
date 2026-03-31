/**
 * Shared option arrays for lead forms (create/edit) and filters.
 * Values match server LeadStatus, LeadSource, LeadTemperature, LeadPriority enums.
 * Each option includes an icon component for dropdown display.
 * Icons are varied per list to avoid repetition (per agent transcript d965da67).
 */

import type { ComponentType } from 'react';
import {
  CircleIcon,
  CheckSquareIcon,
  Loader2Icon,
  GlobeIcon,
  UsersIcon,
  PhoneCallIcon,
  MessageSquareIcon,
  StoreIcon,
  BarChart3Icon,
  LightbulbIcon,
  TargetIcon,
  SunIcon,
  SnowflakeIcon,
  FlameIcon,
  AlertCircleIcon,
  ArrowUpIcon,
  MinusIcon,
  ArrowDownIcon,
  BanknoteIcon,
  MailIcon,
  MapPinIcon,
  VideoIcon,
} from '@/lib/icons';
import { CURRENCY_OPTIONS } from '@/lib/visit-form-utils';
import {
  Wrench,
  HardHat,
  Home,
  Cpu,
  HeartPulse,
  Landmark,
  Factory,
  GraduationCap,
  Building2,
  Car,
  Wheat,
  Zap,
  Radio,
  Film,
  UtensilsCrossed,
  Truck,
  HeartHandshake,
  Megaphone,
  Scale,
  MoreHorizontal,
  Construction,
  CheckCircle,
  XCircle,
  Ban,
  Archive,
  LayoutGrid,
  TrendingUp,
  Building,
  Briefcase,
  Crown,
  Settings,
  ClipboardList,
  Award,
  Handshake,
  Star,
  HelpCircle,
  ShoppingCart,
  MessageCircle,
  FileText,
  Presentation,
  TestTube,
  UserPlus,
  Bell,
  Crosshair,
  Heart,
  Coins,
  DollarSign,
  Wallet,
  CreditCard,
  PiggyBank,
  CalendarDays,
  Calendar,
  CalendarRange,
  CalendarClock,
  Sunrise,
  Moon,
  Globe,
  Clock,
  Share2,
} from 'lucide-react';

type IconComponent = ComponentType<{ className?: string; size?: number }>;

export const LEAD_STATUS_OPTIONS: { value: string; label: string; icon: IconComponent }[] = [
  { value: 'PENDING', label: 'Pending', icon: CircleIcon },
  { value: 'APPROVED', label: 'Approved', icon: CheckSquareIcon },
  { value: 'REVIEW', label: 'Review', icon: Loader2Icon },
  { value: 'DECLINED', label: 'Declined', icon: XCircle },
  { value: 'CONVERTED', label: 'Converted', icon: CheckCircle },
  { value: 'CANCELLED', label: 'Cancelled', icon: Ban },
  { value: 'DISCARDED', label: 'Discarded', icon: Archive },
];

export const LEAD_STATUS_OPTIONS_WITH_ALL: { value: string; label: string; icon: IconComponent }[] = [
  { value: 'all', label: 'All statuses', icon: LayoutGrid },
  ...LEAD_STATUS_OPTIONS,
];

export const LEAD_SOURCE_OPTIONS: { value: string; label: string; icon: IconComponent }[] = [
  { value: 'WEBSITE', label: 'Website', icon: GlobeIcon },
  { value: 'REFERRAL', label: 'Referral', icon: UsersIcon },
  { value: 'COLD_CALL', label: 'Cold call', icon: PhoneCallIcon },
  { value: 'SOCIAL_MEDIA', label: 'Social media', icon: MessageSquareIcon },
  { value: 'EMAIL_CAMPAIGN', label: 'Email campaign', icon: MailIcon },
  { value: 'TRADE_SHOW', label: 'Trade show', icon: StoreIcon },
  { value: 'ADVERTISING', label: 'Advertising', icon: BarChart3Icon },
  { value: 'OTHER', label: 'Other', icon: LightbulbIcon },
];

export const LEAD_SOURCE_OPTIONS_WITH_ALL: { value: string; label: string; icon: IconComponent }[] = [
  { value: 'all', label: 'All sources', icon: GlobeIcon },
  ...LEAD_SOURCE_OPTIONS,
];

export const LEAD_TEMPERATURE_OPTIONS: { value: string; label: string; icon: IconComponent }[] = [
  { value: 'HOT', label: 'Hot', icon: FlameIcon },
  { value: 'WARM', label: 'Warm', icon: SunIcon },
  { value: 'COLD', label: 'Cold', icon: CircleIcon },
  { value: 'FROZEN', label: 'Frozen', icon: SnowflakeIcon },
];

export const LEAD_TEMPERATURE_OPTIONS_WITH_ALL: { value: string; label: string; icon: IconComponent }[] = [
  { value: 'all', label: 'All temperatures', icon: TargetIcon },
  ...LEAD_TEMPERATURE_OPTIONS,
];

export const LEAD_PRIORITY_OPTIONS: { value: string; label: string; icon: IconComponent }[] = [
  { value: 'CRITICAL', label: 'Critical', icon: AlertCircleIcon },
  { value: 'HIGH', label: 'High', icon: ArrowUpIcon },
  { value: 'MEDIUM', label: 'Medium', icon: MinusIcon },
  { value: 'LOW', label: 'Low', icon: ArrowDownIcon },
];

/** Industry (server Industry enum). Varied icons per visit-form-utils pattern. */
export const INDUSTRY_OPTIONS: { value: string; label: string; icon: IconComponent }[] = [
  { value: 'HARDWARE', label: 'Hardware', icon: Wrench },
  { value: 'CONTRACTOR', label: 'Contractor', icon: HardHat },
  { value: 'HOME_OWNER', label: 'Home owner', icon: Home },
  { value: 'TECHNOLOGY', label: 'Technology', icon: Cpu },
  { value: 'HEALTHCARE', label: 'Healthcare', icon: HeartPulse },
  { value: 'FINANCE', label: 'Finance', icon: Landmark },
  { value: 'RETAIL', label: 'Retail', icon: StoreIcon },
  { value: 'MANUFACTURING', label: 'Manufacturing', icon: Factory },
  { value: 'EDUCATION', label: 'Education', icon: GraduationCap },
  { value: 'CONSTRUCTION', label: 'Construction', icon: Construction },
  { value: 'REAL_ESTATE', label: 'Real estate', icon: Building2 },
  { value: 'AUTOMOTIVE', label: 'Automotive', icon: Car },
  { value: 'AGRICULTURE', label: 'Agriculture', icon: Wheat },
  { value: 'ENERGY', label: 'Energy', icon: Zap },
  { value: 'TELECOMMUNICATIONS', label: 'Telecommunications', icon: Radio },
  { value: 'ENTERTAINMENT', label: 'Entertainment', icon: Film },
  { value: 'HOSPITALITY', label: 'Hospitality', icon: UtensilsCrossed },
  { value: 'TRANSPORTATION', label: 'Transportation', icon: Truck },
  { value: 'GOVERNMENT', label: 'Government', icon: Building },
  { value: 'NON_PROFIT', label: 'Non-profit', icon: HeartHandshake },
  { value: 'CONSULTING', label: 'Consulting', icon: LightbulbIcon },
  { value: 'MARKETING', label: 'Marketing', icon: Megaphone },
  { value: 'LEGAL', label: 'Legal', icon: Scale },
  { value: 'OTHER', label: 'Other', icon: MoreHorizontal },
];

/** Business size (server BusinessSize enum). */
export const BUSINESS_SIZE_OPTIONS: { value: string; label: string; icon: IconComponent }[] = [
  { value: 'STARTUP', label: 'Startup (1-10)', icon: TrendingUp },
  { value: 'SMALL', label: 'Small (11-50)', icon: UsersIcon },
  { value: 'MEDIUM', label: 'Medium (51-200)', icon: Building2 },
  { value: 'LARGE', label: 'Large (201-1000)', icon: Factory },
  { value: 'ENTERPRISE', label: 'Enterprise (1000+)', icon: Building },
  { value: 'UNKNOWN', label: 'Unknown', icon: HelpCircle },
];

/** Decision maker role (server DecisionMakerRole enum). */
export const DECISION_MAKER_ROLE_OPTIONS: { value: string; label: string; icon: IconComponent }[] = [
  { value: 'CEO', label: 'CEO', icon: Crown },
  { value: 'CTO', label: 'CTO', icon: Cpu },
  { value: 'CFO', label: 'CFO', icon: Landmark },
  { value: 'CMO', label: 'CMO', icon: Megaphone },
  { value: 'DIRECTOR', label: 'Director', icon: Briefcase },
  { value: 'MANAGER', label: 'Manager', icon: Settings },
  { value: 'SUPERVISOR', label: 'Supervisor', icon: ClipboardList },
  { value: 'ANALYST', label: 'Analyst', icon: BarChart3Icon },
  { value: 'COORDINATOR', label: 'Coordinator', icon: TargetIcon },
  { value: 'SPECIALIST', label: 'Specialist', icon: Award },
  { value: 'CONSULTANT', label: 'Consultant', icon: UsersIcon },
  { value: 'OWNER', label: 'Owner', icon: Star },
  { value: 'PARTNER', label: 'Partner', icon: Handshake },
  { value: 'OTHER', label: 'Other', icon: MoreHorizontal },
  { value: 'UNKNOWN', label: 'Unknown', icon: HelpCircle },
];

/** Lead intent (server LeadIntent enum). Subset for form. */
export const LEAD_INTENT_OPTIONS: { value: string; label: string; icon: IconComponent }[] = [
  { value: 'PURCHASE', label: 'Purchase', icon: ShoppingCart },
  { value: 'ENQUIRY', label: 'Enquiry', icon: MessageCircle },
  { value: 'SERVICES', label: 'Services', icon: Wrench },
  { value: 'CONSULTATION', label: 'Consultation', icon: UsersIcon },
  { value: 'QUOTE_REQUEST', label: 'Quote request', icon: FileText },
  { value: 'DEMO_REQUEST', label: 'Demo request', icon: Presentation },
  { value: 'TRIAL', label: 'Trial', icon: TestTube },
  { value: 'REFERRAL', label: 'Referral', icon: UserPlus },
  { value: 'UNKNOWN', label: 'Unknown', icon: HelpCircle },
];

/** Lifecycle stage (server LeadLifecycleStage enum). */
export const LIFECYCLE_STAGE_OPTIONS: { value: string; label: string; icon: IconComponent }[] = [
  { value: 'SUBSCRIBER', label: 'Subscriber', icon: Bell },
  { value: 'LEAD', label: 'Lead', icon: Crosshair },
  { value: 'MARKETING_QUALIFIED_LEAD', label: 'Marketing qualified', icon: Megaphone },
  { value: 'SALES_QUALIFIED_LEAD', label: 'Sales qualified', icon: TrendingUp },
  { value: 'OPPORTUNITY', label: 'Opportunity', icon: TargetIcon },
  { value: 'CUSTOMER', label: 'Customer', icon: CheckCircle },
  { value: 'EVANGELIST', label: 'Evangelist', icon: Heart },
];

/** Budget range (server BudgetRange enum). */
export const BUDGET_RANGE_OPTIONS: { value: string; label: string; icon: IconComponent }[] = [
  { value: 'UNDER_1K', label: 'Under R1k', icon: Coins },
  { value: 'R1K_5K', label: 'R1k - R5k', icon: BanknoteIcon },
  { value: 'R5K_10K', label: 'R5k - R10k', icon: DollarSign },
  { value: 'R10K_25K', label: 'R10k - R25k', icon: Wallet },
  { value: 'R25K_50K', label: 'R25k - R50k', icon: CreditCard },
  { value: 'R50K_100K', label: 'R50k - R100k', icon: PiggyBank },
  { value: 'R100K_250K', label: 'R100k - R250k', icon: Landmark },
  { value: 'OVER_1M', label: 'Over R1M', icon: TrendingUp },
  { value: 'UNKNOWN', label: 'Unknown', icon: HelpCircle },
];

/** Purchase timeline (server Timeline enum). */
export const TIMELINE_OPTIONS: { value: string; label: string; icon: IconComponent }[] = [
  { value: 'IMMEDIATE', label: 'Immediate', icon: Zap },
  { value: 'SHORT_TERM', label: 'Short term (1-4 weeks)', icon: CalendarDays },
  { value: 'MEDIUM_TERM', label: 'Medium term (1-3 months)', icon: Calendar },
  { value: 'LONG_TERM', label: 'Long term (3-6 months)', icon: CalendarRange },
  { value: 'FUTURE', label: 'Future (6+ months)', icon: CalendarClock },
  { value: 'UNKNOWN', label: 'Unknown', icon: HelpCircle },
];

/** Communication preference (server CommunicationPreference enum). */
export const COMMUNICATION_PREFERENCE_OPTIONS: { value: string; label: string; icon: IconComponent }[] = [
  { value: 'EMAIL', label: 'Email', icon: MailIcon },
  { value: 'PHONE', label: 'Phone', icon: PhoneCallIcon },
  { value: 'SMS', label: 'SMS', icon: MessageSquareIcon },
  { value: 'WHATSAPP', label: 'WhatsApp', icon: MessageCircle },
  { value: 'IN_PERSON', label: 'In person', icon: MapPinIcon },
  { value: 'VIDEO_CALL', label: 'Video call', icon: VideoIcon },
  { value: 'SOCIAL_MEDIA', label: 'Social media', icon: Share2 },
];

/** Timezone options (APK-style). */
export const TIMEZONE_OPTIONS: { value: string; label: string; icon: IconComponent }[] = [
  { value: 'Africa/Johannesburg', label: 'Africa/Johannesburg', icon: Globe },
  { value: 'Africa/Cairo', label: 'Africa/Cairo', icon: MapPinIcon },
  { value: 'Europe/London', label: 'Europe/London', icon: Clock },
  { value: 'America/New_York', label: 'America/New York', icon: Building2 },
  { value: 'UTC', label: 'UTC', icon: HelpCircle },
];

/** Best contact time (APK-style). */
export const BEST_CONTACT_TIME_OPTIONS: { value: string; label: string; icon: IconComponent }[] = [
  { value: 'business_hours', label: 'Business hours', icon: Clock },
  { value: 'morning', label: 'Morning', icon: Sunrise },
  { value: 'afternoon', label: 'Afternoon', icon: SunIcon },
  { value: 'evening', label: 'Evening', icon: Moon },
];

/** Re-export currency options for lead form (from visit-form-utils). */
export { CURRENCY_OPTIONS };
