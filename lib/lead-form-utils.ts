/**
 * Shared option arrays for lead forms (create/edit) and filters.
 * Values match server LeadStatus, LeadSource, LeadTemperature, LeadPriority enums.
 * Each option includes an icon component for dropdown display.
 * Icons are varied per list to avoid repetition (per agent transcript d965da67).
 *
 * Options carry `labelKey` (i18n key under `screens` namespace) instead of a
 * hard-coded English string.  Render sites call `t(o.labelKey)`.
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
  BedDouble,
} from 'lucide-react';

type IconComponent = ComponentType<{ className?: string; size?: number }>;

export interface LeadOption {
  value: string;
  labelKey: string;
  icon: IconComponent;
}

export const LEAD_STATUS_OPTIONS: LeadOption[] = [
  { value: 'PENDING', labelKey: 'enums.leads.status.pending', icon: CircleIcon },
  { value: 'APPROVED', labelKey: 'enums.leads.status.approved', icon: CheckSquareIcon },
  { value: 'REVIEW', labelKey: 'enums.leads.status.review', icon: Loader2Icon },
  { value: 'DECLINED', labelKey: 'enums.leads.status.declined', icon: XCircle },
  { value: 'CONVERTED', labelKey: 'enums.leads.status.converted', icon: CheckCircle },
  { value: 'CANCELLED', labelKey: 'enums.leads.status.cancelled', icon: Ban },
  { value: 'DISCARDED', labelKey: 'enums.leads.status.discarded', icon: Archive },
];

export const LEAD_STATUS_OPTIONS_WITH_ALL: LeadOption[] = [
  { value: 'all', labelKey: 'actions.allStatuses', icon: LayoutGrid },
  ...LEAD_STATUS_OPTIONS,
];

export const LEAD_SOURCE_OPTIONS: LeadOption[] = [
  { value: 'WEBSITE', labelKey: 'enums.leads.source.website', icon: GlobeIcon },
  { value: 'REFERRAL', labelKey: 'enums.leads.source.referral', icon: UsersIcon },
  { value: 'COLD_CALL', labelKey: 'enums.leads.source.coldCall', icon: PhoneCallIcon },
  { value: 'SOCIAL_MEDIA', labelKey: 'enums.leads.source.socialMedia', icon: MessageSquareIcon },
  { value: 'EMAIL_CAMPAIGN', labelKey: 'enums.leads.source.emailCampaign', icon: MailIcon },
  { value: 'TRADE_SHOW', labelKey: 'enums.leads.source.tradeShow', icon: StoreIcon },
  { value: 'ADVERTISING', labelKey: 'enums.leads.source.advertising', icon: BarChart3Icon },
  { value: 'OTHER', labelKey: 'enums.leads.source.other', icon: LightbulbIcon },
];

export const LEAD_SOURCE_OPTIONS_WITH_ALL: LeadOption[] = [
  { value: 'all', labelKey: 'leads.allSources', icon: GlobeIcon },
  ...LEAD_SOURCE_OPTIONS,
];

export const LEAD_TEMPERATURE_OPTIONS: LeadOption[] = [
  { value: 'HOT', labelKey: 'enums.leads.temperature.hot', icon: FlameIcon },
  { value: 'WARM', labelKey: 'enums.leads.temperature.warm', icon: SunIcon },
  { value: 'COLD', labelKey: 'enums.leads.temperature.cold', icon: CircleIcon },
  { value: 'FROZEN', labelKey: 'enums.leads.temperature.frozen', icon: SnowflakeIcon },
];

export const LEAD_TEMPERATURE_OPTIONS_WITH_ALL: LeadOption[] = [
  { value: 'all', labelKey: 'leads.allTemperatures', icon: TargetIcon },
  ...LEAD_TEMPERATURE_OPTIONS,
];

export const LEAD_PRIORITY_OPTIONS: LeadOption[] = [
  { value: 'CRITICAL', labelKey: 'enums.leads.priority.critical', icon: AlertCircleIcon },
  { value: 'HIGH', labelKey: 'enums.leads.priority.high', icon: ArrowUpIcon },
  { value: 'MEDIUM', labelKey: 'enums.leads.priority.medium', icon: MinusIcon },
  { value: 'LOW', labelKey: 'enums.leads.priority.low', icon: ArrowDownIcon },
];

/** Industry (server Industry enum). Varied icons per visit-form-utils pattern. */
export const INDUSTRY_OPTIONS: LeadOption[] = [
  { value: 'HARDWARE', labelKey: 'enums.leads.industry.hardware', icon: Wrench },
  { value: 'CONTRACTOR', labelKey: 'enums.leads.industry.contractor', icon: HardHat },
  { value: 'HOME_OWNER', labelKey: 'enums.leads.industry.homeOwner', icon: Home },
  { value: 'TECHNOLOGY', labelKey: 'enums.leads.industry.technology', icon: Cpu },
  { value: 'HEALTHCARE', labelKey: 'enums.leads.industry.healthcare', icon: HeartPulse },
  { value: 'FINANCE', labelKey: 'enums.leads.industry.finance', icon: Landmark },
  { value: 'RETAIL', labelKey: 'enums.leads.industry.retail', icon: StoreIcon },
  { value: 'MANUFACTURING', labelKey: 'enums.leads.industry.manufacturing', icon: Factory },
  { value: 'EDUCATION', labelKey: 'enums.leads.industry.education', icon: GraduationCap },
  { value: 'CONSTRUCTION', labelKey: 'enums.leads.industry.construction', icon: Construction },
  { value: 'REAL_ESTATE', labelKey: 'enums.leads.industry.realEstate', icon: Building2 },
  { value: 'AUTOMOTIVE', labelKey: 'enums.leads.industry.automotive', icon: Car },
  { value: 'AGRICULTURE', labelKey: 'enums.leads.industry.agriculture', icon: Wheat },
  { value: 'ENERGY', labelKey: 'enums.leads.industry.energy', icon: Zap },
  { value: 'TELECOMMUNICATIONS', labelKey: 'enums.leads.industry.telecommunications', icon: Radio },
  { value: 'ENTERTAINMENT', labelKey: 'enums.leads.industry.entertainment', icon: Film },
  { value: 'HOSPITALITY', labelKey: 'enums.leads.industry.hospitality', icon: UtensilsCrossed },
  { value: 'TRANSPORTATION', labelKey: 'enums.leads.industry.transportation', icon: Truck },
  { value: 'GOVERNMENT', labelKey: 'enums.leads.industry.government', icon: Building },
  { value: 'NON_PROFIT', labelKey: 'enums.leads.industry.nonProfit', icon: HeartHandshake },
  { value: 'CONSULTING', labelKey: 'enums.leads.industry.consulting', icon: LightbulbIcon },
  { value: 'MARKETING', labelKey: 'enums.leads.industry.marketing', icon: Megaphone },
  { value: 'LEGAL', labelKey: 'enums.leads.industry.legal', icon: Scale },
  { value: 'UPHOLSTERY', labelKey: 'enums.leads.industry.upholstery', icon: BedDouble },
  { value: 'SHOP_FITTERS', labelKey: 'enums.leads.industry.shopFitters', icon: HardHat },
  { value: 'OTHER', labelKey: 'enums.leads.industry.other', icon: MoreHorizontal },
];

/** Business size (server BusinessSize enum). */
export const BUSINESS_SIZE_OPTIONS: LeadOption[] = [
  { value: 'STARTUP', labelKey: 'enums.leads.businessSize.startup', icon: TrendingUp },
  { value: 'SMALL', labelKey: 'enums.leads.businessSize.small', icon: UsersIcon },
  { value: 'MEDIUM', labelKey: 'enums.leads.businessSize.medium', icon: Building2 },
  { value: 'LARGE', labelKey: 'enums.leads.businessSize.large', icon: Factory },
  { value: 'ENTERPRISE', labelKey: 'enums.leads.businessSize.enterprise', icon: Building },
  { value: 'UNKNOWN', labelKey: 'enums.leads.businessSize.unknown', icon: HelpCircle },
];

/** Decision maker role (server DecisionMakerRole enum). */
export const DECISION_MAKER_ROLE_OPTIONS: LeadOption[] = [
  { value: 'CEO', labelKey: 'enums.leads.decisionMaker.ceo', icon: Crown },
  { value: 'CTO', labelKey: 'enums.leads.decisionMaker.cto', icon: Cpu },
  { value: 'CFO', labelKey: 'enums.leads.decisionMaker.cfo', icon: Landmark },
  { value: 'CMO', labelKey: 'enums.leads.decisionMaker.cmo', icon: Megaphone },
  { value: 'DIRECTOR', labelKey: 'enums.leads.decisionMaker.director', icon: Briefcase },
  { value: 'MANAGER', labelKey: 'enums.leads.decisionMaker.manager', icon: Settings },
  { value: 'SUPERVISOR', labelKey: 'enums.leads.decisionMaker.supervisor', icon: ClipboardList },
  { value: 'ANALYST', labelKey: 'enums.leads.decisionMaker.analyst', icon: BarChart3Icon },
  { value: 'COORDINATOR', labelKey: 'enums.leads.decisionMaker.coordinator', icon: TargetIcon },
  { value: 'SPECIALIST', labelKey: 'enums.leads.decisionMaker.specialist', icon: Award },
  { value: 'CONSULTANT', labelKey: 'enums.leads.decisionMaker.consultant', icon: UsersIcon },
  { value: 'OWNER', labelKey: 'enums.leads.decisionMaker.owner', icon: Star },
  { value: 'PARTNER', labelKey: 'enums.leads.decisionMaker.partner', icon: Handshake },
  { value: 'OTHER', labelKey: 'enums.leads.decisionMaker.other', icon: MoreHorizontal },
  { value: 'UNKNOWN', labelKey: 'enums.leads.decisionMaker.unknown', icon: HelpCircle },
];

/** Lead intent (server LeadIntent enum). Subset for form. */
export const LEAD_INTENT_OPTIONS: LeadOption[] = [
  { value: 'PURCHASE', labelKey: 'enums.leads.intent.purchase', icon: ShoppingCart },
  { value: 'ENQUIRY', labelKey: 'enums.leads.intent.enquiry', icon: MessageCircle },
  { value: 'SERVICES', labelKey: 'enums.leads.intent.services', icon: Wrench },
  { value: 'CONSULTATION', labelKey: 'enums.leads.intent.consultation', icon: UsersIcon },
  { value: 'QUOTE_REQUEST', labelKey: 'enums.leads.intent.quoteRequest', icon: FileText },
  { value: 'DEMO_REQUEST', labelKey: 'enums.leads.intent.demoRequest', icon: Presentation },
  { value: 'TRIAL', labelKey: 'enums.leads.intent.trial', icon: TestTube },
  { value: 'REFERRAL', labelKey: 'enums.leads.intent.referral', icon: UserPlus },
  { value: 'UNKNOWN', labelKey: 'enums.leads.intent.unknown', icon: HelpCircle },
];

/** Lifecycle stage (server LeadLifecycleStage enum). */
export const LIFECYCLE_STAGE_OPTIONS: LeadOption[] = [
  { value: 'SUBSCRIBER', labelKey: 'enums.leads.lifecycle.subscriber', icon: Bell },
  { value: 'LEAD', labelKey: 'enums.leads.lifecycle.lead', icon: Crosshair },
  { value: 'MARKETING_QUALIFIED_LEAD', labelKey: 'enums.leads.lifecycle.marketingQualified', icon: Megaphone },
  { value: 'SALES_QUALIFIED_LEAD', labelKey: 'enums.leads.lifecycle.salesQualified', icon: TrendingUp },
  { value: 'OPPORTUNITY', labelKey: 'enums.leads.lifecycle.opportunity', icon: TargetIcon },
  { value: 'CUSTOMER', labelKey: 'enums.leads.lifecycle.customer', icon: CheckCircle },
  { value: 'EVANGELIST', labelKey: 'enums.leads.lifecycle.evangelist', icon: Heart },
];

/** Budget range (server BudgetRange enum). */
export const BUDGET_RANGE_OPTIONS: LeadOption[] = [
  { value: 'UNDER_1K', labelKey: 'enums.leads.budget.under1k', icon: Coins },
  { value: 'R1K_5K', labelKey: 'enums.leads.budget.r1k5k', icon: BanknoteIcon },
  { value: 'R5K_10K', labelKey: 'enums.leads.budget.r5k10k', icon: DollarSign },
  { value: 'R10K_25K', labelKey: 'enums.leads.budget.r10k25k', icon: Wallet },
  { value: 'R25K_50K', labelKey: 'enums.leads.budget.r25k50k', icon: CreditCard },
  { value: 'R50K_100K', labelKey: 'enums.leads.budget.r50k100k', icon: PiggyBank },
  { value: 'R100K_250K', labelKey: 'enums.leads.budget.r100k250k', icon: Landmark },
  { value: 'OVER_1M', labelKey: 'enums.leads.budget.over1m', icon: TrendingUp },
  { value: 'UNKNOWN', labelKey: 'enums.leads.budget.unknown', icon: HelpCircle },
];

/** Purchase timeline (server Timeline enum). */
export const TIMELINE_OPTIONS: LeadOption[] = [
  { value: 'IMMEDIATE', labelKey: 'enums.leads.timeline.immediate', icon: Zap },
  { value: 'SHORT_TERM', labelKey: 'enums.leads.timeline.shortTerm', icon: CalendarDays },
  { value: 'MEDIUM_TERM', labelKey: 'enums.leads.timeline.mediumTerm', icon: Calendar },
  { value: 'LONG_TERM', labelKey: 'enums.leads.timeline.longTerm', icon: CalendarRange },
  { value: 'FUTURE', labelKey: 'enums.leads.timeline.future', icon: CalendarClock },
  { value: 'UNKNOWN', labelKey: 'enums.leads.timeline.unknown', icon: HelpCircle },
];

/** Communication preference (server CommunicationPreference enum). */
export const COMMUNICATION_PREFERENCE_OPTIONS: LeadOption[] = [
  { value: 'EMAIL', labelKey: 'enums.leads.communication.email', icon: MailIcon },
  { value: 'PHONE', labelKey: 'enums.leads.communication.phone', icon: PhoneCallIcon },
  { value: 'SMS', labelKey: 'enums.leads.communication.sms', icon: MessageSquareIcon },
  { value: 'WHATSAPP', labelKey: 'enums.leads.communication.whatsapp', icon: MessageCircle },
  { value: 'IN_PERSON', labelKey: 'enums.leads.communication.inPerson', icon: MapPinIcon },
  { value: 'VIDEO_CALL', labelKey: 'enums.leads.communication.videoCall', icon: VideoIcon },
  { value: 'SOCIAL_MEDIA', labelKey: 'enums.leads.communication.socialMedia', icon: Share2 },
];

/** Timezone options (APK-style). */
export const TIMEZONE_OPTIONS: LeadOption[] = [
  { value: 'Africa/Johannesburg', labelKey: 'enums.leads.timezone.johannesburg', icon: Globe },
  { value: 'Africa/Cairo', labelKey: 'enums.leads.timezone.cairo', icon: MapPinIcon },
  { value: 'Europe/London', labelKey: 'enums.leads.timezone.london', icon: Clock },
  { value: 'America/New_York', labelKey: 'enums.leads.timezone.newYork', icon: Building2 },
  { value: 'UTC', labelKey: 'enums.leads.timezone.utc', icon: HelpCircle },
];

/** Best contact time (APK-style). */
export const BEST_CONTACT_TIME_OPTIONS: LeadOption[] = [
  { value: 'business_hours', labelKey: 'enums.leads.contactTime.businessHours', icon: Clock },
  { value: 'morning', labelKey: 'enums.leads.contactTime.morning', icon: Sunrise },
  { value: 'afternoon', labelKey: 'enums.leads.contactTime.afternoon', icon: SunIcon },
  { value: 'evening', labelKey: 'enums.leads.contactTime.evening', icon: Moon },
];

/** Re-export currency options for lead form (from visit-form-utils). */
export { CURRENCY_OPTIONS };
