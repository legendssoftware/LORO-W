/** ePOD contract types. Mirrors server/src/epod/dto/epod-response.dto.ts. */

export const DELIVERY_STATUSES = ['assigned', 'in_progress', 'recorded', 'cancelled'] as const;

export type DeliveryStatus = (typeof DELIVERY_STATUSES)[number];

export const DELIVERY_EXCEPTIONS = ['none', 'short_quantity', 'damaged', 'customer_rejected'] as const;

export type DeliveryException = (typeof DELIVERY_EXCEPTIONS)[number];

export const DELIVERY_MEDIA_KINDS = ['goods', 'document', 'receiver', 'signature'] as const;

export type DeliveryMediaKind = (typeof DELIVERY_MEDIA_KINDS)[number];

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
  name: string;
  orderedQty: number;
  deliveredQty: number;
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
  driverUid: number;
  clientName: string;
  clientAddress: string;
  contactName: string;
  contactPhone: string;
  latitude: number | null;
  longitude: number | null;
  itemSummary: string;
  exception: DeliveryException | null;
  pdfUrl: string | null;
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
}

export interface CreateDeliveryBody {
  docNumber: string;
  store: string;
  driverUid: number;
  routeCode: string;
  scheduledDate: string;
}

export interface DeliveryPdfResponse {
  url: string;
}
