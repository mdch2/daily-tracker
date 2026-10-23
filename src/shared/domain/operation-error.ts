export type OperationErrorCode =
  | 'unauthorized'
  | 'calendarRequired'
  | 'invalidInput'
  | 'notFound'
  | 'operationReused'
  | 'outsideWindow'
  | 'ineligibleDate'
  | 'conflict'
  | 'calendarLocked'
  | 'amountLimit'
  | 'network'
  | 'service';

export class OperationError extends Error {
  constructor(public readonly code: OperationErrorCode) {
    super(code);
    this.name = 'OperationError';
  }
}

export function operationErrorCode(error: unknown): OperationErrorCode {
  return error instanceof OperationError ? error.code : 'service';
}
