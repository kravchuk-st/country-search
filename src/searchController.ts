import { classifyError, type SearchFailure } from './classifyError.js';
import { debounce } from './debounce.js';
import { searchCountries } from './searchCountries.js';
import type { ApiCountry } from './types.js';

export type SearchState =
  | { status: 'idle' }
  | { status: 'loading'; query: string }
  | { status: 'results'; query: string; countries: ApiCountry[] }
  | { status: 'empty'; query: string }
  | { status: 'error'; query: string; failure: Exclude<SearchFailure, 'cancelled'> };

export interface SearchController {
  input(text: string): void;
  retry(): void;
  getState(): SearchState;
  subscribe(listener: (state: SearchState) => void): () => void;
}

export interface SearchControllerOptions {
  debounceMs?: number;
  timeoutMs?: number;
}

export const DEFAULT_DEBOUNCE_MS = 300;

export function createSearchController({
  debounceMs = DEFAULT_DEBOUNCE_MS,
  timeoutMs,
}: SearchControllerOptions = {}): SearchController {
  let state: SearchState = { status: 'idle' };
  let latestQuery = '';
  let activeRequest: AbortController | null = null;
  const listeners = new Set<(state: SearchState) => void>();

  const setState = (next: SearchState): void => {
    state = next;
    listeners.forEach((listener) => listener(state));
  };

  const showLoading = (query: string): void => {
    if (state.status === 'loading' && state.query === query) {
      return;
    }
    setState({ status: 'loading', query });
  };

  const cancelActiveRequest = (): void => {
    activeRequest?.abort();
    activeRequest = null;
  };

  async function runSearch(query: string): Promise<void> {
    cancelActiveRequest();
    const request = new AbortController();
    activeRequest = request;
    showLoading(query);

    try {
      const countries = await searchCountries(query, request.signal, timeoutMs);
      if (request.signal.aborted) {
        return;
      }
      setState(countries.length > 0 ? { status: 'results', query, countries } : { status: 'empty', query });
    } catch (error) {
      const failure = classifyError(error);
      if (failure === 'cancelled' || request.signal.aborted) {
        return;
      }
      setState({ status: 'error', query, failure });
    }
  }

  const scheduleSearch = debounce((query: string): void => {
    if (query === latestQuery) {
      void runSearch(query);
    }
  }, debounceMs);

  return {
    input(text) {
      cancelActiveRequest();
      const query = text.trim();
      latestQuery = query;

      if (query === '') {
        setState({ status: 'idle' });
        return;
      }
      showLoading(query);
      scheduleSearch(query);
    },

    retry() {
      if (latestQuery === '') {
        return;
      }
      void runSearch(latestQuery);
    },

    getState: () => state,

    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}
