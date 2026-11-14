import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { spainResponse } from './fixtures/spain';
import { HttpError } from './httpError';
import { searchCountries } from './searchCountries';

const jsonResponse = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

const textResponse = (body: string, status: number): Response =>
  new Response(body, { status, headers: { 'Content-Type': 'text/plain' } });

// Behaves like the real fetch: never resolves on its own, rejects with signal.reason on abort.
const abortAwareFetch: typeof fetch = (_input, init) =>
  new Promise((_resolve, reject) => {
    const signal = init?.signal;
    if (signal?.aborted) {
      reject(signal.reason);
      return;
    }
    signal?.addEventListener('abort', () => reject(signal.reason), { once: true });
  });

describe('searchCountries', () => {
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

  it('returns the parsed list of countries on 200', async () => {
    fetchMock.mockResolvedValue(jsonResponse(spainResponse));

    const result = await searchCountries('spain', controller.signal);

    expect(result).toEqual(spainResponse);
  });

  it.each([
    ['spain', 'spain'],
    ['new zealand', 'new%20zealand'],
    ['a/b?c', 'a%2Fb%3Fc'],
  ])('requests /name/ with the encoded query: %s', async (query, encoded) => {
    fetchMock.mockResolvedValue(jsonResponse([]));

    await searchCountries(query, controller.signal);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]?.[0]).toBe(`https://countries.dev/name/${encoded}`);
  });

  it('returns an empty array on 404 without reading the body as JSON', async () => {
    const response = textResponse('Country not found', 404);
    const jsonSpy = vi.spyOn(response, 'json');
    fetchMock.mockResolvedValue(response);

    await expect(searchCountries('zzzzzz', controller.signal)).resolves.toEqual([]);
    expect(jsonSpy).not.toHaveBeenCalled();
  });

  it.each([400, 429, 500, 503])('throws HttpError with status %i on other unsuccessful responses', async (status) => {
    fetchMock.mockResolvedValue(textResponse('error', status));

    const error = await searchCountries('spain', controller.signal).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(HttpError);
    expect(error).toMatchObject({ status });
  });

  it('lets network failures through as they are (not as HttpError)', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));

    const error = await searchCountries('spain', controller.signal).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(TypeError);
    expect(error).not.toBeInstanceOf(HttpError);
  });

  it('passes an AbortSignal to fetch that follows the caller signal', async () => {
    fetchMock.mockImplementation(abortAwareFetch);

    const pending = searchCountries('sp', controller.signal).catch(() => undefined);
    const passedSignal = fetchMock.mock.calls[0]?.[1]?.signal;

    expect(passedSignal).toBeInstanceOf(AbortSignal);
    expect(passedSignal?.aborted).toBe(false);

    controller.abort();

    expect(passedSignal?.aborted).toBe(true);
    await pending;
  });

  it('rejects with an AbortError when the caller aborts the request', async () => {
    fetchMock.mockImplementation(abortAwareFetch);

    const pending = searchCountries('sp', controller.signal);
    controller.abort();

    await expect(pending).rejects.toMatchObject({ name: 'AbortError' });
  });

  it('rejects with an AbortError when the signal is already aborted', async () => {
    fetchMock.mockImplementation(abortAwareFetch);
    controller.abort();

    await expect(searchCountries('sp', controller.signal)).rejects.toMatchObject({ name: 'AbortError' });
  });
});
