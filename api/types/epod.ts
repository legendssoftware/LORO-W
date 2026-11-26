/** ePOD contract types. Mirrors server/src/epod/dto/epod-response.dto.ts. */

export const DELIVERY_STATUSES = ['assigned', 'in_progress', 'recorded', 'cancelled'] as const;

export type DeliveryStatus = (typeof DELIVERY_STATUSES)[number];

export const DELIVERY_KINDS = [
  'branch_to_branch',
  'branch_to_customer',
  'hq_to_customer',
  'branch_to_hq',
  'customer_to_branch',
  'customer_to_hq',
] as const;

export type DeliveryKind = (typeof DELIVERY_KINDS)[number];

export const DELIVERY_EXCEPTIONS = ['none', 'short_quantity', 'damaged', 'customer_rejected'] as const;

export type DeliveryException = (typeof DELIVERY_EXCEPTIONS)[number];

export const DELIVERY_MEDIA_KINDS = [
  'goods',
  'document',
  'receiver',
  'signature',
  'driver_delivery_signature',
  'driver_pickup_signature',
] as const;

export type DeliveryMediaKind = (typeof DELIVERY_MEDIA_KINDS)[number];

export const DELIVERY_CANCELLATION_SIDES = ['customer', 'driver'] as const;

export type DeliveryCancellationSide = (typeof DELIVERY_CANCELLATION_SIDES)[number];

export const DELIVERY_CANCELLATION_REASONS = [
  'customer_not_available',
  'customer_refused',
  'customer_wrong_address',
  'customer_rescheduled',
  'customer_other',
  'driver_vehicle_issue',
  'driver_safety',
  'driver_time_constraint',
  'driver_goods_issue',
  'driver_other',
] as const;

export type DeliveryCancellationReason = (typeof DELIVERY_CANCELLATION_REASONS)[number];

export const CUSTOMER_CANCELLATION_REASONS: readonly DeliveryCancellationReason[] = [
  'customer_not_available',
  'customer_refused',
  'customer_wrong_address',
  'customer_rescheduled',
  'customer_other',
];

export const DRIVER_CANCELLATION_REASONS: readonly DeliveryCancellationReason[] = [
  'driver_vehicle_issue',
  'driver_safety',
  'driver_time_constraint',
  'driver_goods_issue',
  'driver_other',
];

export function cancellationReasonsForSide(
  side: DeliveryCancellationSide,
): readonly DeliveryCancellationReason[] {
  return side === 'customer' ? CUSTOMER_CANCELLATION_REASONS : DRIVER_CANCELLATION_REASONS;
}

export function cancellationReasonNeedsNote(reason: DeliveryCancellationReason): boolean {
  return reason === 'customer_other' || reason === 'driver_other';
}

/** Order statuses the server will accept for POST /epod/deliveries. */
export const ASSIGNABLE_ORDER_STATUSES = [
  'packing',
  'in_fulfillment',
  'paid',
  'inprogress',
  'outfordelivery',
] as const;

export interface DeliveryItem {
  uid: number;
  orderItemUid: number | null;
  /** ERP item_code when the line came from a sales order. */
  itemCode: string | null;
  name: string;
  orderedQty: number;
  deliveredQty: number;
  unitWeightKg?: number | null;
  lineWeightKg?: number | null;
}

export interface DeliveryMedia {
  uid: number;
  kind: DeliveryMediaKind;
  url: string;
}

export interface DeliverySteps {
  arrived: boolean;
  goodsChecked: boolean;
  documentCaptured: boolean;
  receiverPhoto: boolean;
  clientSigned: boolean;
  driverSigned: boolean;
  signed: boolean;
}

export interface DeliverySummary {
  uid: number;
  deliveryNumber: string;
  status: DeliveryStatus;
  routeCode: string;
  scheduledDate: string;
  orderUid: number | null;
  orderNumber: string | null;
  /** Invoice / ERP document number. Null when none was captured. */
  invoiceNumber: string | null;
  driverUid: number;
  /** Assigned PROM driver first name and surname. Null when the list did not load the driver. */
  driverName: string | null;
  /** Web dispatcher who created the stop. Null on older deliveries. */
  dispatcherUid: number | null;
  /** Dispatcher first name and surname. */
  dispatcherName: string | null;
  /** ERP sales_code snapped at assign. */
  salesPersonCode: string | null;
  /** ERP salesperson name snapped at assign. */
  salesPersonName: string | null;
  /** Registration plates of the assigned truck (or driver vehicles). Null when none. */
  truckRegistration: string | null;
  /** Fleet vehicle asset uid assigned at dispatch. Null on older deliveries. */
  vehicleAssetUid: number | null;
  /** Litres filled when the truck left / was dispatched. Null on older deliveries. */
  departureFuelLitres: number | null;
  clientName: string;
  clientAddress: string;
  contactName: string;
  contactPhone: string;
  latitude: number | null;
  longitude: number | null;
  itemSummary: string;
  exception: DeliveryException | null;
  pdfUrl: string | null;
  /** Customer score from 1 to 5. Null until the public link is rated. */
  ratingScore: number | null;
  /** Dispatcher stop number. Null when Google will order the route. */
  stopSequence: number | null;
  estimatedWindowStart: string | null;
  estimatedWindowEnd: string | null;
  /** True after dispatch checked this invoice on the warehouse load checklist. */
  loadedChecked: boolean;
  /** GL code for China invoices that need delivery with GL. */
  glCode: string | null;
  /** Transfer type: branch_to_branch | branch_to_customer | hq_to_customer | branch_to_hq | customer_to_branch | customer_to_hq */
  deliveryKind: DeliveryKind;
  /** Total invoice / delivery weight in kg. */
  totalWeightKg?: number | null;
  /** True when BIT disclaimer was accepted at assign. */
  bitDisclaimerAccepted: boolean;
  /** True when customs-to-BIT was flagged at assign. */
  customsToBit: boolean;
  /** True after warehouse confirmed credit note passed. */
  creditNotePassed: boolean;
  /** True after warehouse confirmed GRV done. */
  grvDone: boolean;
  /** True after dispatch Marks loaded (warehouse load ack). */
  routeReady: boolean;
  /** True after dispatch accepted a planned route stop order. */
  routePlanned?: boolean;
  /** True after the driver starts the route. */
  routeDeparted: boolean;
  /** True after the driver signed for pickup at the warehouse. */
  routePickupAcknowledged: boolean;
  routeReadyAt?: string | null;
  routePlannedAt?: string | null;
  routePickupAcknowledgedAt?: string | null;
  routePickupSignatureUrl?: string | null;
}

export interface DeliveryDetail extends DeliverySummary {
  items: DeliveryItem[];
  media: DeliveryMedia[];
  steps: DeliverySteps;
  packagingCondition: string;
  receiverName: string;
  receiverCompany: string;
  receiverPosition: string;
  arrivalAt: string | null;
  arrivalLat: number | null;
  arrivalLng: number | null;
  submittedAt: string | null;
  submitLat: number | null;
  submitLng: number | null;
  clientSubmissionId: string | null;
  ratingComment: string | null;
  ratedAt: string | null;
  cancellationSide: DeliveryCancellationSide | null;
  cancellationReason: DeliveryCancellationReason | null;
  cancellationNote: string | null;
  cancelledAt: string | null;
  cancelledByUid: number | null;
}

export interface CancelDeliveryBody {
  side: DeliveryCancellationSide;
  reason: DeliveryCancellationReason;
  note?: string;
}

/** Anonymized pin on the public tracking map. No client name or address. */
export interface PublicRouteStop {
  stopNumber: number;
  latitude: number;
  longitude: number;
  isCurrent: boolean;
}

export interface PublicDelivery {
  status: DeliveryStatus;
  statusLabel: string;
  driverFirstName: string;
  invoiceNumber: string;
  clientName: string;
  ratingOpen: boolean;
  latitude: number | null;
  longitude: number | null;
  arrivalLat: number | null;
  arrivalLng: number | null;
  scheduledDate: string;
  estimatedWindowStart: string | null;
  estimatedWindowEnd: string | null;
  /** Numbered route pins. Other stops have no client identity. */
  routeStops: PublicRouteStop[];
}

export interface SubmitDeliveryRatingBody {
  score: number;
  comment?: string;
}

export interface PublicRatingResponse {
  message: string;
}

export interface DeliveryListResponse {
  deliveries: DeliverySummary[];
}

export interface DeliveryListQuery {
  date?: string;
  driverUid?: number;
  status?: DeliveryStatus;
}

export interface DriverOption {
  uid: number;
  name: string;
  surname: string;
  phone: string | null;
  workforceType: string | null;
  role: string | null;
  accessLevel: string;
}

/** Row from GET /epod/assignable-orders — an open ERP sales order. */
export interface AssignableOrder {
  docNumber: string;
  store: string;
  orderNumber: string;
  status: string;
  clientName: string;
  itemCount: number;
  weightKg?: number | null;
  glCode?: string | null;
}

export interface CreateDeliveryBody {
  docNumber: string;
  store: string;
  /** Fleet vehicle (asset) uid for this delivery truck. */
  vehicleAssetUid: number;
  /** Litres of fuel filled when the truck left / was dispatched. */
  departureFuelLitres: number;
  driverUid: number;
  routeCode: string;
  scheduledDate: string;
  /** Stop number on the route. Omit it to let Google order the stops. */
  stopSequence?: number;
  /** GL code for China invoices that need delivery with GL. */
  glCode?: string;
  /** standard | ibt | bit. Defaults to standard. */
  deliveryKind?: DeliveryKind;
  /** Required when deliveryKind is bit. */
  bitDisclaimerAccepted?: boolean;
  /** Optional when deliveryKind is bit. */
  customsToBit?: boolean;
}

export interface CreateDeliveryOrderRef {
  docNumber: string;
  store: string;
  stopSequence?: number;
  glCode?: string;
  deliveryKind?: DeliveryKind;
  bitDisclaimerAccepted?: boolean;
  customsToBit?: boolean;
}

/** POST /epod/deliveries/batch — up to 20 orders on one truck/route. */
export interface CreateDeliveriesBatchBody {
  orders: CreateDeliveryOrderRef[];
  vehicleAssetUid: number;
  departureFuelLitres: number;
  driverUid: number;
  routeCode: string;
  scheduledDate: string;
  glCode?: string;
  deliveryKind?: DeliveryKind;
  bitDisclaimerAccepted?: boolean;
  customsToBit?: boolean;
}

export interface CreateDeliveriesBatchResponse {
  deliveries: DeliveryDetail[];
  truckTonnageKg: number | null;
  routeStopCount: number;
}

/** Soft max matching server MAX_ORDERS_PER_ROUTE. */
export const MAX_ORDERS_PER_ROUTE = 20;

export interface ReadyRouteDeliveryFlags {
  uid: number;
  creditNotePassed?: boolean;
  grvDone?: boolean;
}

export interface ReadyRouteBody {
  driverUid: number;
  routeCode: string;
  scheduledDate: string;
  /** Checked invoice/stop uids. When sent, every open stop must be included or already loadedChecked. */
  deliveryUids?: number[];
  /** Route-level: set creditNotePassed on scoped stops. */
  creditNotePassed?: boolean;
  /** Route-level: set grvDone on scoped stops. */
  grvDone?: boolean;
  /** Per-invoice credit-note / GRV overrides. */
  deliveryFlags?: ReadyRouteDeliveryFlags[];
}

/** POST /epod/routes/plan — Google Directions optimize preview. */
export interface PlanRouteBody {
  driverUid: number;
  routeCode: string;
  scheduledDate: string;
}

export interface PlannedRouteStop {
  deliveryUid: number;
  stopSequence: number;
  clientName: string;
  clientAddress: string;
  latitude: number | null;
  longitude: number | null;
}

export interface PlannedRouteResponse {
  stops: PlannedRouteStop[];
}

export interface AcceptRoutePlanStop {
  deliveryUid: number;
  stopSequence: number;
}

/** POST /epod/routes/plan/accept — persist stopSequence from a proposed plan. */
export interface AcceptRoutePlanBody {
  driverUid: number;
  routeCode: string;
  scheduledDate: string;
  stops: AcceptRoutePlanStop[];
}

export interface DeliveryPdfResponse {
  url: string;
}
