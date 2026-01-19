export type PfidErrorCode = 'invalid_binary' | 'invalid_pfid' | 'invalid_partition';

export class PfidError extends Error {
  public readonly code: PfidErrorCode;

  constructor(code: PfidErrorCode, message: string) {
    super(message);
    this.name = 'PfidError';
    this.code = code;
    Object.setPrototypeOf(this, PfidError.prototype);
  }

  static make(code: PfidErrorCode, problem: unknown): PfidError {
    const message = (() => {
      switch (code) {
        case 'invalid_binary':
          return `invalid binary PFID: ${JSON.stringify(problem)}`;
        case 'invalid_pfid':
          return `invalid PFID: ${JSON.stringify(problem)}`;
        case 'invalid_partition':
          return `invalid partition: ${JSON.stringify(problem)}`;
      }
    })();
    return new PfidError(code, message);
  }
}
