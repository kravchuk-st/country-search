import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { spainResponse } from './fixtures/spain.js';
import { createSearchController, type SearchController, type SearchState } from './searchController.js';
import { createPendingFetch, jsonResponse } from './testing/pendingFetch.js';

const DEBOUNCE_MS = 5;
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const staleResponse = [{ name: 'Stale country for "sp"' }];

describe('searchController: stale responses (request race)', () => {
  let pending: ReturnType<typeof createPendingFetch>;
  let controller: SearchController;
  let states: SearchState[];

  const waitForRequests = (count: number) => vi.waitFor(() => expect(pending.requests).toHaveLength(count));
  const waitForState = (expected: SearchState) => vi.waitFor(() => expect(controller.getState()).toEqual(expected));

  beforeEach(() => {
    pending = createPendingFetch();
    vi.stubGlobal('fetch', pending.fetch);
    controller = createSearchController({ debounceMs: DEBOUNCE_MS, timeoutMs: 1000 });
    const received: SearchState[] = [];
    states = received;
    controller.subscribe((state) => received.push(state));
  });

  afterEach(async () => {
    await sleep(DEBOUNCE_MS * 3);
    vi.unstubAllGlobals();
  });

  it('shows only the result of the latest query when the earlier response is the slower one', async () => {
    controller.input('sp');
    await waitForRequests(1);
    controller.input('spain');
    await waitForRequests(2);
    const slow = pending.get(0);
    const fast = pending.get(1);

    expect(slow.url).toBe('https://countries.dev/name/sp');
    expect(fast.url).toBe('https://countries.dev/name/spain');
    expect(slow.signal.aborted).toBe(true);
    expect(fast.signal.aborted).toBe(false);

    fast.respondWith(jsonResponse(spainResponse));
    await waitForState({ status: 'results', query: 'spain', countries: spainResponse });
    slow.respondWith(jsonResponse(staleResponse));
    await sleep(30);

    expect(controller.getState()).toEqual({ status: 'results', query: 'spain', countries: spainResponse });
  });

  it('cancels the previous request on every input, even before the debounce delay has passed', async () => {
    controller.input('sp');
    await waitForRequests(1);

    controller.input('spa');

    expect(pending.get(0).signal.aborted).toBe(true);
    expect(pending.requests).toHaveLength(1);

    await waitForRequests(2);
    expect(pending.get(1).url).toBe('https://countries.dev/name/spa');
  });

  it('does not show our own cancellation as an error', async () => {
    controller.input('sp');
    await waitForRequests(1);
    controller.input('spain');
    await waitForRequests(2);

    pending.get(1).respondWith(jsonResponse(spainResponse));
    await waitForState({ status: 'results', query: 'spain', countries: spainResponse });

    expect(states.some((state) => state.status === 'error')).toBe(false);
  });

  it('ignores a stale response even when the transport does not honor abort (safety net)', async () => {
    const answers: Array<(response: Response) => void> = [];
    vi.stubGlobal(
      'fetch',
      vi.fn(() => new Promise<Response>((resolve) => answers.push(resolve))),
    );

    controller.input('sp');
    await vi.waitFor(() => expect(answers).toHaveLength(1));
    controller.input('spain');
    await vi.waitFor(() => expect(answers).toHaveLength(2));

    answers[1]?.(jsonResponse(spainResponse));
    await waitForState({ status: 'results', query: 'spain', countries: spainResponse });
    answers[0]?.(jsonResponse(staleResponse));
    await sleep(30);

    expect(controller.getState()).toEqual({ status: 'results', query: 'spain', countries: spainResponse });
  });
});
