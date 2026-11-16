import { describe, expect, it } from 'vitest';
import { classifyError } from './classifyError.js';
import { HttpError } from './httpError.js';

describe('classifyError', () => {
  it('treats an AbortError as our own cancellation', () => {
    expect(classifyError(new DOMException('aborted', 'AbortError'))).toBe('cancelled');
  });

  it('recognizes an AbortError that is a plain Error with the right name', () => {
    const error = Object.assign(new Error('aborted'), { name: 'AbortError' });

    expect(classifyError(error)).toBe('cancelled');
  });

  it('treats a TimeoutError as a timeout', () => {
    expect(classifyError(new DOMException('timed out', 'TimeoutError'))).toBe('timeout');
  });

  it('treats an HttpError as an http failure', () => {
    expect(classifyError(new HttpError(500))).toBe('http');
  });

  it('treats a failed fetch (TypeError) as a network failure', () => {
    expect(classifyError(new TypeError('Failed to fetch'))).toBe('network');
  });

  it.each([
    ['a string', 'boom'],
    ['null', null],
    ['undefined', undefined],
    ['a plain object', {}],
  ])('treats %s as a network failure', (_case, value) => {
    expect(classifyError(value)).toBe('network');
  });

  it('keeps AbortError and TimeoutError apart', () => {
    const aborted = classifyError(new DOMException('x', 'AbortError'));
    const timedOut = classifyError(new DOMException('x', 'TimeoutError'));

    expect(aborted).not.toBe(timedOut);
  });

  it('classifies the real reason of a manually aborted signal as cancelled', () => {
    const controller = new AbortController();
    controller.abort();

    expect(classifyError(controller.signal.reason)).toBe('cancelled');
  });

  it('classifies the real reason of a timed out signal as timeout', async () => {
    const signal = AbortSignal.timeout(5);
    await new Promise((resolve) => setTimeout(resolve, 30));

    expect(classifyError(signal.reason)).toBe('timeout');
  });
});
