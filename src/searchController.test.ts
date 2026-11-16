import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { spainResponse } from './fixtures/spain.js';
import { createSearchController, type SearchController, type SearchState } from './searchController.js';
import { createPendingFetch, jsonResponse, textResponse } from './testing/pendingFetch.js';

const DEBOUNCE_MS = 5;
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe('searchController', () => {
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

  it('starts idle', () => {
    expect(controller.getState()).toEqual({ status: 'idle' });
  });

  it('shows loading for the trimmed query right away, before the debounce delay passes', () => {
    controller.input('  spain ');

    expect(controller.getState()).toEqual({ status: 'loading', query: 'spain' });
    expect(pending.requests).toHaveLength(0);
  });

  it('sends a single request, for the last text, after a burst of input', async () => {
    controller.input('s');
    controller.input('sp');
    controller.input('spa');

    await waitForRequests(1);
    await sleep(DEBOUNCE_MS * 6);

    expect(pending.requests).toHaveLength(1);
    expect(pending.get(0).url).toBe('https://countries.dev/name/spa');
  });

  it('shows the countries when the server answers', async () => {
    controller.input('spain');
    await waitForRequests(1);

    pending.get(0).respondWith(jsonResponse(spainResponse));

    await waitForState({ status: 'results', query: 'spain', countries: spainResponse });
  });

  it('shows "empty" when nothing matches (404)', async () => {
    controller.input('zzzzzz');
    await waitForRequests(1);

    pending.get(0).respondWith(textResponse('Country not found', 404));

    await waitForState({ status: 'empty', query: 'zzzzzz' });
  });

  it('shows an http error when the server fails', async () => {
    controller.input('spain');
    await waitForRequests(1);

    pending.get(0).respondWith(textResponse('oops', 500));

    await waitForState({ status: 'error', query: 'spain', failure: 'http' });
  });

  it('shows a network error when fetch fails', async () => {
    controller.input('spain');
    await waitForRequests(1);

    pending.get(0).rejectWith(new TypeError('Failed to fetch'));

    await waitForState({ status: 'error', query: 'spain', failure: 'network' });
  });

  it('shows a timeout error when the server is too slow', async () => {
    const slowController = createSearchController({ debounceMs: DEBOUNCE_MS, timeoutMs: 20 });

    slowController.input('spain');

    await vi.waitFor(() =>
      expect(slowController.getState()).toEqual({ status: 'error', query: 'spain', failure: 'timeout' }),
    );
  });

  it('goes back to idle and sends nothing when the input is cleared before the debounce fires', async () => {
    controller.input('spain');
    controller.input('   ');

    expect(controller.getState()).toEqual({ status: 'idle' });

    await sleep(DEBOUNCE_MS * 6);

    expect(pending.requests).toHaveLength(0);
  });

  it('aborts the request in flight and ignores its response when the input is cleared', async () => {
    controller.input('spain');
    await waitForRequests(1);

    controller.input('');

    expect(pending.get(0).signal.aborted).toBe(true);

    pending.get(0).respondWith(jsonResponse(spainResponse));
    await sleep(20);

    expect(controller.getState()).toEqual({ status: 'idle' });
  });

  it('retry repeats the last query immediately after an error', async () => {
    controller.input('spain');
    await waitForRequests(1);
    pending.get(0).respondWith(textResponse('oops', 500));
    await waitForState({ status: 'error', query: 'spain', failure: 'http' });

    controller.retry();

    expect(pending.requests).toHaveLength(2);
    expect(pending.get(1).url).toBe('https://countries.dev/name/spain');
    expect(controller.getState()).toEqual({ status: 'loading', query: 'spain' });

    pending.get(1).respondWith(jsonResponse(spainResponse));

    await waitForState({ status: 'results', query: 'spain', countries: spainResponse });
  });

  it('retry does nothing when nothing has been searched yet', () => {
    controller.retry();

    expect(pending.requests).toHaveLength(0);
    expect(controller.getState()).toEqual({ status: 'idle' });
  });

  it('notifies subscribers about state changes in order', async () => {
    controller.input('spain');
    await waitForRequests(1);
    pending.get(0).respondWith(jsonResponse(spainResponse));
    await waitForState({ status: 'results', query: 'spain', countries: spainResponse });

    expect(states.map((state) => state.status)).toEqual(['loading', 'results']);
  });

  it('stops notifying a subscriber after it unsubscribes', () => {
    const listener = vi.fn();
    const unsubscribe = controller.subscribe(listener);

    unsubscribe();
    controller.input('spain');

    expect(listener).not.toHaveBeenCalled();
  });
});
