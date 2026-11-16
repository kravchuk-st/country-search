export class HttpError extends Error {
  readonly status: number;

  constructor(status: number) {
    super(`Request failed with HTTP status ${status}`);
    this.name = 'HttpError';
    this.status = status;
  }
}
