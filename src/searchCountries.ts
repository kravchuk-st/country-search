import { HttpError } from './httpError';
import type { ApiCountry } from './types';

const BASE_URL = 'https://countries.dev';

export const DEFAULT_TIMEOUT_MS = 8000;

export async function searchCountries(
  query: string,
  signal: AbortSignal,
  timeoutMs: number = DEFAULT_TIMEOUT_MS,
): Promise<ApiCountry[]> {
  const combinedSignal = AbortSignal.any([signal, AbortSignal.timeout(timeoutMs)]);
  const response = await fetch(`${BASE_URL}/name/${encodeURIComponent(query)}`, { signal: combinedSignal });

  if (response.status === 404) {
    return [];
  }

  if (!response.ok) {
    throw new HttpError(response.status);
  }

  return (await response.json()) as ApiCountry[];
}
