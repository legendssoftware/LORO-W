/**
 * Run async work over items with a fixed concurrency limit.
 * Results preserve input order. Rejects fail the whole batch unless
 * `onItemError` swallows and returns a fallback.
 */
export async function runWithConcurrency<T, R>(
  items: readonly T[],
  concurrency: number,
  worker: (item: T, index: number) => Promise<R>,
  options?: {
    signal?: AbortSignal;
    onItemSettled?: (result: R, item: T, index: number) => void;
  }
): Promise<R[]> {
  const limit = Math.max(1, Math.floor(concurrency));
  const results: R[] = new Array(items.length);
  let nextIndex = 0;

  async function runOne(): Promise<void> {
    while (nextIndex < items.length) {
      if (options?.signal?.aborted) return;
      const index = nextIndex;
      nextIndex += 1;
      const item = items[index] as T;
      const result = await worker(item, index);
      results[index] = result;
      options?.onItemSettled?.(result, item, index);
    }
  }

  const workers = Array.from({ length: Math.min(limit, items.length) }, () =>
    runOne()
  );
  await Promise.all(workers);
  return results;
}
