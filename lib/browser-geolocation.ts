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

/** User-facing copy when browser geolocation fails before calling the API. */
export function geolocationFailureMessage(reason: GeolocationFailureReason): string {
  switch (reason) {
    case 'permission_denied':
      return 'Location access is blocked. Allow location for this site in your browser settings, then retry.';
    case 'timeout':
      return 'Location timed out. Check that location services are on, then retry.';
    case 'unsupported':
      return 'This browser does not support location. Choose how you are starting your shift, or use another browser.';
    case 'position_unavailable':
      return 'Could not read your location. Check location services, then retry.';
    default: {
      const _exhaustive: never = reason;
      return _exhaustive;
    }
  }
}
