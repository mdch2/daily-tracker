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
  '42501': 'unauthorized',
};

export function mapOperationError(error: { code?: string }): OperationError {
  return new OperationError(
    error.code === '' ? 'network' : (codes[error.code ?? ''] ?? 'service'),
  );
}
