/**
 * Poll until DOM targets are ready, then invoke onReady.
 * Returns a cleanup that cancels pending timeouts so a later block
 * (e.g. performance warning) cannot start a tour from a stale poll.
 */
export function scheduleTourWhenReady(options: {
  areTargetsReady: () => boolean;
  onReady: () => void;
  maxPollCount?: number;
  pollMs?: number;
}): () => void {
  let cancelled = false;
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  let pollCount = 0;
  const maxPollCount = options.maxPollCount ?? 40;
  const pollMs = options.pollMs ?? 250;

  function tryStart() {
    if (cancelled) return;
    if (!options.areTargetsReady()) {
      pollCount += 1;
      if (pollCount < maxPollCount) {
        timeoutId = setTimeout(tryStart, pollMs);
      }
      return;
    }
    if (cancelled) return;
    options.onReady();
  }

  tryStart();

  return () => {
    cancelled = true;
    if (timeoutId != null) clearTimeout(timeoutId);
  };
}
