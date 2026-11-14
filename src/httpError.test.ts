import { describe, expect, it } from 'vitest';
import { HttpError } from './httpError';

describe('HttpError', () => {
  it('is an Error and an HttpError', () => {
    const error = new HttpError(500);

    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(HttpError);
  });

  it('exposes the response status', () => {
    expect(new HttpError(503).status).toBe(503);
  });

  it('has the name "HttpError"', () => {
    expect(new HttpError(500).name).toBe('HttpError');
  });

  it('mentions the status in the message', () => {
    expect(new HttpError(429).message).toContain('429');
  });
});
