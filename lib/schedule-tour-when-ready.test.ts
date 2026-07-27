import { afterEach, describe, expect, it, vi } from 'vitest';
import { scheduleTourWhenReady } from '@/lib/schedule-tour-when-ready';

describe('scheduleTourWhenReady', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('starts immediately when targets are ready', () => {
    const onReady = vi.fn();
    const cancel = scheduleTourWhenReady({
      areTargetsReady: () => true,
      onReady,
    });
    expect(onReady).toHaveBeenCalledTimes(1);
    cancel();
  });

  it('does not start after cancel during poll', () => {
    vi.useFakeTimers();
    let ready = false;
    const onReady = vi.fn();
    const cancel = scheduleTourWhenReady({
      areTargetsReady: () => ready,
      onReady,
      pollMs: 250,
      maxPollCount: 40,
    });
    expect(onReady).not.toHaveBeenCalled();
    cancel();
    ready = true;
    vi.advanceTimersByTime(1000);
    expect(onReady).not.toHaveBeenCalled();
  });

  it('starts on a later poll once targets become ready', () => {
    vi.useFakeTimers();
    let ready = false;
    const onReady = vi.fn();
    const cancel = scheduleTourWhenReady({
      areTargetsReady: () => ready,
      onReady,
      pollMs: 250,
      maxPollCount: 40,
    });
    vi.advanceTimersByTime(250);
    expect(onReady).not.toHaveBeenCalled();
    ready = true;
    vi.advanceTimersByTime(250);
    expect(onReady).toHaveBeenCalledTimes(1);
    cancel();
  });
});
