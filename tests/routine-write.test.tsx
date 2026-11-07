import { act, renderHook } from '@testing-library/react-native';
import { useRoutineWrite } from '@/features/routines/presentation/use-routine-write';
import { OperationError } from '@/shared/domain/operation-error';

describe('routine write recovery', () => {
  it('serializes two clicks before React has rendered the pending state', async () => {
    let finish: (value: string) => void = () => undefined;
    const write = jest.fn(
      () =>
        new Promise<string>((resolve) => {
          finish = resolve;
        }),
    );
    const view = await renderHook(() =>
      useRoutineWrite(write, async () => undefined),
    );
    let first: Promise<string | undefined> | undefined;
    await act(async () => {
      first = view.result.current.run({ id: 'first' });
      await view.result.current.run({ id: 'second' });
    });
    expect(write).toHaveBeenCalledTimes(1);
    await act(async () => {
      finish('saved');
      await first;
    });
    expect(view.result.current.notice).toBe('saved');
  });
  it('retries the identical pending request and prevents simultaneous saves', async () => {
    const request = {
      operationId: 'stable',
      date: '2026-10-21',
      completed: true,
    };
    const write = jest.fn(async (input: typeof request) => input.operationId);
    write.mockRejectedValueOnce(new OperationError('network'));
    const refresh = jest.fn(async () => undefined);
    const view = await renderHook(() => useRoutineWrite(write, refresh));
    await act(async () => {
      await view.result.current.run(request);
    });
    expect(view.result.current.pending).toEqual(request);
    expect(view.result.current.locked).toBe(true);
    await act(async () => {
      await view.result.current.run({ ...request, date: '2026-10-22' });
    });
    expect(write.mock.calls[1]?.[0]).toEqual(request);
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(view.result.current.pending).toBeNull();
  });
  it('keeps a confirmed save distinct from a failed refresh and does not send it again', async () => {
    const write = jest.fn(
      async (input: { operationId: string }) => input.operationId,
    );
    const refresh = jest
      .fn(async () => undefined)
      .mockRejectedValueOnce(new OperationError('network'));
    const view = await renderHook(() => useRoutineWrite(write, refresh));
    await act(async () => {
      await view.result.current.run({ operationId: 'first' });
    });
    expect(view.result.current).toMatchObject({
      pending: null,
      notice: 'savedRefreshFailed',
      review: true,
      blocked: true,
    });
    await act(async () => {
      await view.result.current.run({ operationId: 'second' });
    });
    expect(write).toHaveBeenCalledTimes(1);
    await act(async () => {
      await view.result.current.reload();
    });
    expect(view.result.current).toMatchObject({
      review: false,
      notice: 'saved',
    });
    expect(write).toHaveBeenCalledTimes(1);
  });
  it('requires a fresh review after conflict, preserving the caller draft', async () => {
    const write = jest
      .fn(async () => true)
      .mockRejectedValueOnce(new OperationError('conflict'));
    const refresh = jest.fn(async () => undefined);
    const view = await renderHook(() => useRoutineWrite(write, refresh));
    await act(async () => {
      await view.result.current.run({ name: 'Preserved draft' });
    });
    expect(view.result.current).toMatchObject({
      pending: null,
      review: true,
      error: 'conflict',
    });
    await act(async () => {
      await view.result.current.reload();
    });
    expect(view.result.current.review).toBe(false);
    expect(write).toHaveBeenCalledTimes(1);
  });
});
