import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { spainResponse } from './fixtures/spain.js';
import { searchCountries } from './searchCountries.js';

const abortAwareFetch: typeof fetch = (_input, init) =>
  new Promise((_resolve, reject) => {
    const signal = init?.signal;
    if (signal?.aborted) {
      reject(signal.reason);
      return;
    }
    signal?.addEventListener('abort', () => reject(signal.reason), { once: true });
  });

describe('searchCountries timeout', () => {
  const fetchMock = vi.fn<typeof fetch>();
  let controller: AbortController;

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
    controller = new AbortController();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('rejects with a TimeoutError when the server does not answer in time', async () => {
    fetchMock.mockImplementation(abortAwareFetch);

    await expect(searchCountries('spain', controller.signal, 20)).rejects.toMatchObject({ name: 'TimeoutError' });
  });

  it('still rejects with an AbortError (not TimeoutError) when the caller aborts first', async () => {
    fetchMock.mockImplementation(abortAwareFetch);

    const pending = searchCountries('spain', controller.signal, 10_000);
    controller.abort();

    await expect(pending).rejects.toMatchObject({ name: 'AbortError' });
  });

  it('does not time out when the response arrives in time', async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify(spainResponse), { status: 200 }));

    await expect(searchCountries('spain', controller.signal, 10_000)).resolves.toEqual(spainResponse);
  });

  it('aborts the signal passed to fetch when the timeout fires', async () => {
    fetchMock.mockImplementation(abortAwareFetch);

    await searchCountries('spain', controller.signal, 20).catch(() => undefined);

    expect(fetchMock.mock.calls[0]?.[1]?.signal?.aborted).toBe(true);
  });
});
