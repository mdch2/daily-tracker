import { useEffect, useRef, useState } from 'react';
import {
  operationErrorCode,
  type OperationErrorCode,
} from '@/shared/domain/operation-error';

// Preserve the exact request after uncertain delivery. A receipt is not a current projection.
export function useRoutineWrite<T, R>(
  write: (input: T) => Promise<R>,
  refresh: () => Promise<void>,
) {
  const [pending, setPending] = useState<T | null>(null);
  const [busy, setBusy] = useState(false);
  const [review, setReview] = useState(false);
  const [confirmed, setConfirmed] = useState<{ result: R } | null>(null);
  const [error, setError] = useState<OperationErrorCode | null>(null);
  const [notice, setNotice] = useState<
    'saved' | 'savedRefreshFailed' | 'reviewed' | null
  >(null);
  const mutex = useRef(false);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  async function reload(): Promise<R | undefined> {
    if (mutex.current || pending) return;
    mutex.current = true;
    setBusy(true);
    try {
      await refresh();
      if (mounted.current) {
        setReview(false);
        setError(null);
        setNotice(confirmed ? 'saved' : 'reviewed');
        return confirmed?.result;
      }
    } catch (failure) {
      if (mounted.current) setError(operationErrorCode(failure));
    } finally {
      mutex.current = false;
      if (mounted.current) setBusy(false);
    }
  }
  async function run(input: T): Promise<R | undefined> {
    if (mutex.current || (review && !pending)) return;
    mutex.current = true;
    setBusy(true);
    setError(null);
    setNotice(null);
    setConfirmed(null);
    const request = pending ?? input;
    setPending(request);
    try {
      let result: R;
      try {
        result = await write(request);
      } catch (failure) {
        if (mounted.current) {
          const code = operationErrorCode(failure);
          setError(code);
          if (code !== 'service' && code !== 'network') setPending(null);
          if (code === 'conflict' || code === 'operationReused')
            setReview(true);
        }
        return;
      }
      if (!mounted.current) return undefined;
      setPending(null);
      setConfirmed({ result });
      setNotice('saved');
      try {
        await refresh();
      } catch {
        if (mounted.current) {
          setNotice('savedRefreshFailed');
          setReview(true);
        }
        return undefined;
      }
      return result;
    } finally {
      mutex.current = false;
      if (mounted.current) setBusy(false);
    }
  }
  return {
    run,
    reload,
    pending,
    busy,
    review,
    error,
    notice,
    locked: busy || pending !== null,
    blocked: busy || pending !== null || review,
  };
}
