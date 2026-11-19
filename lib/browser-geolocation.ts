/** Result of requesting the browser/device position for clock-in context. */
export type GeolocationFailureReason =
  | 'unsupported'
  | 'permission_denied'
  | 'position_unavailable'
  | 'timeout';

export type GeolocationResult =
  | { ok: true; lat: number; lng: number }
  | { ok: false; reason: GeolocationFailureReason };

const DEFAULT_TIMEOUT_MS = 15_000;
const DEFAULT_MAXIMUM_AGE_MS = 60_000;

function mapGeolocationError(code: number): GeolocationFailureReason {
  switch (code) {
    case 1: // PERMISSION_DENIED
      return 'permission_denied';
    case 3: // TIMEOUT
      return 'timeout';
    default:
      return 'position_unavailable';
  }
}

/**
 * Reads current coordinates via the Geolocation API.
 * Uses a timeout and cached positions so the UI does not hang indefinitely.
 */
export function getBrowserPosition(
  options?: { timeoutMs?: number; maximumAgeMs?: number },
): Promise<GeolocationResult> {
  const timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const maximumAgeMs = options?.maximumAgeMs ?? DEFAULT_MAXIMUM_AGE_MS;

  return new Promise((resolve) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      resolve({ ok: false, reason: 'unsupported' });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (p) => {
        const lat = p.coords.latitude;
        const lng = p.coords.longitude;
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
          resolve({ ok: false, reason: 'position_unavailable' });
          return;
        }
        resolve({ ok: true, lat, lng });
      },
      (err) => resolve({ ok: false, reason: mapGeolocationError(err.code) }),
      {
        enableHighAccuracy: false,
        timeout: timeoutMs,
        maximumAge: maximumAgeMs,
      },
    );
  });
}

/** i18n key (`screens` namespace) for user-facing copy when browser geolocation fails before calling the API. */
export function geolocationFailureMessageKey(reason: GeolocationFailureReason): string {
  switch (reason) {
    case 'permission_denied':
      return 'dashboard.locationContext.geoPermissionBlocked';
    case 'timeout':
      return 'dashboard.locationContext.geoTimeout';
    case 'unsupported':
      return 'dashboard.locationContext.geoUnsupported';
    case 'position_unavailable':
      return 'dashboard.locationContext.geoPositionUnavailable';
    default: {
      const _exhaustive: never = reason;
      return _exhaustive;
    }
  }
}
