import {
  OperationError,
  type OperationErrorCode,
} from '@/shared/domain/operation-error';

const codes: Record<string, OperationErrorCode> = {
  HT001: 'unauthorized',
  HT002: 'calendarRequired',
  HT003: 'invalidInput',
  HT004: 'notFound',
  HT005: 'operationReused',
  HT006: 'outsideWindow',
  HT007: 'ineligibleDate',
  HT008: 'conflict',
  HT009: 'calendarLocked',
  HT010: 'amountLimit',
  RT001: 'unauthorized',
  RT002: 'calendarRequired',
  RT003: 'invalidInput',
  RT004: 'notFound',
  RT005: 'operationReused',
  RT006: 'outsideWindow',
  RT007: 'ineligibleDate',
  RT008: 'conflict',
  RT009: 'archived',
  RT011: 'flexibleOptional',
  RT012: 'noRequiredOverlap',
  '42501': 'unauthorized',
};

export function mapOperationError(error: { code?: string }): OperationError {
  return new OperationError(
    error.code === '' ? 'network' : (codes[error.code ?? ''] ?? 'service'),
  );
}
