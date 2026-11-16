export interface PendingRequest {
  url: string;
  signal: AbortSignal;
  respondWith(response: Response): void;
  rejectWith(error: unknown): void;
}

export const jsonResponse = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

export const textResponse = (body: string, status: number): Response =>
  new Response(body, { status, headers: { 'Content-Type': 'text/plain' } });

export function createPendingFetch() {
  const requests: PendingRequest[] = [];

  const pendingFetch: typeof fetch = (input, init) =>
    new Promise<Response>((resolve, reject) => {
      const signal = init?.signal;
      if (!signal) {
        reject(new Error('pendingFetch needs an AbortSignal'));
        return;
      }
      if (signal.aborted) {
        reject(signal.reason);
        return;
      }
      signal.addEventListener('abort', () => reject(signal.reason), { once: true });
      requests.push({ url: String(input), signal, respondWith: resolve, rejectWith: reject });
    });

  const get = (index: number): PendingRequest => {
    const request = requests[index];
    if (!request) {
      throw new Error(`No request #${index}, only ${requests.length} were made`);
    }
    return request;
  };

  return { fetch: pendingFetch, requests, get };
}
