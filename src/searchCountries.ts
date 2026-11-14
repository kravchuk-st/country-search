import { HttpError } from './httpError';
import type { ApiCountry } from './types';

const BASE_URL = 'https://countries.dev';

export async function searchCountries(query: string, signal: AbortSignal): Promise<ApiCountry[]> {
  const response = await fetch(`${BASE_URL}/name/${encodeURIComponent(query)}`, { signal });

  if (response.status === 404) {
    return [];
  }

  if (!response.ok) {
    throw new HttpError(response.status);
  }

  return (await response.json()) as ApiCountry[];
}
