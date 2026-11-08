import { listHabitChoices } from '@/features/habits/application/list-habit-choices';
import { habit, repositoryStub } from './helpers/habit-fixtures';

it('includes habits from later pages for selection and search', async () => {
  const repository = repositoryStub();
  const second = {
    ...habit,
    id: '11111111-1111-4111-8111-111111111112',
    name: 'Later-page habit',
  };
  repository.list
    .mockResolvedValueOnce({ habits: [habit], hasMore: true })
    .mockResolvedValueOnce({ habits: [second], hasMore: false });
  expect(await listHabitChoices(repository)).toEqual([habit, second]);
  expect(repository.list.mock.calls.map(([offset]) => offset)).toEqual([0, 30]);
});
it('reports a failed later page rather than presenting a partial catalog', async () => {
  const repository = repositoryStub();
  repository.list
    .mockResolvedValueOnce({ habits: [habit], hasMore: true })
    .mockRejectedValueOnce(new Error('unavailable'));
  await expect(listHabitChoices(repository)).rejects.toThrow('unavailable');
});
it('stops on inconsistent pagination rather than looping forever', async () => {
  const repository = repositoryStub();
  repository.list.mockResolvedValue({ habits: [habit], hasMore: true });
  await expect(listHabitChoices(repository)).rejects.toMatchObject({
    code: 'service',
  });
  expect(repository.list).toHaveBeenCalledTimes(2);
});
