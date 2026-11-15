import { HttpError } from './httpError';

export type SearchFailure = 'cancelled' | 'timeout' | 'http' | 'network';

export function classifyError(error: unknown): SearchFailure {
  if (error instanceof HttpError) {
    return 'http';
  }
  if (error instanceof Error) {
    if (error.name === 'AbortError') {
      return 'cancelled';
    }
    if (error.name === 'TimeoutError') {
      return 'timeout';
    }
  }
  return 'network';
}
