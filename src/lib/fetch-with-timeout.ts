async function timedFetch<T>(input: RequestInfo | URL, init: RequestInit, timeoutMs: number, consume: (response: Response) => Promise<T>) {
  const controller = new AbortController();
  const cancel = () => controller.abort();
  if (init.signal?.aborted) controller.abort();
  else init.signal?.addEventListener("abort", cancel, { once: true });
  const timeout = setTimeout(cancel, timeoutMs);
  try { return await consume(await fetch(input, { ...init, signal: controller.signal })); }
  finally { clearTimeout(timeout); init.signal?.removeEventListener("abort", cancel); }
}

export function fetchWithTimeout(input: RequestInfo | URL, init: RequestInit = {}, timeoutMs = 10000) {
  return timedFetch(input, init, timeoutMs, async (response) => {
    await response.arrayBuffer();
    return { ok: response.ok, status: response.status };
  });
}

export function fetchJsonWithTimeout(input: RequestInfo | URL, init: RequestInit = {}, timeoutMs = 10000) {
  return timedFetch(input, init, timeoutMs, async (response) => {
    if (!response.ok) {
      await response.body?.cancel();
      return { ok: false, status: response.status, data: null };
    }
    return { ok: true, status: response.status, data: await response.json() };
  });
}
