/** Mirrors server `DeviceStatus` enum values. */
export type DeviceStatus =
  | 'online'
  | 'offline'
  | 'maintenance'
  | 'disconnected';

/** Mirrors server `DeviceType` enum values. */
export type DeviceType =
  | 'door_sensor'
  | 'camera'
  | 'sensor'
  | 'actuator'
  | 'controller'
  | 'gateway'
  | 'rfid'
  | 'nfc'
  | 'barcode'
  | 'beacon'
  | 'other';

export interface DeviceAnalytics {
  openCount: number;
  closeCount: number;
  totalCount: number;
  lastOpenAt: string | null;
  lastCloseAt: string | null;
  onTimeCount: number;
  lateCount: number;
  daysAbsent: number;
}

export interface IotBranchSummary {
  uid?: number;
  name?: string;
  alias?: string;
  ref?: string;
}

export interface IotDeviceRecord {
  id: number;
  openTime: string | null;
  closeTime: string | null;
  deviceId: number;
  createdAt: string;
  updatedAt: string;
}

export interface IotDevice {
  id: number;
  orgID: number;
  branchID: number;
  branchUid?: number | null;
  deviceID: string;
  deviceType: DeviceType;
  deviceIP: string;
  devicePort: number;
  devicLocation: string;
  deviceTag: string;
  currentStatus: DeviceStatus;
  createdAt: string;
  updatedAt: string;
  isDeleted: boolean;
  analytics: DeviceAnalytics;
  branch?: IotBranchSummary | null;
  records?: IotDeviceRecord[];
}

/** Matches server `iot.service` PaginatedResponse shape. */
export interface IotDevicesListResponse {
  data: IotDevice[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface CreateIotDevicePayload {
  orgID?: number;
  branchID?: number;
  deviceID: string;
  deviceType?: DeviceType;
  deviceIP: string;
  devicePort: number;
  devicLocation: string;
  deviceTag: string;
  currentStatus?: DeviceStatus;
  analytics?: Partial<DeviceAnalytics>;
}

export interface UpdateIotDevicePayload {
  deviceIP?: string;
  devicePort?: number;
  devicLocation?: string;
  deviceTag?: string;
  deviceType?: DeviceType;
  currentStatus?: DeviceStatus;
  branchID?: number;
}

export interface UpdateIotDeviceStatusPayload {
  currentStatus: DeviceStatus;
  reason?: string;
}

export interface CreateDeviceResponse {
  message: string;
  device?: Partial<IotDevice>;
}
